import express from 'express';
import path from 'path';
import healthRouter from './health';
import itemsRouter from './items';
import offersRouter from './offers';
import mediaRouter from './media';
import negotiationsRouter from './negotiations';
import settingsRouter from './settings';
import { renderUI } from '../ui';
import { TAXONOMY } from '../taxonomy';

export function createApp(): express.Express {
  const app = express();

  app.use(express.json());

  // Allow cross-origin requests (so browsers can fetch media from peer beacons)
  app.use((_req, res, next) => { res.header('Access-Control-Allow-Origin', '*'); next(); });

  // Serve uploaded media files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.get('/', (_req, res) => {
    res.type('html').send(renderUI());
  });

  app.get('/taxonomy', (_req, res) => {
    res.json(TAXONOMY);
  });

  app.use('/health', healthRouter);
  app.use('/items', itemsRouter);
  app.use('/items/:itemId/media', mediaRouter);
  app.use('/offers', offersRouter);
  app.use('/negotiations', negotiationsRouter);
  app.use('/settings', settingsRouter);

  // Global error handler — catches multer errors, etc., and returns JSON instead of HTML
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[API] Error:', err.message);
    const status = (err as any).status || (err as any).statusCode || 500;
    res.status(status).json({ error: err.message });
  });

  return app;
}
