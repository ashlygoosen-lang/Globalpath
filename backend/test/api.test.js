// End-to-end API tests. Run with: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gp-test-'));
process.env.DATA_DIR = dataDir;
process.env.SILENT = '1';
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'AdminPass123';

const { createApp } = await import('../src/server.js');
const { ensureAdmin } = await import('../src/auth.js');
const { flush } = await import('../src/db.js');

let server, base;
before(async () => {
  await ensureAdmin();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => { server.close(); flush(); fs.rmSync(dataDir, { recursive: true, force: true }); });

const call = async (method, url, body, token) => {
  const res = await fetch(base + url, {
    method,
    headers: { ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
};


function futureDate(days) { return new Date(Date.now() + days * 864e5).toISOString().slice(0, 10); }
function applicantFor(purpose) {
  const base = {
    personal: { surname: 'Okafor', givenNames: 'Daniel Chidi', sex: 'Male', dateOfBirth: '1990-04-12', placeOfBirth: 'Lagos', countryOfBirth: 'NG', nationality: 'NG', maritalStatus: 'Single', occupation: 'Engineer' },
    passport: { number: 'a1234 5678', type: 'Ordinary', issuingCountry: 'NG', placeOfIssue: 'Abuja', issueDate: '2022-01-10', expiryDate: futureDate(3000) },
    contact: { email: 'x@example.com', phone: '+234 801 234 5678', countryOfResidence: 'NG', homeAddress: '12 Allen Avenue, Ikeja, Lagos', emergencyName: 'Ada Okafor', emergencyRelationship: 'Sister', emergencyPhone: '+234 802 000 0000' },
    history: { everEntered: 'Yes', firstEntryDate: '2019-06-01', firstEntryPort: 'OR Tambo International Airport', inSouthAfrica: 'No', refused: 'No', deported: 'No', convicted: 'No' },
    trip: { purpose: 'To take up employment as a civil engineer in Cape Town.', arrivalDate: futureDate(60), departureDate: futureDate(900), applyFrom: 'South African mission or VFS centre abroad', mission: 'Lagos' },
    family: { hasDependants: 'No' },
    declaration: { truthful: true, notify: true, consent: true },
  };
  if (purpose === 'work') base.work = { employer: 'Table Bay Engineering', employerAddress: '1 Dock Road, Cape Town', jobTitle: 'Civil engineer', startDate: futureDate(70), monthlySalary: 65000 };
  if (purpose === 'study') base.study = { institution: 'University of Cape Town', course: 'MSc Data Science', startDate: futureDate(70), endDate: futureDate(800), funding: 'Myself' };
  return base;
}
const completeApplicant = (token, purpose) => call('PUT', '/portal/applicant', { data: applicantFor(purpose), complete: true }, token);

function nextWeekday() {
  const d = new Date(Date.now() + 2 * 3600e3 + 3 * 864e5);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

test('content endpoints', async () => {
  const { data } = await call('GET', '/content/visas?purpose=work');
  assert.ok(data.length >= 3);
  assert.equal((await call('GET', '/content/visas/study-visa')).data.title, 'Study Visa');
  assert.equal((await call('GET', '/content/articles/nope')).status, 404);
});

test('enquiry validation and creation', async () => {
  const bad = await call('POST', '/enquiries', { firstName: '', email: 'x' });
  assert.equal(bad.status, 422);
  assert.ok(bad.data.fields.email);
  const ok = await call('POST', '/enquiries', { firstName: 'Ama', lastName: 'Mensah', email: 'ama@example.com', service: 'Work Visa Solutions', message: 'I have a job offer in Cape Town.', consent: true });
  assert.equal(ok.status, 201);
  assert.match(ok.data.reference, /^GP-E-/);
});

test('consultation availability and double-booking protection', async () => {
  const date = nextWeekday();
  const av = await call('GET', `/consultations/availability?date=${date}`);
  assert.equal(av.status, 200);
  const slot = av.data.slots.find(s => s.available);
  assert.ok(slot);
  const booking = { service: 'Permanent Residence', mode: 'video', date, time: slot.time, name: 'Lerato Dube', email: 'lerato@example.com' };
  const booked = await call('POST', '/consultations', booking);
  assert.equal(booked.status, 201);
  assert.equal(booked.data.fee, 500);
  assert.equal((await call('POST', '/consultations', booking)).status, 409);
  const after = await call('GET', `/consultations/availability?date=${date}`);
  assert.equal(after.data.slots.find(s => s.time === slot.time).available, false);
});

test('portal: register, upload, admin review', async () => {
  const reg = await call('POST', '/auth/register', { name: 'Daniel Okafor', email: 'daniel@example.com', password: 'Passw0rd!', visa: 'critical-skills-work-visa' });
  assert.equal(reg.status, 201);
  const token = reg.data.token;
  assert.equal((await call('POST', '/auth/register', { name: 'Dup', email: 'daniel@example.com', password: 'Passw0rd!', visa: 'study-visa' })).status, 409);

  // Uploads are refused until the applicant details are complete
  const early = new FormData();
  early.append('file', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'early.pdf');
  const earlyRes = await call('POST', '/portal/documents', early, token);
  assert.equal(earlyRes.status, 409);
  assert.equal((await completeApplicant(token, 'work')).status, 200);

  const dash = await call('GET', '/portal/dashboard', null, token);
  assert.equal(dash.data.application.applicantComplete, true);
  assert.equal(dash.data.application.required.total, 20); // 14 DHA-1738 core + 6 critical skills
  assert.equal(dash.data.application.readyToSubmit, false);
  const docs = (await call('GET', '/portal/documents', null, token)).data;

  const fd = new FormData();
  fd.append('documentId', docs[0].id);
  fd.append('file', new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), 'passport.pdf');
  const up = await call('POST', '/portal/documents', fd, token);
  assert.equal(up.status, 201);
  assert.equal(up.data.status, 'uploaded');

  const badType = new FormData();
  badType.append('file', new Blob(['x'], { type: 'text/plain' }), 'notes.txt');
  assert.equal((await call('POST', '/portal/documents', badType, token)).status, 422);

  assert.equal((await call('GET', '/admin/stats', null, token)).status, 403);
  const admin = (await call('POST', '/auth/login', { email: 'admin@test.local', password: 'AdminPass123' })).data.token;
  const clients = (await call('GET', '/admin/clients', null, admin)).data;
  const appId = clients[0].application.id;
  assert.equal((await call('PATCH', `/admin/documents/${docs[0].id}`, { status: 'approved' }, admin)).status, 200);
  const updated = await call('PATCH', `/admin/applications/${appId}`, { stage: 2, note: 'Your qualifications are verified.' }, admin);
  assert.equal(updated.data.stageName, 'Quality review');

  const dash2 = await call('GET', '/portal/dashboard', null, token);
  assert.ok(dash2.data.application.progress > dash.data.application.progress);
  assert.ok(dash2.data.activity.some(a => a.title === 'Advisor update'));

  const file = await fetch(`${base}/portal/documents/${docs[0].id}/file`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(file.status, 200);
});

test('assessment', async () => {
  const res = await call('POST', '/assessment', { purpose: 'work', answers: { offer: 'yes', qualification: 'yes', experience: 'no' } });
  assert.equal(res.data.outcome, 'possible');
  assert.ok(res.data.suggested.length > 0);
});

test('submission is blocked until every required document is uploaded', async () => {
  const reg = await call('POST', '/auth/register', { name: 'Grace Mwale', email: 'grace@example.com', password: 'Passw0rd!', visa: 'study-visa' });
  const token = reg.data.token;
  assert.equal((await completeApplicant(token, 'study')).status, 200);
  const docs = (await call('GET', '/portal/documents', null, token)).data;
  const required = docs.filter(d => d.required);
  const mandatory = required.filter(d => !d.conditional);
  const conditional = required.filter(d => d.conditional);
  assert.ok(mandatory.length >= 8 && conditional.length >= 8);

  // Nothing uploaded: submit refused with the full missing list
  let sub = await call('POST', '/portal/application/submit', {}, token);
  assert.equal(sub.status, 409);
  assert.equal(sub.data.missing.length, required.length);

  // A mandatory document cannot be marked as not applicable
  assert.equal((await call('POST', `/portal/documents/${mandatory[0].id}/not-applicable`, { reason: 'I do not have one' }, token)).status, 422);

  const upload = async id => {
    const fd = new FormData();
    fd.append('documentId', id);
    fd.append('file', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'doc.pdf');
    return call('POST', '/portal/documents', fd, token);
  };
  for (const d of mandatory) assert.equal((await upload(d.id)).status, 201);

  // Conditional items still outstanding: still blocked
  sub = await call('POST', '/portal/application/submit', {}, token);
  assert.equal(sub.status, 409);
  assert.equal(sub.data.missing.length, conditional.length);

  // Mark all but one conditional item as not applicable, upload the last one
  for (const d of conditional.slice(1)) assert.equal((await call('POST', `/portal/documents/${d.id}/not-applicable`, { reason: 'Not married and no children' }, token)).status, 200);
  assert.equal((await upload(conditional[0].id)).status, 201);

  sub = await call('POST', '/portal/application/submit', {}, token);
  assert.equal(sub.status, 200);
  assert.equal(sub.data.submitted, true);
  assert.equal(sub.data.stageName, 'Quality review');

  // Advisor cannot lodge until everything is approved or confirmed not required
  const admin = (await call('POST', '/auth/login', { email: 'admin@test.local', password: 'AdminPass123' })).data.token;
  const appId = sub.data.id;
  let move = await call('PATCH', `/admin/applications/${appId}`, { stage: 3 }, admin);
  assert.equal(move.status, 409);
  assert.ok(move.data.missing.length > 0);

  // Rejecting a document sends the client back to resubmit
  assert.equal((await call('PATCH', `/admin/documents/${mandatory[0].id}`, { status: 'rejected' }, admin)).status, 422);
  assert.equal((await call('PATCH', `/admin/documents/${mandatory[0].id}`, { status: 'rejected', reviewNote: 'Passport page is blurred' }, admin)).status, 200);
  const dash = (await call('GET', '/portal/dashboard', null, token)).data.application;
  assert.equal(dash.needsResubmit, true);
  assert.equal(dash.readyToSubmit, false);
  assert.equal((await upload(mandatory[0].id)).status, 201);
  assert.equal((await call('POST', '/portal/application/submit', {}, token)).status, 200);

  const detail = (await call('GET', `/admin/applications/${appId}`, null, admin)).data;
  for (const d of detail.documents.filter(x => x.required)) {
    const status = d.status === 'not_applicable' ? 'waived' : 'approved';
    assert.equal((await call('PATCH', `/admin/documents/${d.id}`, { status }, admin)).status, 200, d.name);
  }
  move = await call('PATCH', `/admin/applications/${appId}`, { stage: 3 }, admin);
  assert.equal(move.status, 200);
  assert.equal(move.data.stageName, 'Submitted to VFS');
});

test('permanent residence uses the DHA-947 checklist', async () => {
  const { data } = await call('GET', '/content/visas/permanent-residence-worker');
  const keys = data.checklist.map(i => i.key);
  assert.ok(keys.includes('birth-certificate') && keys.includes('police-clearance'));
  assert.ok(data.checklist.some(i => i.name.startsWith('Proof of five years')));
});

test('applicant details: draft save, validation and locking', async () => {
  const reg = await call('POST', '/auth/register', { name: 'Tendai Moyo', email: 'tendai@example.com', password: 'Passw0rd!', visa: 'spousal-life-partner-visa' });
  const token = reg.data.token;
  const pre = (await call('GET', '/portal/applicant', null, token)).data;
  assert.equal(pre.data.personal.surname, 'Moyo');
  assert.equal(pre.data.contact.email, 'tendai@example.com');

  // Drafts save without validation; unknown fields are dropped
  const draft = await call('PUT', '/portal/applicant', { data: { personal: { surname: 'Moyo', hack: 'x' }, junk: { a: 1 } } }, token);
  assert.equal(draft.status, 200);
  assert.equal(draft.data.data.junk, undefined);
  assert.equal(draft.data.data.personal.hack, undefined);

  // Completing with problems returns field-level errors
  const bad = applicantFor('family');
  bad.passport.expiryDate = futureDate(100);             // too close to departure (900 days)
  bad.history = { ...bad.history, everEntered: 'Yes', firstEntryDate: '' };
  bad.personal.maritalStatus = 'Married';                 // spouse fields now required
  const res = await call('PUT', '/portal/applicant', { data: bad, complete: true }, token);
  assert.equal(res.status, 422);
  for (const k of ['passport.expiryDate', 'history.firstEntryDate', 'family.spouseName', 'sponsor.fullName']) assert.ok(res.data.fields[k], k);

  const good = applicantFor('family');
  good.sponsor = { fullName: 'Rudo Moyo', idNumber: '8001015009087', relationship: 'Spouse', status: 'South African citizen', relationshipSince: '2018-02-14', phone: '+27 82 111 2222' };
  good.personal.maritalStatus = 'Married';
  good.family = { spouseName: 'Rudo Moyo', spouseNationality: 'ZA', spouseDateOfBirth: '1980-01-01', spouseIncluded: 'No', hasDependants: 'Yes', dependants: [{ fullName: 'Tino Moyo', relationship: 'Son', dateOfBirth: '2015-05-05', nationality: 'ZW', passportNumber: 'fn123456' }] };
  const ok = await call('PUT', '/portal/applicant', { data: good, complete: true }, token);
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.data.passport.number, 'A12345678');               // normalised
  assert.equal(ok.data.data.family.dependants[0].passportNumber, 'FN123456');
  assert.ok(ok.data.completedAt);
  assert.equal(ok.data.data.work, undefined);                             // sections not for this visa are dropped
});
