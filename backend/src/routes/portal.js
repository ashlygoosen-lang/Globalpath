import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { db, uploadsDir } from '../db.js';
import { requireAuth } from '../auth.js';
import { visaBySlug, checklistFor } from '../content.js';
import { config } from '../config.js';
import { notifyTeam } from '../mailer.js';
import { validate, z } from '../validate.js';
import { validateApplicant } from '../applicant.js';

export const STAGES = ['Assessment', 'Document collection', 'Quality review', 'Submitted to VFS', 'Awaiting outcome', 'Outcome received'];
/** Stage index from which every required document must be approved (or confirmed not required). */
export const STAGE_REQUIRES_APPROVAL = 3;

/**
 * Document statuses:
 *  outstanding     nothing uploaded yet
 *  uploaded        file received, awaiting advisor review
 *  approved        advisor approved the file
 *  rejected        advisor asked for a new copy (reviewNote says why)
 *  not_applicable  client says a "where applicable" item does not apply (naReason), awaiting advisor confirmation
 *  waived          advisor confirmed the item is not required for this client
 */
const CLIENT_COMPLETE = new Set(['uploaded', 'approved', 'waived']);
const ADVISOR_COMPLETE = new Set(['approved', 'waived']);

export function logActivity(applicationId, title, detail, actor = 'system') {
  return db.insert('activity', { applicationId, title, detail, actor });
}

/** Makes sure an application's documents match the current official checklist for its visa. */
export function syncChecklist(app) {
  const items = checklistFor(app.visa);
  const docs = db.filter('documents', d => d.applicationId === app.id);
  const byKey = new Map(docs.filter(d => d.key).map(d => [d.key, d]));
  items.forEach((item, order) => {
    const existing = byKey.get(item.key) || docs.find(d => !d.key && d.kind !== 'supporting' && d.name === item.name);
    if (existing) {
      db.update('documents', existing.id, { key: item.key, name: item.name, note: item.note, conditional: item.conditional, kind: item.kind, order, required: true });
    } else {
      db.insert('documents', { applicationId: app.id, userId: app.userId, key: item.key, name: item.name, note: item.note, conditional: item.conditional, kind: item.kind, order, required: true, status: 'outstanding' });
    }
  });
  const validKeys = new Set(items.map(i => i.key));
  for (const d of db.filter('documents', d => d.applicationId === app.id && d.kind !== 'supporting')) {
    if (d.key && validKeys.has(d.key)) continue;
    // A checklist item that no longer exists: keep any uploaded file as a supporting document.
    if (d.storedName) db.update('documents', d.id, { kind: 'supporting', required: false, key: null });
    else db.remove('documents', d.id);
  }
}

export function syncAllChecklists() {
  for (const app of db.all('applications')) syncChecklist(app);
}

