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
  assert.equal((await call('POST', '/consultations', booking)).status, 201);
  assert.equal((await call('POST', '/consultations', booking)).status, 409);
  const after = await call('GET', `/consultations/availability?date=${date}`);
  assert.equal(after.data.slots.find(s => s.time === slot.time).available, false);
});

test('portal: register, upload, admin review', async () => {
  const reg = await call('POST', '/auth/register', { name: 'Daniel Okafor', email: 'daniel@example.com', password: 'Passw0rd!', visa: 'critical-skills-work-visa' });
  assert.equal(reg.status, 201);
  const token = reg.data.token;
  assert.equal((await call('POST', '/auth/register', { name: 'Dup', email: 'daniel@example.com', password: 'Passw0rd!', visa: 'study-visa' })).status, 409);

  const dash = await call('GET', '/portal/dashboard', null, token);
  assert.equal(dash.data.application.documents.total, 9);
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
