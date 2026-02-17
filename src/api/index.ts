import express from 'express';
import path from 'path';
import healthRouter from './health';
import itemsRouter from './items';
import offersRouter from './offers';
import mediaRouter from './media';
import negotiationsRouter from './negotiations';
import { renderUI } from '../ui';
import { TAXONOMY } from '../taxonomy';

export function createApp(): express.Express {
  const app = express();

  app.use(express.json());

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

  return app;
}