export function requiredDocs(appId) {
  return db.filter('documents', d => d.applicationId === appId && d.required).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** What is still missing before the client can submit. */
export function missingForSubmission(appId) {
  return requiredDocs(appId).filter(d => {
    if (CLIENT_COMPLETE.has(d.status)) return false;
    if (d.status === 'not_applicable' && d.conditional) return false;
    return true;
  });
}

/** What is still unconfirmed before the advisor can lodge the application. */
export function unapprovedForLodging(appId) {
  return requiredDocs(appId).filter(d => !ADVISOR_COMPLETE.has(d.status));
}

/** Progress blends stage (60%) with required-document completeness (40%). */
export function summarise(app) {
  const docs = db.filter('documents', d => d.applicationId === app.id);
  const required = docs.filter(d => d.required);
  const missing = missingForSubmission(app.id);
  const complete = required.length - missing.length;
  const docPct = required.length ? complete / required.length : 0;
  const stagePct = app.stage / (STAGES.length - 1);
  const progress = app.stage === STAGES.length - 1 ? 100 : Math.round((stagePct * 0.6 + docPct * 0.4) * 100);
  const attention = docs.filter(d => d.status === 'rejected').length;
  return {
    ...app,
    visaTitle: visaBySlug[app.visa]?.title || app.visa,
    stageName: STAGES[app.stage],
    stages: STAGES,
    progress,
    applicantComplete: Boolean(app.applicantCompletedAt),
    applicantLocked: isLocked(app),
    readyToSubmit: missing.length === 0 && Boolean(app.applicantCompletedAt),
    submitted: Boolean(app.submittedAt) && attention === 0,
    needsResubmit: Boolean(app.submittedAt) && attention > 0,
    required: { total: required.length, complete, missing: missing.map(d => d.name) },
    documents: {
      total: docs.length,
      received: docs.filter(d => d.status === 'uploaded' || d.status === 'approved').length,
      approved: docs.filter(d => d.status === 'approved').length,
      awaitingReview: docs.filter(d => d.status === 'uploaded' || d.status === 'not_applicable').length,
      outstanding: missing.length,
      attention,
    },
  };
}

/** Applicant details can't change while the advisor is reviewing a submitted application. */
export function isLocked(app) {
  if (!app.submittedAt) return false;
  return !db.find('documents', d => d.applicationId === app.id && d.status === 'rejected');
}

const DETAILS_FIRST = 'Complete your applicant details before uploading documents.';

export function publicDoc(d) {
  const { storedName, ...rest } = d;
  return rest;
}

const r = Router();
r.use(requireAuth);

function myApplication(req) {
  return db.find('applications', a => a.userId === req.user.id && a.status !== 'archived');
}

r.get('/dashboard', (req, res) => {
  const app = myApplication(req);
  if (!app) return res.json({ application: null, activity: [], consultations: [] });
  const activity = db.filter('activity', a => a.applicationId === app.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);
  const consultations = db.filter('consultations', c => c.userId === req.user.id || c.email === req.user.email)
    .map(({ id, reference, service, date, time, mode, status }) => ({ id, reference, service, date, time, mode, status }));
  const visa = visaBySlug[app.visa];
  res.json({ application: summarise(app), visa: visa ? { title: visa.title, turnaround: visa.turnaround, dhaFee: visa.dhaFee, vfsFee: visa.vfsFee } : null, activity, consultations });
});

r.get('/applicant', (req, res) => {
  const app = myApplication(req);
  if (!app) return res.status(404).json({ error: 'You do not have an open application.' });
  res.json({ visa: app.visa, data: app.applicant || {}, completedAt: app.applicantCompletedAt || null, locked: isLocked(app) });
});

/** Save progress (complete=false) or confirm the finished form (complete=true). */
r.put('/applicant', validate(z.object({ data: z.record(z.any()), complete: z.boolean().optional() })), (req, res) => {
  const app = myApplication(req);
  if (!app) return res.status(404).json({ error: 'You do not have an open application.' });
  if (isLocked(app)) return res.status(409).json({ error: 'Your application is with your advisor for review. Contact them to change your details.' });
  const complete = Boolean(req.body.complete);
  const { data, errors } = validateApplicant(req.body.data, app.visa, { complete });
  if (Object.keys(errors).length) {
    db.update('applications', app.id, { applicant: data, applicantCompletedAt: null });
    return res.status(422).json({ error: `Some details need attention (${Object.keys(errors).length}).`, fields: errors });
  }
  const wasComplete = Boolean(app.applicantCompletedAt);
  const patch = { applicant: data, applicantCompletedAt: complete ? new Date().toISOString() : null, applicantUpdatedAt: new Date().toISOString() };
  if (complete && !app.submittedAt && /^Complete your applicant details/.test(app.nextStep || '')) patch.nextStep = 'Upload every required document on your checklist, then submit your application for review.';
  db.update('applications', app.id, patch);
  if (complete) logActivity(app.id, wasComplete ? 'Applicant details updated' : 'Applicant details completed', complete && !wasComplete ? 'You can now upload your documents.' : 'Your personal and passport details were updated.', 'client');
  const fresh = db.get('applications', app.id);
  res.json({ data: fresh.applicant, completedAt: fresh.applicantCompletedAt || null, locked: isLocked(fresh) });
});

r.get('/documents', (req, res) => {
  const app = myApplication(req);
  if (!app) return res.json([]);
  const docs = db.filter('documents', d => d.applicationId === app.id)
    .sort((a, b) => (a.required === b.required ? (a.order ?? 999) - (b.order ?? 999) : a.required ? -1 : 1));
  res.json(docs.map(publicDoc));
});

const ALLOWED = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED[file.mimetype] || ''}`),
  }),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => (ALLOWED[file.mimetype] ? cb(null, true) : cb(new UploadError('Upload a PDF, JPG, PNG or WebP file.'))),
});
class UploadError extends Error { constructor(m) { super(m); this.status = 422; } }

function handleUpload(req, res, next) {
  upload.single('file')(req, res, err => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE' ? `Files must be ${config.maxUploadMb} MB or smaller.` : err.message;
    res.status(422).json({ error: msg });
  });
}

/** Upload a file against an existing checklist item (documentId) or as a new supporting document. */
r.post('/documents', handleUpload, (req, res) => {
  const app = myApplication(req);
  if (!req.file) return res.status(422).json({ error: 'Choose a file to upload.' });
  if (!app) { fs.unlink(req.file.path, () => {}); return res.status(404).json({ error: 'You do not have an open application.' }); }
  if (!app.applicantCompletedAt) { fs.unlink(req.file.path, () => {}); return res.status(409).json({ error: DETAILS_FIRST, code: 'details_required' }); }

  const fileMeta = { originalName: req.file.originalname.slice(0, 200), storedName: req.file.filename, mime: req.file.mimetype, size: req.file.size, uploadedAt: new Date().toISOString() };
  let doc;
  if (req.body.documentId) {
    doc = db.get('documents', req.body.documentId);
    if (!doc || doc.applicationId !== app.id) { fs.unlink(req.file.path, () => {}); return res.status(404).json({ error: 'That checklist item was not found.' }); }
    if (doc.status === 'approved') { fs.unlink(req.file.path, () => {}); return res.status(409).json({ error: 'This document is already approved. Ask your advisor if it needs replacing.' }); }
    if (doc.storedName) fs.unlink(path.join(uploadsDir, doc.storedName), () => {});
    doc = db.update('documents', doc.id, { ...fileMeta, status: 'uploaded', reviewNote: '', naReason: '' });
  } else {
    const name = String(req.body.name || req.file.originalname).trim().slice(0, 120) || 'Supporting document';
    doc = db.insert('documents', { applicationId: app.id, userId: req.user.id, name, kind: 'supporting', required: false, ...fileMeta, status: 'uploaded' });
  }
  logActivity(app.id, 'Document received', `${doc.name} added to your file`, 'client');
  if (app.stage === 0) db.update('applications', app.id, { stage: 1 });
  res.status(201).json(publicDoc(doc));
});

/** Client marks a "where applicable" item as not applying to them. */
r.post('/documents/:id/not-applicable', validate(z.object({ reason: z.string().trim().min(5, 'Tell your advisor briefly why this does not apply.').max(300) })), (req, res) => {
  const app = myApplication(req);
  const doc = db.get('documents', req.params.id);
  if (!app || !doc || doc.applicationId !== app.id) return res.status(404).json({ error: 'Document not found.' });
  if (!app.applicantCompletedAt) return res.status(409).json({ error: DETAILS_FIRST, code: 'details_required' });
  if (!doc.conditional) return res.status(422).json({ error: 'This document is required for every applicant and must be uploaded.' });
  if (doc.status === 'approved') return res.status(409).json({ error: 'This document is already approved.' });
  if (doc.storedName) fs.unlink(path.join(uploadsDir, doc.storedName), () => {});
  const updated = db.update('documents', doc.id, { status: 'not_applicable', naReason: req.body.reason, storedName: null, originalName: null, mime: null, size: null, uploadedAt: null, reviewNote: '' });
  logActivity(app.id, 'Marked as not applicable', `${doc.name}: ${req.body.reason}`, 'client');
  res.json(publicDoc(updated));
});

/** Undo a not-applicable mark. */
r.post('/documents/:id/applicable', (req, res) => {
  const app = myApplication(req);
  const doc = db.get('documents', req.params.id);
  if (!app || !doc || doc.applicationId !== app.id) return res.status(404).json({ error: 'Document not found.' });
  if (doc.status !== 'not_applicable') return res.status(409).json({ error: 'This document is not marked as not applicable.' });
  res.json(publicDoc(db.update('documents', doc.id, { status: 'outstanding', naReason: '' })));
});

r.get('/documents/:id/file', (req, res) => {
  const doc = db.get('documents', req.params.id);
  if (!doc || !doc.storedName || (doc.userId !== req.user.id && req.user.role !== 'admin')) return res.status(404).json({ error: 'File not found.' });
  res.setHeader('Content-Type', doc.mime);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName)}"`);
  res.sendFile(path.join(uploadsDir, doc.storedName));
});

