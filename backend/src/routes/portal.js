import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { db, uploadsDir } from '../db.js';
import { requireAuth } from '../auth.js';
import { visaBySlug } from '../content.js';
import { config } from '../config.js';
import { notifyTeam } from '../mailer.js';

export const STAGES = ['Assessment', 'Document collection', 'Quality review', 'Submitted to VFS', 'Awaiting outcome', 'Outcome received'];

export function logActivity(applicationId, title, detail, actor = 'system') {
  return db.insert('activity', { applicationId, title, detail, actor });
}

/** Progress blends stage (60%) with document completeness (40%). */
export function summarise(app) {
  const docs = db.filter('documents', d => d.applicationId === app.id);
  const done = docs.filter(d => d.status === 'approved' || d.status === 'uploaded').length;
  const approved = docs.filter(d => d.status === 'approved').length;
  const stagePct = app.stage / (STAGES.length - 1);
  const docPct = docs.length ? done / docs.length : 0;
  const progress = app.stage === STAGES.length - 1 ? 100 : Math.round((stagePct * 0.6 + docPct * 0.4) * 100);
  return {
    ...app,
    visaTitle: visaBySlug[app.visa]?.title || app.visa,
    stageName: STAGES[app.stage],
    stages: STAGES,
    progress,
    documents: { total: docs.length, received: done, approved, outstanding: docs.filter(d => d.status === 'outstanding').length, attention: docs.filter(d => d.status === 'rejected').length },
  };
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

r.get('/documents', (req, res) => {
  const app = myApplication(req);
  if (!app) return res.json([]);
  res.json(db.filter('documents', d => d.applicationId === app.id).map(publicDoc));
});

function publicDoc(d) {
  const { storedName, ...rest } = d;
  return rest;
}

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

/** Upload a file against an existing checklist item (id) or as a new supporting document. */
r.post('/documents', handleUpload, (req, res) => {
  const app = myApplication(req);
  if (!req.file) return res.status(422).json({ error: 'Choose a file to upload.' });
  if (!app) { fs.unlink(req.file.path, () => {}); return res.status(404).json({ error: 'You do not have an open application.' }); }

  const fileMeta = { originalName: req.file.originalname.slice(0, 200), storedName: req.file.filename, mime: req.file.mimetype, size: req.file.size, uploadedAt: new Date().toISOString() };
  let doc;
  if (req.body.documentId) {
    doc = db.get('documents', req.body.documentId);
    if (!doc || doc.applicationId !== app.id) { fs.unlink(req.file.path, () => {}); return res.status(404).json({ error: 'That checklist item was not found.' }); }
    if (doc.storedName) fs.unlink(path.join(uploadsDir, doc.storedName), () => {});
    doc = db.update('documents', doc.id, { ...fileMeta, status: 'uploaded', reviewNote: '' });
  } else {
    const name = String(req.body.name || req.file.originalname).trim().slice(0, 120) || 'Supporting document';
    doc = db.insert('documents', { applicationId: app.id, userId: req.user.id, name, kind: 'supporting', ...fileMeta, status: 'uploaded' });
  }
  logActivity(app.id, 'Document received', `${doc.name} added to your file`, 'client');
  if (app.stage === 0) db.update('applications', app.id, { stage: 1 });
  notifyTeam(`Document uploaded: ${doc.name}`, [['Client', req.user.name], ['Application', app.reference]]);
  res.status(201).json(publicDoc(doc));
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

r.get('/assessments', (req, res) => {
  res.json(db.filter('assessments', a => a.userId === req.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

export default r;
