import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { ensureAdmin } from './auth.js';
import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import portalRoutes from './routes/portal.js';
import adminRoutes from './routes/admin.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // Railway / reverse proxies
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({
    origin(origin, cb) {
      if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) return cb(null, true);
      cb(null, false);
    },
    credentials: false,
  }));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  if (!process.env.SILENT) app.use(morgan(config.isProd ? 'combined' : 'dev'));

  // Throttle form submissions to deter spam.
  const formLimiter = rateLimit({ windowMs: 10 * 60e3, limit: 15, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many submissions. Please wait a few minutes.' } });
  app.use(['/api/enquiries', '/api/consultations', '/api/newsletter'], (req, res, next) => (req.method === 'POST' ? formLimiter(req, res, next) : next()));

  app.get('/', (_req, res) => res.json({ name: 'GlobalPath Immigration API', status: 'ok', docs: '/api/health' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
  app.use('/api', publicRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/portal', portalRoutes);
  app.use('/api/admin', adminRoutes);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request body is not valid JSON.' });
    console.error(err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong on our side. Please try again.' });
  });
  return app;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  await ensureAdmin();
  createApp().listen(config.port, '0.0.0.0', () => console.log(`GlobalPath API listening on :${config.port}`));
}