r.delete('/documents/:id', (req, res) => {
  const doc = db.get('documents', req.params.id);
  if (!doc || doc.userId !== req.user.id) return res.status(404).json({ error: 'Document not found.' });
  if (doc.status === 'approved') return res.status(409).json({ error: 'Approved documents can only be changed by your advisor.' });
  if (doc.storedName) fs.unlink(path.join(uploadsDir, doc.storedName), () => {});
  if (doc.kind === 'supporting') db.remove('documents', doc.id);
  else db.update('documents', doc.id, { status: 'outstanding', storedName: null, originalName: null, mime: null, size: null, uploadedAt: null });
  res.json({ ok: true });
});

/** Submit the application for advisor review. Only possible once every required document is in. */
r.post('/application/submit', (req, res) => {
  const app = myApplication(req);
  if (!app) return res.status(404).json({ error: 'You do not have an open application.' });
  if (!app.applicantCompletedAt) return res.status(409).json({ error: 'Complete your applicant details before submitting.', code: 'details_required' });
  const missing = missingForSubmission(app.id);
  if (missing.length) {
    return res.status(409).json({
      error: `Upload all required documents before submitting. ${missing.length} still outstanding.`,
      missing: missing.map(d => d.name),
    });
  }
  const resubmission = Boolean(app.submittedAt);
  db.update('applications', app.id, {
    submittedAt: new Date().toISOString(),
    stage: Math.max(app.stage, 2),
    nextStep: 'Your advisor is reviewing every document. We will let you know if anything needs to change.',
  });
  logActivity(app.id, resubmission ? 'Application resubmitted' : 'Application submitted', 'All required documents received. Advisor review has started.', 'client');
  notifyTeam(`${resubmission ? 'Resubmitted' : 'Submitted'} for review: ${app.reference}`, [['Client', req.user.name], ['Email', req.user.email], ['Visa', visaBySlug[app.visa]?.title || app.visa]]);
  res.json(summarise(db.get('applications', app.id)));
});

r.get('/assessments', (req, res) => {
  res.json(db.filter('assessments', a => a.userId === req.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

export default r;
