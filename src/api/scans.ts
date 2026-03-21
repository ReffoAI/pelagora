import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { RefQueries, ScanQueries, ScanItemQueries, MediaQueries } from '../db';
import { ReffoClient } from '../sync/reffo-client';
import { getDb } from '../db/schema';
import { getAttributeKeys } from '../ref-schemas';
import { callProductLookup, type AiProvider } from '../ai/product-lookup';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const SCAN_DIR = path.join(UPLOADS_DIR, 'scans');

const scanStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(SCAN_DIR, { recursive: true });
    cb(null, SCAN_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuid()}${ext}`);
  },
});

const scanUpload = multer({
  storage: scanStorage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are supported'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

// POST /scans — Upload image and scan via Reffo.ai
router.post('/', scanUpload.single('file'), async (req: Request, res: Response) => {
  const apiKey = process.env.REFFO_API_KEY;
  if (!apiKey) {
    // Clean up uploaded file
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(400).json({
      error: 'Connect to Reffo.ai in Settings to use AI scanning. Go to Settings → API Key to add your Reffo API key.',
    });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  const scanId = uuid();
  const scans = new ScanQueries();
  const scanItems = new ScanItemQueries();
  const collectionId = req.body.collectionId || null;
  const relativePath = path.relative(process.cwd(), req.file.path);

  // Create scan record
  scans.create({
    id: scanId,
    imagePath: relativePath,
    collectionId,
    status: 'processing',
  });

  try {
    // Read and resize image
    let imageBuffer = fs.readFileSync(req.file.path);
    let mediaType = req.file.mimetype;

    // Try to use sharp for resizing if available
    try {
      const sharp = require('sharp');
      const metadata = await sharp(imageBuffer).metadata();
      const MAX_DIMENSION = 2048;
      if (metadata.width && metadata.height &&
          (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION)) {
        imageBuffer = await sharp(imageBuffer)
          .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        mediaType = 'image/jpeg';
      }
    } catch {
      // sharp not available, use original image
    }

    const base64Image = imageBuffer.toString('base64');

    // Send to Reffo.ai
    const reffoUrl = process.env.REFFO_API_URL || 'https://reffo.ai';
    const client = new ReffoClient(apiKey, reffoUrl);
    const result = await client.scanImage(base64Image, mediaType, collectionId || undefined);

    if (!result.ok) {
      scans.updateStatus(scanId, 'failed');
      const status = result.status || 502;
      let errorMsg = result.error || 'Scan failed';

      // Provide helpful messages for common errors
      if (status === 403) {
        errorMsg = 'Scan limit reached. Upgrade your plan at reffo.ai or purchase additional credits.';
      } else if (status === 401) {
        errorMsg = 'Invalid API key. Check your Reffo API key in Settings.';
      }

      return res.status(status).json({ error: errorMsg });
    }

    // Store items locally
    const items = (result.items || []).map((item: Record<string, unknown>) => ({
      id: (item.id as string) || uuid(),
      scanId,
      name: (item.name as string) || 'Unknown Item',
      category: (item.category as string) || null,
      confidence: (item.confidence as number) || null,
      description: (item.description as string) || null,
      condition: (item.condition as string) || null,
      priceLow: (item.price_low as number) ?? null,
      priceHigh: (item.price_high as number) ?? null,
      priceTypical: (item.price_typical as number) ?? null,
      attributes: (item.attributes as Record<string, unknown>) || ({} as Record<string, unknown>),
    }));

    if (items.length > 0) {
      scanItems.createBatch(items);
    }

    scans.updateStatus(scanId, 'completed', items.length);

    res.json({
      scanId,
      items: scanItems.listForScan(scanId),
      usage: result.usage || null,
    });
  } catch (err) {
    console.error('[Scan] Error:', err);
    scans.updateStatus(scanId, 'failed');
    res.status(500).json({ error: 'Scan failed: ' + (err instanceof Error ? err.message : 'Unknown error') });
  }
});

// GET /scans — List all scans
router.get('/', (_req: Request, res: Response) => {
  const scans = new ScanQueries();
  res.json(scans.list());
});

// GET /scans/:id — Get scan with items
router.get('/:id', (req: Request, res: Response) => {
  const scans = new ScanQueries();
  const scanItemsQ = new ScanItemQueries();
  const scan = scans.get(req.params.id as string);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  res.json({ ...scan, items: scanItemsQ.listForScan(scan.id) });
});

// PATCH /scans/:scanId/items/:itemId — Edit scan item before confirming
router.patch('/:scanId/items/:itemId', (req: Request, res: Response) => {
  const scanItemsQ = new ScanItemQueries();
  const item = scanItemsQ.get(req.params.itemId as string);
  if (!item || item.scanId !== (req.params.scanId as string)) {
    return res.status(404).json({ error: 'Scan item not found' });
  }
  const { name, category, condition, description, priceLow, priceHigh, priceTypical } = req.body;
  const updated = scanItemsQ.update(req.params.itemId as string, {
    name, category, condition, description,
    priceLow: priceLow != null ? Number(priceLow) : undefined,
    priceHigh: priceHigh != null ? Number(priceHigh) : undefined,
    priceTypical: priceTypical != null ? Number(priceTypical) : undefined,
  });
  if (!updated) return res.status(404).json({ error: 'Scan item not found' });
  res.json(updated);
});

// POST /scans/confirm — Confirm selected scan items into refs
router.post('/confirm', async (req: Request, res: Response) => {
  const { scanId, itemIds, collectionId, listingStatuses, acceptedPaymentMethods, locationCity, locationState, locationZip } = req.body as {
    scanId: string;
    itemIds: string[];
    collectionId?: string;
    listingStatuses?: Record<string, string>;
    acceptedPaymentMethods?: string[];
    locationCity?: string;
    locationState?: string;
    locationZip?: string;
  };
  if (!scanId || !Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ error: 'scanId and itemIds (non-empty array) are required' });
  }

  const scanItemsQ = new ScanItemQueries();
  const refs = new RefQueries();
  const mediaQ = new MediaQueries();
  const beaconId = req.app.get('beaconId') as string;
  const created: Array<{ refId: string; scanItemId: string; name: string; listingStatus: string }> = [];
  const apiKey = process.env.REFFO_API_KEY;
  const reffoUrl = process.env.REFFO_API_URL || 'https://reffo.ai';

  // Get the scan to copy its image as fallback
  const scansQ = new ScanQueries();
  const scan = scansQ.get(scanId);

  for (const itemId of itemIds) {
    const item = scanItemsQ.get(String(itemId));
    if (!item || item.scanId !== String(scanId)) continue;
    if (item.refId) continue; // Already confirmed

    const itemStatus = (listingStatuses?.[item.id] as string) || 'for_sale';
    const validStatuses = ['private', 'for_sale', 'willing_to_sell', 'for_rent'];
    const status = validStatuses.includes(itemStatus) ? itemStatus : 'for_sale';

    const ref = refs.create({
      name: item.name,
      description: item.description || '',
      category: item.category || '',
      subcategory: '',
      condition: item.condition || undefined,
      listingStatus: status as 'private' | 'for_sale' | 'willing_to_sell' | 'for_rent',
      collectionId: collectionId || undefined,
      attributes: item.attributes || undefined,
      acceptedPaymentMethods: acceptedPaymentMethods as any[] || undefined,
      locationCity: locationCity || undefined,
      locationState: locationState || undefined,
      locationZip: locationZip || undefined,
    }, beaconId);

    // Price data stays on scan_items for display as a suggestion,
    // but no offer is auto-created — user must manually set price

    // Try to find a product image via Reffo.ai image search
    try {
      if (apiKey) {
        const searchRes = await fetch(`${reffoUrl}/api/product-lookup/image-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ query: `${item.name} ${item.category || ''}`.trim() }),
        });

        if (searchRes.ok) {
          const imgData = await searchRes.json() as { image_url?: string };
          if (imgData.image_url) {
            // Download and save locally
            const imgRes = await fetch(imgData.image_url, { signal: AbortSignal.timeout(10000) });
            if (imgRes.ok) {
              const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
              const buffer = Buffer.from(await imgRes.arrayBuffer());
              if (buffer.byteLength >= 1000 && buffer.byteLength <= 10 * 1024 * 1024) {
                const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
                const mediaDir = path.join(process.cwd(), 'uploads', 'refs', ref.id);
                fs.mkdirSync(mediaDir, { recursive: true });
                const filename = `product.${ext}`;
                const filePath = path.join(mediaDir, filename);
                fs.writeFileSync(filePath, buffer);

                mediaQ.create({
                  id: uuid(),
                  refId: ref.id,
                  filePath: path.relative(process.cwd(), filePath),
                  mediaType: 'photo',
                  mimeType: contentType,
                  fileSize: buffer.byteLength,
                  sortOrder: 0,
                });
              }
            }
          }
        }
      }
    } catch (imgErr) {
      // Image search is best-effort, don't fail the confirm
      console.error(`[Scan] Image search failed for ${item.name}:`, imgErr);
    }

    // Fallback: copy the scan image as the ref's photo if no product image was found
    const refMedia = mediaQ.listForRef(ref.id);
    if (refMedia.length === 0 && scan?.imagePath) {
      try {
        const srcPath = path.join(process.cwd(), scan.imagePath);
        if (fs.existsSync(srcPath)) {
          const mediaDir = path.join(process.cwd(), 'uploads', 'refs', ref.id);
          fs.mkdirSync(mediaDir, { recursive: true });
          const ext = path.extname(scan.imagePath) || '.jpg';
          const destPath = path.join(mediaDir, `scan${ext}`);
          fs.copyFileSync(srcPath, destPath);

          mediaQ.create({
            id: uuid(),
            refId: ref.id,
            filePath: path.relative(process.cwd(), destPath),
            mediaType: 'photo',
            mimeType: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
            fileSize: fs.statSync(destPath).size,
            sortOrder: 0,
          });
        }
      } catch (fallbackErr) {
        console.error(`[Scan] Fallback image copy failed for ${ref.id}:`, fallbackErr);
      }
    }

    scanItemsQ.linkToRef(item.id, ref.id);
    created.push({ refId: ref.id, scanItemId: item.id, name: ref.name, listingStatus: status });
  }

  res.json({ confirmed: created.length, refs: created });
});

