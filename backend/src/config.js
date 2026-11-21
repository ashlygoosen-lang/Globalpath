import 'dotenv/config';
import path from 'node:path';
import crypto from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  console.warn('[config] JWT_SECRET is not set. Sessions will reset on every restart. Set it in your environment.');
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Comma-separated list of allowed browser origins, e.g. https://globalpath-frontend.up.railway.app
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:8443')
    .split(',').map(s => s.trim()).filter(Boolean),
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 10),
  admin: {
    email: (process.env.ADMIN_EMAIL || 'admin@globalpath.co.za').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || (isProd ? '' : 'ChangeMe!2026'),
    name: process.env.ADMIN_NAME || 'GlobalPath Admin',
  },
  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'GlobalPath Immigration <hello@globalpath.co.za>',
    notify: process.env.NOTIFY_EMAIL || 'hello@globalpath.co.za',
  },
  office: {
    timezone: 'Africa/Johannesburg',
    openHour: 9,
    closeHour: 16,      // last slot starts before this hour
    slotMinutes: 45,
    gapMinutes: 15,
    bookingWindowDays: 60,
  },
};
