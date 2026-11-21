import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin, publicUser } from '../auth.js';
import { validate, z } from '../validate.js';
import { STAGES, STAGE_REQUIRES_APPROVAL, summarise, logActivity, unapprovedForLodging, publicDoc } from './portal.js';
import { sendMail } from '../mailer.js';

const r = Router();
r.use(requireAdmin);

const newest = (a, b) => b.createdAt.localeCompare(a.createdAt);

r.get('/stats', (_req, res) => {
  const week = new Date(Date.now() - 7 * 864e5).toISOString();
  const today = new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);
  res.json({
    enquiries: { total: db.all('enquiries').length, new: db.filter('enquiries', e => e.status === 'new').length, week: db.filter('enquiries', e => e.createdAt > week).length },
    consultations: { total: db.all('consultations').length, requested: db.filter('consultations', c => c.status === 'requested').length, upcoming: db.filter('consultations', c => c.date >= today && c.status !== 'cancelled').length },
    clients: { total: db.filter('users', u => u.role === 'client').length },
    documents: { awaitingReview: db.filter('documents', d => d.status === 'uploaded' || d.status === 'not_applicable').length },
    subscribers: db.all('subscribers').length,
  });
});

r.get('/enquiries', (_req, res) => res.json([...db.all('enquiries')].sort(newest)));
r.patch('/enquiries/:id', validate(z.object({ status: z.enum(['new', 'contacted', 'closed']) })), (req, res) => {
  const row = db.update('enquiries', req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Enquiry not found.' });
  res.json(row);
});

r.get('/consultations', (_req, res) => res.json([...db.all('consultations')].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))));
r.patch('/consultations/:id', validate(z.object({ status: z.enum(['requested', 'confirmed', 'completed', 'cancelled']).optional(), paid: z.boolean().optional() })), (req, res) => {
  const row = db.update('consultations', req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Consultation not found.' });
  if (req.body.status === 'confirmed') {
    sendMail({ to: row.email, subject: `Confirmed: your consultation on ${row.date} at ${row.time}`, title: 'Your consultation is confirmed',
      rows: [['Reference', row.reference], ['When', `${row.date} at ${row.time} (South Africa time)`], ['Service', row.service]] });
  }
  res.json(row);
});

r.get('/clients', (_req, res) => {
  const clients = db.filter('users', u => u.role === 'client').sort(newest).map(u => {
    const app = db.find('applications', a => a.userId === u.id);
    return { ...publicUser(u), application: app ? summarise(app) : null };
  });
  res.json(clients);
});

r.get('/applications/:id', (req, res) => {
  const app = db.get('applications', req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found.' });
  res.json({
    application: summarise(app),
    client: publicUser(db.get('users', app.userId)),
    documents: db.filter('documents', d => d.applicationId === app.id)
      .sort((a, b) => (a.required === b.required ? (a.order ?? 999) - (b.order ?? 999) : a.required ? -1 : 1)).map(publicDoc),
    activity: db.filter('activity', a => a.applicationId === app.id).sort(newest),
  });
});

r.patch('/applications/:id', validate(z.object({
  stage: z.number().int().min(0).max(STAGES.length - 1).optional(),
  advisor: z.string().trim().max(80).optional(),
  nextStep: z.string().trim().max(300).optional(),
  note: z.string().trim().max(500).optional(),
})), (req, res) => {
  const app = db.get('applications', req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found.' });
  const { note, ...patch } = req.body;
  const prevStage = app.stage;
  if (patch.stage !== undefined && patch.stage >= STAGE_REQUIRES_APPROVAL && patch.stage > prevStage) {
    if (!app.applicantCompletedAt) return res.status(409).json({ error: 'The client has not completed their applicant details yet.', missing: ['Applicant details form'] });
    const pending = unapprovedForLodging(app.id);
    if (pending.length) {
      return res.status(409).json({
        error: `Every required document must be approved or confirmed as not required before moving to ${STAGES[patch.stage]}. ${pending.length} still pending.`,
        missing: pending.map(d => d.name),
      });
    }
  }
  db.update('applications', app.id, patch);
  if (patch.stage !== undefined && patch.stage !== prevStage) logActivity(app.id, 'Stage updated', `Your application moved to ${STAGES[patch.stage]}`, 'advisor');
  if (note) logActivity(app.id, 'Advisor update', note, 'advisor');
  res.json(summarise(db.get('applications', app.id)));
});

r.patch('/documents/:id', validate(z.object({ status: z.enum(['approved', 'rejected', 'uploaded', 'waived']), reviewNote: z.string().trim().max(300).optional() })), (req, res) => {
  const existing = db.get('documents', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Document not found.' });
  if (req.body.status === 'approved' && !existing.storedName) return res.status(422).json({ error: 'There is no file to approve. Mark it as not required instead, or wait for the client to upload it.' });
  if (req.body.status === 'rejected' && !req.body.reviewNote) return res.status(422).json({ error: 'Tell the client what needs to change.', fields: { reviewNote: 'Required.' } });
  const doc = db.update('documents', req.params.id, { ...req.body, reviewedAt: new Date().toISOString() });
  if (req.body.status === 'waived') logActivity(doc.applicationId, 'Confirmed not required', `${doc.name}${req.body.reviewNote ? `: ${req.body.reviewNote}` : ''}`, 'advisor');
  if (req.body.status === 'approved') logActivity(doc.applicationId, 'Document approved', `${doc.name} passed advisor review`, 'advisor');
  if (req.body.status === 'rejected') logActivity(doc.applicationId, 'Action needed', `${doc.name}: ${req.body.reviewNote || 'please upload a new copy'}`, 'advisor');
  const { storedName, ...rest } = doc;
  res.json(rest);
});

r.get('/subscribers', (_req, res) => res.json([...db.all('subscribers')].sort(newest)));

export default r;
