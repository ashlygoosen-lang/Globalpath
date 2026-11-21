import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db, reference } from '../db.js';
import { hashPassword, checkPassword, signToken, publicUser, requireAuth } from '../auth.js';
import { validate, z, text, email, phone } from '../validate.js';
import { visaBySlug } from '../content.js';
import { logActivity, syncChecklist } from './portal.js';
import { initialApplicant } from '../applicant.js';
import { notifyTeam } from '../mailer.js';

const r = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60e3, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in 15 minutes.' } });

const password = z.string().min(8, 'Use at least 8 characters.').max(128)
  .regex(/[A-Za-z]/, 'Include at least one letter.').regex(/\d/, 'Include at least one number.');

const registerSchema = z.object({
  name: text(2, 120, 'Full name'),
  email,
  phone,
  password,
  visa: z.string().refine(s => Boolean(visaBySlug[s]), 'Choose the visa you are applying for.'),
});

r.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  const { name, email: em, phone: ph, password: pw, visa } = req.body;
  if (db.find('users', u => u.email === em)) {
    return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.', fields: { email: 'Already registered.' } });
  }
  const user = db.insert('users', { role: 'client', name, email: em, phone: ph || '', passwordHash: await hashPassword(pw) });
  const app = db.insert('applications', {
    userId: user.id, reference: reference('A'), visa, stage: 0, status: 'active', advisor: 'Unassigned', nextStep: 'Complete your applicant details, upload every required document, then submit your application for review.',
    applicant: initialApplicant({ name, email: em, phone: ph }),
  });
  syncChecklist(app);
  logActivity(app.id, 'Application created', `${visaBySlug[visa].title} preparation started`);
  notifyTeam(`New portal client: ${name}`, [['Email', em], ['Visa', visaBySlug[visa].title], ['Reference', app.reference]]);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

r.post('/login', authLimiter, validate(z.object({ email, password: z.string().min(1, 'Enter your password.') })), async (req, res) => {
  const user = db.find('users', u => u.email === req.body.email);
  if (!user || user.disabled || !(await checkPassword(req.body.password, user.passwordHash))) {
    return res.status(401).json({ error: 'That email and password do not match an account.' });
  }
  db.update('users', user.id, { lastLoginAt: new Date().toISOString() });
  res.json({ token: signToken(user), user: publicUser(user) });
});

r.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

r.patch('/me', requireAuth, validate(z.object({ name: text(2, 120, 'Full name').optional(), phone })), (req, res) => {
  const user = db.update('users', req.user.id, req.body);
  res.json({ user: publicUser(user) });
});

r.post('/change-password', requireAuth, validate(z.object({ current: z.string().min(1), next: password })), async (req, res) => {
  if (!(await checkPassword(req.body.current, req.user.passwordHash))) {
    return res.status(422).json({ error: 'Your current password is incorrect.', fields: { current: 'Incorrect password.' } });
  }
  db.update('users', req.user.id, { passwordHash: await hashPassword(req.body.next) });
  res.json({ ok: true });
});

export default r;
