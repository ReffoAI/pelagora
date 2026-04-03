import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { RefQueries, MediaQueries } from '../db';
import type { MediaType } from '@pelagora/pim-protocol';
import { sanitizeField } from '@pelagora/pim-protocol';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALL_MIMES = [...PHOTO_MIMES, ...VIDEO_MIMES];

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_PHOTOS = 30;
const MAX_FILES = 30;

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const refId = String(req.params.refId);
    const dir = path.join(UPLOADS_DIR, refId);
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
    if (VIDEO_MIMES.includes(file.mimetype)) {
      cb(new Error('Video uploads are temporarily disabled. Photo uploads (JPEG, PNG, WebP) are supported.'));
    } else if (PHOTO_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
  limits: {
    fileSize: MAX_PHOTO_SIZE,
  },
});

const router = Router({ mergeParams: true });

function cleanupFiles(files: Express.Multer.File[]) {
  for (const f of files) {
    try { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch { /* ignore */ }
  }
}

// POST /refs/:refId/media — accepts multiple files via "files" field
router.post('/', upload.array('files', MAX_FILES), (req: Request, res: Response) => {
  const refs = new RefQueries();
  const media = new MediaQueries();
  const refId = String(req.params.refId);

  const files = (req.files as Express.Multer.File[]) || [];
  // Also support single-file upload via "file" field for backwards compat
  if (files.length === 0 && req.file) {
    files.push(req.file);
  }

  const ref = refs.get(refId);
  if (!ref) {
    cleanupFiles(files);
    return res.status(404).json({ error: 'Ref not found' });
  }

  if (files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const currentPhotos = media.countPhotos(refId);
  const currentHasVideo = media.hasVideo(refId);
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
      errors.push(`${file.originalname}: only 1 video allowed per ref`);
      continue;
    }

    const relativePath = path.relative(process.cwd(), file.path);
    const record = media.create({
      id: uuid(),
      refId,
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

  // If ref is synced to Reffo.ai, push media update (fire-and-forget)
  if (ref.reffoSynced && results.length > 0) {
    const syncManager = req.app.get('syncManager');
    if (syncManager) {
      syncManager.syncItem(refId).catch((err: Error) => {
        console.warn('[Sync] Auto re-sync failed for media upload on ref', refId, err.message);
      });
    }
  }

  // If ref is network-published, push media to webapp
  if (ref.networkPublished && results.length > 0) {
    const networkPublisher = req.app.get('networkPublisher');
    if (networkPublisher) {
      networkPublisher.syncMedia(refId).catch((err: Error) => {
        console.warn('[Network] Media sync failed for ref', refId, err.message);
      });
    }
  }

  res.status(201).json({ uploaded: results, errors });
});

// POST /refs/:refId/media/from-url — download an image from a URL and save as media
router.post('/from-url', async (req: Request, res: Response) => {
  const refs = new RefQueries();
  const media = new MediaQueries();
  const refId = String(req.params.refId);

  const { url: rawUrl } = req.body;
  if (!rawUrl || typeof rawUrl !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  const url = sanitizeField(rawUrl, 'url');

  // SSRF protection: only allow http/https schemes
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only http and https URLs are allowed' });
    }
    // Block requests to localhost/internal IPs
    const hostname = parsed.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1' || hostname === '0.0.0.0') {
      return res.status(400).json({ error: 'URLs pointing to local addresses are not allowed' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const ref = refs.get(refId);
  if (!ref) return res.status(404).json({ error: 'Ref not found' });

  // Check photo limit
  const currentPhotos = media.countPhotos(refId);
  if (currentPhotos >= MAX_PHOTOS) {
    return res.status(400).json({ error: `Maximum ${MAX_PHOTOS} photos reached` });
  }

  try {
    // Download the image
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ReffoBeacon/1.0' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return res.status(400).json({ error: `Failed to download image: HTTP ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    const mime = contentType.split(';')[0].trim().toLowerCase();
    if (!PHOTO_MIMES.includes(mime)) {
      return res.status(400).json({ error: `Unsupported image type: ${mime}` });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_PHOTO_SIZE) {
      return res.status(400).json({ error: 'Image exceeds 10MB limit' });
    }
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'Downloaded image is empty' });
    }

    // Save to disk
    const extMap: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' };
    const ext = extMap[mime] || '.jpg';
    const dir = path.join(UPLOADS_DIR, refId);
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${uuid()}${ext}`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);

    const relativePath = path.relative(process.cwd(), filePath);
    const record = media.create({
      id: uuid(),
      refId,
      mediaType: 'photo',
      filePath: relativePath,
      mimeType: mime,
      fileSize: buffer.length,
      sortOrder: currentPhotos,
    });

    res.status(201).json(record);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Media] from-url failed:', msg);
    res.status(500).json({ error: 'Failed to download image: ' + msg });
  }
});

// GET /refs/:refId/media
// PUT /refs/:refId/media/reorder
router.put('/reorder', (req: Request, res: Response) => {
  const media = new MediaQueries();
  const refs = new RefQueries();
  const refId = String(req.params.refId);
  const { order } = req.body; // array of media IDs in desired order

  const ref = refs.get(refId);
  if (!ref) return res.status(404).json({ error: 'Ref not found' });
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array of media IDs' });

  for (let i = 0; i < order.length; i++) {
    media.updateSortOrder(String(order[i]), i);
  }

  res.json({ ok: true });
});

router.get('/', (req: Request, res: Response) => {
  const media = new MediaQueries();
  const refId = String(req.params.refId);
  res.json(media.listForRef(refId));
});

// DELETE /refs/:refId/media/:mediaId
router.delete('/:mediaId', (req: Request, res: Response) => {
  const media = new MediaQueries();
  const refs = new RefQueries();
  const refId = String(req.params.refId);
  const mediaId = String(req.params.mediaId);

  const ref = refs.get(refId);
  if (!ref) return res.status(404).json({ error: 'Ref not found' });

  const deleted = media.delete(mediaId);
  if (!deleted) return res.status(404).json({ error: 'Media not found' });

  const fullPath = path.join(process.cwd(), deleted.filePath);
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch {
    // File already gone
  }

  // If ref is synced to Reffo.ai, push media update (fire-and-forget)
  if (ref.reffoSynced) {
    const syncManager = req.app.get('syncManager');
    if (syncManager) {
      syncManager.syncItem(refId).catch((err: Error) => {
        console.warn('[Sync] Auto re-sync failed for media delete on ref', refId, err.message);
      });
    }
  }

  // Note: network media deletion not handled here — the webapp retains images
  // and they'll be cleaned up when the ref is unpublished

  res.status(204).send();
});

export default router;
