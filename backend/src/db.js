// Lightweight JSON-file datastore with atomic writes.
// No native dependencies, so it deploys anywhere (Railway, Render, a VPS).
// On Railway, mount a volume and set DATA_DIR to its path so data survives redeploys.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';

const COLLECTIONS = ['users', 'enquiries', 'consultations', 'applications', 'documents', 'activity', 'assessments', 'subscribers'];

fs.mkdirSync(config.dataDir, { recursive: true });
export const uploadsDir = path.join(config.dataDir, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const file = path.join(config.dataDir, 'db.json');
let state = Object.fromEntries(COLLECTIONS.map(c => [c, []]));

try {
  if (fs.existsSync(file)) {
    const loaded = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const c of COLLECTIONS) state[c] = Array.isArray(loaded[c]) ? loaded[c] : [];
  }
} catch (err) {
  console.error('[db] Could not read db.json, starting empty:', err.message);
}

let writeTimer = null;
function persist() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(flush, 50);
}
export function flush() {
  clearTimeout(writeTimer);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1));
  fs.renameSync(tmp, file);
}
process.on('exit', () => { try { flush(); } catch {} });

export const id = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

/** Human-friendly reference, e.g. GP-C-7K2Q9 */
export function reference(prefix) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let s = '';
  for (const b of crypto.randomBytes(5)) s += alphabet[b % alphabet.length];
  return `GP-${prefix}-${s}`;
}

export const db = {
  all(c) { return state[c]; },
  find(c, pred) { return state[c].find(pred); },
  filter(c, pred) { return state[c].filter(pred); },
  get(c, idv) { return state[c].find(r => r.id === idv); },
  insert(c, record) {
    const row = { id: id(), createdAt: now(), ...record };
    state[c].push(row);
    persist();
    return row;
  },
  update(c, idv, patch) {
    const row = state[c].find(r => r.id === idv);
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: now() });
    persist();
    return row;
  },
  remove(c, idv) {
    const i = state[c].findIndex(r => r.id === idv);
    if (i === -1) return false;
    state[c].splice(i, 1);
    persist();
    return true;
  },
};
