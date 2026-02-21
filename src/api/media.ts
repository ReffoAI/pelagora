import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { ItemQueries, MediaQueries } from '../db';
import type { MediaType } from '../types';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALL_MIMES = [...PHOTO_MIMES, ...VIDEO_MIMES];

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_PHOTOS = 4;
const MAX_FILES = 5; // 4 photos + 1 video

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const itemId = String(req.params.itemId);
    const dir = path.join(UPLOADS_DIR, itemId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (ALL_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
  limits: {
    fileSize: MAX_VIDEO_SIZE,
  },
});

const router = Router({ mergeParams: true });

function cleanupFiles(files: Express.Multer.File[]) {
  for (const f of files) {
    try { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch { /* ignore */ }
  }
}

// POST /items/:itemId/media — accepts multiple files via "files" field
router.post('/', upload.array('files', MAX_FILES), (req: Request, res: Response) => {
  const items = new ItemQueries();
  const media = new MediaQueries();
  const itemId = String(req.params.itemId);

  const files = (req.files as Express.Multer.File[]) || [];
  // Also support single-file upload via "file" field for backwards compat
  if (files.length === 0 && req.file) {
    files.push(req.file);
  }

  const item = items.get(itemId);
  if (!item) {
    cleanupFiles(files);
    return res.status(404).json({ error: 'Item not found' });
  }

  if (files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const currentPhotos = media.countPhotos(itemId);
  const currentHasVideo = media.hasVideo(itemId);
  const results: ReturnType<typeof media.create>[] = [];
  const errors: string[] = [];
  let photoCount = currentPhotos;

  for (const file of files) {
    const isVideo = VIDEO_MIMES.includes(file.mimetype);
    const mediaType: MediaType = isVideo ? 'video' : 'photo';

    // Enforce size limits
    if (!isVideo && file.size > MAX_PHOTO_SIZE) {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      errors.push(`${file.originalname}: exceeds 10MB photo limit`);
      continue;
    }

    // Enforce count limits
    if (mediaType === 'photo' && photoCount >= MAX_PHOTOS) {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      errors.push(`${file.originalname}: maximum ${MAX_PHOTOS} photos reached`);
      continue;
    }

    if (mediaType === 'video' && (currentHasVideo || results.some(r => r.mediaType === 'video'))) {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      errors.push(`${file.originalname}: only 1 video allowed per item`);
      continue;
    }

    const relativePath = path.relative(process.cwd(), file.path);
    const record = media.create({
      id: uuid(),
      itemId,
      mediaType,
      filePath: relativePath,
      mimeType: file.mimetype,
      fileSize: file.size,
      sortOrder: mediaType === 'photo' ? photoCount : 0,
    });
    results.push(record);
    if (mediaType === 'photo') photoCount++;
  }

  if (results.length === 0 && errors.length > 0) {
    return res.status(400).json({ error: errors.join('; ') });
  }

  // If item is synced to Reffo.ai, push media update (fire-and-forget)
  if (item.reffoSynced && results.length > 0) {
    const syncManager = req.app.get('syncManager');
    if (syncManager) {
      syncManager.syncItem(itemId).catch((err: Error) => {
        console.warn('[Sync] Auto re-sync failed for media upload on item', itemId, err.message);
      });
    }
  }

  res.status(201).json({ uploaded: results, errors });
});

// GET /items/:itemId/media
router.get('/', (req: Request, res: Response) => {
  const media = new MediaQueries();
  const itemId = String(req.params.itemId);
  res.json(media.listForItem(itemId));
});

// DELETE /items/:itemId/media/:mediaId
router.delete('/:mediaId', (req: Request, res: Response) => {
  const media = new MediaQueries();
  const items = new ItemQueries();
  const itemId = String(req.params.itemId);
  const mediaId = String(req.params.mediaId);

  const item = items.get(itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const deleted = media.delete(mediaId);
  if (!deleted) return res.status(404).json({ error: 'Media not found' });

  const fullPath = path.join(process.cwd(), deleted.filePath);
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch {
    // File already gone
  }

  // If item is synced to Reffo.ai, push media update (fire-and-forget)
  if (item.reffoSynced) {
    const syncManager = req.app.get('syncManager');
    if (syncManager) {
      syncManager.syncItem(itemId).catch((err: Error) => {
        console.warn('[Sync] Auto re-sync failed for media delete on item', itemId, err.message);
      });
    }
  }

  res.status(204).send();
});

export default router;
