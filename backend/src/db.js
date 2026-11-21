// Datastore.
//
// With DATABASE_URL set (Railway PostgreSQL), PostgreSQL is the system of record:
// every record lives in the gp_records table as JSONB, all records are loaded into
// memory at start-up, and every insert/update/delete is written through to
// PostgreSQL in order. This suits a single-instance deployment (one replica).
//
// Without DATABASE_URL (local development, tests), records are kept in
// DATA_DIR/db.json. A JSON snapshot is also written in PostgreSQL mode as a backup.
//
// Uploaded files are stored on disk in DATA_DIR/uploads (the Railway volume).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';

const COLLECTIONS = ['users', 'enquiries', 'consultations', 'applications', 'documents', 'activity', 'assessments', 'subscribers'];

fs.mkdirSync(config.dataDir, { recursive: true });
export const uploadsDir = path.join(config.dataDir, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const file = path.join(config.dataDir, 'db.json');
const empty = () => Object.fromEntries(COLLECTIONS.map(c => [c, []]));
let state = empty();

function loadJson() {
  try {
    if (!fs.existsSync(file)) return null;
    const loaded = JSON.parse(fs.readFileSync(file, 'utf8'));
    const out = empty();
    for (const c of COLLECTIONS) out[c] = Array.isArray(loaded[c]) ? loaded[c] : [];
    return out;
  } catch (err) {
    console.error('[db] Could not read db.json:', err.message);
    return null;
  }
}
state = loadJson() || empty();

let writeTimer = null;
function persistJson() {
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

/* ---------- PostgreSQL ---------- */
let pool = null;
let queue = Promise.resolve();
let pgErrors = 0;
export const dbInfo = { mode: 'json', records: 0 };

const UPSERT = `INSERT INTO gp_records (collection, id, data, updated_at) VALUES ($1, $2, $3, now())
  ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;

function enqueue(fn) {
  queue = queue.then(fn).catch(err => { pgErrors += 1; console.error('[db] PostgreSQL write failed:', err.message); });
  return queue;
}

/** Connects to PostgreSQL (if configured), creates the table, imports db.json once, and loads all records. */
export async function initDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    dbInfo.records = COLLECTIONS.reduce((n, c) => n + state[c].length, 0);
    console.log(`[db] Using JSON file storage (${dbInfo.records} records). Set DATABASE_URL to use PostgreSQL.`);
    return dbInfo;
  }
  const { default: pg } = await import('pg');
  const ssl = process.env.PGSSL === 'true' || /sslmode=require/.test(url) ? { rejectUnauthorized: false } : false;
  pool = new pg.Pool({ connectionString: url, ssl, max: 5, idleTimeoutMillis: 30_000 });
  pool.on('error', err => console.error('[db] PostgreSQL pool error:', err.message));

  await pool.query(`CREATE TABLE IF NOT EXISTS gp_records (
    collection text NOT NULL,
    id text NOT NULL,
    data jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (collection, id)
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS gp_records_collection_idx ON gp_records (collection)');

  const { rows: [{ count }] } = await pool.query('SELECT count(*)::int AS count FROM gp_records');
  if (count === 0) {
    // First start with PostgreSQL: import whatever the JSON store holds (e.g. existing production data).
    const legacy = loadJson();
    const total = legacy ? COLLECTIONS.reduce((n, c) => n + legacy[c].length, 0) : 0;
    if (total) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const c of COLLECTIONS) for (const row of legacy[c]) await client.query(UPSERT, [c, row.id, row]);
        await client.query('COMMIT');
        console.log(`[db] Imported ${total} records from db.json into PostgreSQL.`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  }

  const { rows } = await pool.query('SELECT collection, data FROM gp_records ORDER BY created_at, id');
  state = empty();
  for (const r of rows) if (state[r.collection]) state[r.collection].push(r.data);
  for (const c of COLLECTIONS) state[c].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  dbInfo.mode = 'postgres';
  dbInfo.records = rows.length;
  console.log(`[db] Connected to PostgreSQL (${rows.length} records loaded).`);
  return dbInfo;
}

/** Health check: confirms PostgreSQL answers and pending writes are succeeding. */
export async function dbHealth() {
  if (!pool) return { mode: 'json', ok: true };
  const t = Date.now();
  await pool.query('SELECT 1');
  return { mode: 'postgres', ok: pgErrors === 0, latencyMs: Date.now() - t, writeErrors: pgErrors };
}

/** Waits for queued PostgreSQL writes and closes the pool (used on shutdown). */
export async function closeDb() {
  try { flush(); } catch {}
  await queue;
  if (pool) await pool.end();
}

function written(c, row, op = 'upsert') {
  persistJson();
  if (!pool) return;
  if (op === 'delete') enqueue(() => pool.query('DELETE FROM gp_records WHERE collection = $1 AND id = $2', [c, row.id]));
  else { const snapshot = structuredClone(row); enqueue(() => pool.query(UPSERT, [c, snapshot.id, snapshot])); }
}

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
    written(c, row);
    return row;
  },
  update(c, idv, patch) {
    const row = state[c].find(r => r.id === idv);
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: now() });
    written(c, row);
    return row;
  },
  remove(c, idv) {
    const i = state[c].findIndex(r => r.id === idv);
    if (i === -1) return false;
    const [row] = state[c].splice(i, 1);
    written(c, row, 'delete');
    return true;
  },
};
