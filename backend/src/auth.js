import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { db } from './db.js';

export const hashPassword = pw => bcrypt.hash(pw, 11);
export const checkPassword = (pw, hash) => bcrypt.compare(pw, hash);

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

function readToken(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  return null;
}

export function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      const user = db.get('users', payload.sub);
      if (user && !user.disabled) req.user = user;
    } catch { /* ignore invalid token on optional routes */ }
  }
  next();
}

export function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' });
    next();
  });
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'This area is for GlobalPath staff only.' });
    next();
  });
}

/** Creates the first admin account from environment variables if none exists. */
export async function ensureAdmin() {
  if (db.find('users', u => u.role === 'admin')) return;
  if (!config.admin.password) {
    console.warn('[auth] No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD to create one on start-up.');
    return;
  }
  db.insert('users', {
    role: 'admin',
    name: config.admin.name,
    email: config.admin.email,
    passwordHash: await hashPassword(config.admin.password),
  });
  console.log(`[auth] Admin account created for ${config.admin.email}`);
}