// POST /scans/barcode — Barcode/UPC lookup (same logic as settings/product-lookup)
router.post('/barcode', async (req: Request, res: Response) => {
  const { upc } = req.body;
  if (!upc || typeof upc !== 'string' || !upc.trim()) {
    return res.status(400).json({ error: 'upc is required' });
  }

  const name = upc.trim();
  const nameNormalized = name.toLowerCase();

  // Check local SQLite cache first
  const db = getDb();
  const cached = db.prepare(
    `SELECT * FROM product_catalog
     WHERE name_normalized = ? AND category = '' AND subcategory = ''
     AND expires_at > datetime('now')`
  ).get(nameNormalized) as Record<string, unknown> | undefined;

  if (cached) {
    db.prepare(`UPDATE product_catalog SET lookup_count = lookup_count + 1 WHERE id = ?`).run(cached.id);
    return res.json({
      description: cached.description,
      sku: cached.sku,
      product_url: cached.product_url,
      image_url: cached.image_url,
      attributes: JSON.parse((cached.attributes as string) || '{}'),
      price_estimate: {
        low: cached.price_low, high: cached.price_high,
        typical: cached.price_typical, confidence: cached.price_confidence || 'low',
      },
      cached: true,
    });
  }

  const provider = (process.env.AI_PROVIDER || 'reffo').toLowerCase();
  const attributeKeys = getAttributeKeys(undefined, undefined);

  try {
    let result: Record<string, unknown>;

    if (provider === 'reffo') {
      const apiKey = process.env.REFFO_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'No AI provider configured. Connect to Reffo.ai or set up a direct AI provider in Settings.',
        });
      }
      const reffoUrl = process.env.REFFO_API_URL || 'https://reffo.ai';
      const upstream = await fetch(`${reffoUrl}/api/product-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ name, category: '', subcategory: '' }),
      });
      if (!upstream.ok) {
        const errData = await upstream.json().catch(() => ({}));
        return res.status(upstream.status).json({ error: ((errData as Record<string, unknown>).error as string) || 'Product lookup failed' });
      }
      result = await upstream.json() as Record<string, unknown>;
    } else {
      const aiApiKey = process.env.AI_API_KEY;
      if (!aiApiKey) {
        return res.status(400).json({ error: `AI provider "${provider}" selected but no API key configured.` });
      }
      result = await callProductLookup(provider as AiProvider, aiApiKey, {
        name, category: '', subcategory: '', attributeKeys,
      }) as unknown as Record<string, unknown>;
    }

    // Cache result
    const id = require('uuid').v4();
    const pe = (result.price_estimate || {}) as Record<string, unknown>;
    db.prepare(
      `INSERT INTO product_catalog (id, name_normalized, category, subcategory, description, sku, product_url, image_url, attributes, price_low, price_high, price_typical, price_confidence, ai_model, expires_at)
       VALUES (?, ?, '', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+30 days'))
       ON CONFLICT(name_normalized, category, subcategory) DO UPDATE SET
         description = excluded.description, sku = excluded.sku, product_url = excluded.product_url,
         image_url = excluded.image_url, attributes = excluded.attributes,
         price_low = excluded.price_low, price_high = excluded.price_high,
         price_typical = excluded.price_typical, price_confidence = excluded.price_confidence,
         ai_model = excluded.ai_model, lookup_count = product_catalog.lookup_count + 1,
         updated_at = datetime('now'), expires_at = datetime('now', '+30 days')`
    ).run(id, nameNormalized, result.description ?? null, result.sku ?? null,
      result.product_url ?? null, result.image_url ?? null,
      JSON.stringify(result.attributes || {}),
      pe.low ?? null, pe.high ?? null, pe.typical ?? null, pe.confidence ?? 'low', provider);

    return res.json({ ...result, cached: false });
  } catch (err) {
    console.error('Barcode lookup error:', err);
    return res.status(502).json({ error: 'Product lookup failed. Check your AI provider configuration.' });
  }
});

// DELETE /scans/:id — Delete a scan and its items
router.delete('/:id', (req: Request, res: Response) => {
  const scans = new ScanQueries();
  const id = req.params.id as string;
  const scan = scans.get(id);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });

  // Clean up scan image file
  if (scan.imagePath) {
    const fullPath = path.join(process.cwd(), scan.imagePath);
    try { if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath); } catch {}
  }

  scans.delete(id);
  res.status(204).send();
});

export default router;
