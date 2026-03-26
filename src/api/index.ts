import express from 'express';
import path from 'path';
import healthRouter from './health';
import refsRouter from './refs';
import offersRouter from './offers';
import mediaRouter from './media';
import negotiationsRouter from './negotiations';
import settingsRouter from './settings';
import favoritesRouter from './favorites';
import collectionsRouter from './collections';
import scansRouter from './scans';
import conversationsRouter from './conversations';
import { renderUI } from '../ui';
import { TAXONOMY } from '../taxonomy';

export function createApp(localToken?: string): express.Express {
  const app = express();

  app.use(express.json());

  // --- Security: Host header validation (DNS rebinding protection) ---
  app.use((req, res, next) => {
    const host = (req.headers.host || '').replace(/:\d+$/, '');
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') {
      return next();
    }
    // Allow non-localhost only if beacon is explicitly bound to a non-localhost address
    if (app.get('nonLocalhost')) return next();
    res.status(403).json({ error: 'Forbidden: invalid Host header' });
  });

  // --- Security: CORS — only allow same-origin and cross-beacon media requests ---
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Same-origin requests (no Origin header) always pass
    if (!origin) return next();
    // Allow requests from the beacon's own origin
    if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      return next();
    }
    // Allow Reffo.ai webapp
    if (origin === 'https://reffo.ai' || origin === 'https://www.reffo.ai') {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      return next();
    }
    // Cross-origin requests from unknown origins: block
    res.status(403).json({ error: 'Forbidden: cross-origin request blocked' });
  });

  // Serve uploaded media files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Serve brand assets
  app.get('/favicon.ico', (_req, res) => { res.type('image/x-icon').sendFile(path.join(__dirname, '../../favicon.ico')); });
  app.get('/footer-brand.png', (_req, res) => { res.sendFile(path.join(__dirname, '../../footer-brand.png')); });
  app.get('/header-logo.png', (_req, res) => { res.sendFile(path.join(__dirname, '../../header-logo.png')); });
  app.get('/pelagora-logo.png', (_req, res) => { res.sendFile(path.join(__dirname, '../../pelagora-logo.png')); });
  app.get('/pelagora-logo-reverse.png', (_req, res) => { res.sendFile(path.join(__dirname, '../../pelagora-logo_reverse.png')); });

  app.get('/', (_req, res) => {
    res.type('html').send(renderUI(localToken));
  });

  // --- Security: Local token auth for API endpoints ---
  // Everything below this middleware requires the local auth token.
  // The UI page (served above) and static assets (served above) are exempt.
  if (localToken) {
    app.use((req, res, next) => {
      // Allow health check without auth (needed for monitoring)
      if (req.path === '/health' && req.method === 'GET') return next();
      // Allow taxonomy without auth (public reference data)
      if (req.path === '/taxonomy' && req.method === 'GET') return next();
      // Allow security-status without auth (UI needs it before token is loaded)
      if (req.path === '/api/security-status' && req.method === 'GET') return next();

      const authHeader = req.headers.authorization;
      const queryToken = req.query._token;

      if (
        (authHeader && authHeader === `Bearer ${localToken}`) ||
        queryToken === localToken
      ) {
        return next();
      }
      res.status(401).json({ error: 'Unauthorized: local auth token required' });
    });
  }

  app.get('/taxonomy', (_req, res) => {
    res.json(TAXONOMY);
  });

  app.use('/health', healthRouter);
  app.use('/refs', refsRouter);
  app.use('/refs/:refId/media', mediaRouter);
  app.use('/offers', offersRouter);
  app.use('/negotiations', negotiationsRouter);
  app.use('/settings', settingsRouter);
  app.use('/favorites', favoritesRouter);
  app.use('/collections', collectionsRouter);
  app.use('/scans', scansRouter);
  app.use('/conversations', conversationsRouter);

  // Global error handler — catches multer errors, etc., and returns JSON instead of HTML
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[API] Error:', err.message);
    // Multer file filter errors and video-disabled errors should be 400
    if (err.message && (err.message.includes('Video uploads are temporarily disabled') || err.message.includes('Unsupported file type'))) {
      return res.status(400).json({ error: err.message });
    }
    const status = (err as any).status || (err as any).statusCode || 500;
    res.status(status).json({ error: err.message });
  });

  return app;
}
