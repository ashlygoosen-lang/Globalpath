import { Router } from 'express';
import { db, reference } from '../db.js';
import { content, serviceTitles, visaBySlug } from '../content.js';
import { config } from '../config.js';
import { validate, z, text, email, phone } from '../validate.js';
import { notifyTeam, sendMail } from '../mailer.js';
import { optionalAuth } from '../auth.js';

const r = Router();

/* ---------- Content (read-only) ---------- */
r.get('/content', (_req, res) => res.json(content));
r.get('/content/services', (_req, res) => res.json(content.services));
r.get('/content/visas', (req, res) => {
  const { purpose } = req.query;
  res.json(purpose ? content.visas.filter(v => v.purposes.includes(String(purpose))) : content.visas);
});
r.get('/content/visas/:slug', (req, res) => {
  const visa = visaBySlug[req.params.slug];
  if (!visa) return res.status(404).json({ error: 'We could not find that visa type.' });
  res.json({ ...visa, commonDocuments: content.commonDocuments });
});
r.get('/content/articles', (_req, res) => res.json(content.articles.map(({ body, ...a }) => a)));
r.get('/content/articles/:slug', (req, res) => {
  const a = content.articles.find(x => x.slug === req.params.slug);
  if (!a) return res.status(404).json({ error: 'We could not find that article.' });
  res.json(a);
});
r.get('/content/faqs', (_req, res) => res.json(content.faqs));

/* ---------- Enquiries (contact form) ---------- */
const enquirySchema = z.object({
  firstName: text(1, 60, 'First name'),
  lastName: text(1, 60, 'Last name'),
  email,
  phone,
  service: z.enum(serviceTitles, { errorMap: () => ({ message: 'Choose an area of interest.' }) }),
  message: text(10, 3000, 'Your message'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please agree to the privacy notice.' }) }),
  website: z.string().max(0).optional(), // honeypot
});

r.post('/enquiries', validate(enquirySchema), async (req, res) => {
  const { website, consent, ...data } = req.body;
  const row = db.insert('enquiries', { ...data, reference: reference('E'), status: 'new', consentAt: new Date().toISOString() });
  notifyTeam(`New enquiry ${row.reference}: ${data.service}`, [
    ['Name', `${data.firstName} ${data.lastName}`], ['Email', data.email], ['Phone', data.phone || '—'], ['Service', data.service], ['Message', data.message],
  ]);
  sendMail({
    to: data.email, subject: `We've received your enquiry (${row.reference})`, title: 'Thank you for contacting GlobalPath',
    rows: [['Reference', row.reference], ['Service', data.service]],
    footer: 'A member of our team will reply within one business day.',
  });
  res.status(201).json({ reference: row.reference });
});

/* ---------- Consultation availability & booking ---------- */
const SAST_OFFSET = '+02:00'; // South Africa does not observe daylight saving

function dayParts(dateStr) {
  const d = new Date(`${dateStr}T12:00:00${SAST_OFFSET}`);
  if (Number.isNaN(d.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  return { date: d, weekday: d.getUTCDay() };
}

function todaySAST() {
  return new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);
}

export function slotsFor(dateStr) {
  const parts = dayParts(dateStr);
  if (!parts) return { error: 'Choose a valid date.' };
  if (parts.weekday === 0 || parts.weekday === 6) return { slots: [], reason: 'We hold consultations Monday to Friday.' };
  const today = todaySAST();
  if (dateStr < today) return { slots: [], reason: 'That date has passed.' };
  const max = new Date(Date.now() + config.office.bookingWindowDays * 864e5).toISOString().slice(0, 10);
  if (dateStr > max) return { slots: [], reason: `Bookings open ${config.office.bookingWindowDays} days ahead.` };

  const taken = new Set(db.filter('consultations', c => c.date === dateStr && c.status !== 'cancelled').map(c => c.time));
  const { openHour, closeHour, slotMinutes, gapMinutes } = config.office;
  const slots = [];
  const nowMs = Date.now();
  for (let m = openHour * 60; m + slotMinutes <= closeHour * 60 + slotMinutes && m < closeHour * 60; m += slotMinutes + gapMinutes) {
    const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const startsAt = new Date(`${dateStr}T${time}:00${SAST_OFFSET}`).getTime();
    const tooSoon = startsAt - nowMs < 2 * 3600e3; // need 2h notice
    slots.push({ time, available: !taken.has(time) && !tooSoon });
  }
  return { slots };
}

r.get('/consultations/availability', (req, res) => {
  const result = slotsFor(String(req.query.date || ''));
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ date: req.query.date, timezone: config.office.timezone, durationMinutes: config.office.slotMinutes, ...result });
});

const bookingSchema = z.object({
  service: z.enum(serviceTitles, { errorMap: () => ({ message: 'Choose a service.' }) }),
  mode: z.enum(['video', 'in-person', 'phone'], { errorMap: () => ({ message: 'Choose how you would like to meet.' }) }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time.'),
  name: text(2, 120, 'Full name'),
  email,
  phone,
  country: z.string().trim().max(80).optional().or(z.literal('')),
  notes: z.string().trim().max(3000).optional().or(z.literal('')),
  website: z.string().max(0).optional(),
});

r.post('/consultations', optionalAuth, validate(bookingSchema), async (req, res) => {
  const { website, ...data } = req.body;
  const { slots, reason, error } = slotsFor(data.date);
  if (error) return res.status(422).json({ error, fields: { date: error } });
  const slot = slots.find(s => s.time === data.time);
  if (!slot) return res.status(422).json({ error: reason || 'That time is not offered.', fields: { time: reason || 'Choose another time.' } });
  if (!slot.available) return res.status(409).json({ error: 'That time was just booked. Choose another slot.', fields: { time: 'Choose another time.' } });

  const row = db.insert('consultations', { ...data, reference: reference('C'), status: 'requested', userId: req.user?.id || null });
  const when = `${data.date} at ${data.time} (South Africa time)`;
  const modeLabel = { video: 'Video call', 'in-person': 'In person, Sandton', phone: 'Phone call' }[data.mode];
  notifyTeam(`Consultation request ${row.reference}`, [
    ['Name', data.name], ['Email', data.email], ['Phone', data.phone || '—'], ['Country', data.country || '—'],
    ['Service', data.service], ['When', when], ['Format', modeLabel], ['Notes', data.notes || '—'],
  ]);
  sendMail({
    to: data.email, subject: `Consultation requested for ${when}`, title: 'Your consultation request',
    rows: [['Reference', row.reference], ['Service', data.service], ['When', when], ['Format', modeLabel]],
    footer: 'We will confirm your appointment by email within one business day.',
  });
  res.status(201).json({ reference: row.reference, date: data.date, time: data.time, mode: data.mode });
});

/* ---------- Newsletter ---------- */
r.post('/newsletter', validate(z.object({ email })), (req, res) => {
  if (!db.find('subscribers', s => s.email === req.body.email)) db.insert('subscribers', { email: req.body.email });
  res.status(201).json({ ok: true });
});

/* ---------- Indicative eligibility assessment ---------- */
const assessmentSchema = z.object({
  purpose: z.enum(content.purposes.map(p => p.id)),
  answers: z.record(z.enum(['yes', 'no'])),
});

const QUESTIONS = {
  work: [['offer', 'Do you have an offer of employment in South Africa?'], ['qualification', 'Do you hold a recognised post-secondary qualification?'], ['experience', 'Do you have at least three years of relevant work experience?']],
  business: [['funds', 'Can you show funds available for investment in South Africa?'], ['plan', 'Do you have a business plan for a South African company?'], ['jobs', 'Will the business employ South African citizens or permanent residents?']],
  study: [['acceptance', 'Have you been accepted by a registered South African institution?'], ['funding', 'Can you show funding for tuition and living costs?'], ['medical', 'Will you hold South African medical cover?']],
  family: [['sponsor', 'Is your spouse, partner or relative a South African citizen or permanent resident?'], ['evidence', 'Can you document the relationship (certificates, shared home)?'], ['support', 'Can your sponsor show they can support you financially?']],
  settle: [['status', 'Do you currently hold a valid temporary residence visa?'], ['years', 'Have you lived or worked in South Africa lawfully for five years or more?'], ['basis', 'Do you have a permanent job offer or a qualifying family relationship?']],
  retire: [['income', 'Do you have a pension or retirement income?'], ['cover', 'Will you have medical cover or a treatment plan in South Africa?'], ['records', 'Can you obtain police clearances from countries you have lived in?']],
  visit: [['purpose', 'Is your visit temporary, with a clear purpose?'], ['funds', 'Can you show funds to cover your stay?'], ['return', 'Do you have return or onward travel arranged?']],
  special: [['requirement', 'Is there a specific requirement you cannot meet?'], ['reason', 'Are your circumstances exceptional and documented?'], ['application', 'Do you have an application that the waiver relates to?']],
};
r.get('/assessment/questions', (_req, res) => res.json(QUESTIONS));

r.post('/assessment', optionalAuth, validate(assessmentSchema), (req, res) => {
  const { purpose, answers } = req.body;
  const qs = QUESTIONS[purpose];
  const yes = qs.filter(([k]) => answers[k] === 'yes').length;
  const outcome = yes === qs.length ? 'strong' : yes >= 2 ? 'possible' : 'review';
  const suggested = content.visas.filter(v => v.purposes.includes(purpose)).slice(0, 3).map(v => ({ slug: v.slug, title: v.title, turnaround: v.turnaround }));
  const messages = {
    strong: 'Your answers match the core requirements for this pathway.',
    possible: 'You may have a potential pathway. Some requirements need closer review.',
    review: 'Further review is recommended before choosing a category.',
  };
  if (req.user) db.insert('assessments', { userId: req.user.id, purpose, answers, score: yes, outcome });
  res.json({ outcome, score: yes, total: qs.length, message: messages[outcome], suggested });
});

export default r;
