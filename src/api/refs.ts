import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { RefQueries, MediaQueries, NegotiationQueries } from '../db';
import { isValidCategory, isValidSubcategory, TAXONOMY } from '../taxonomy';
import type { ListingStatus } from '@pelagora/pim-protocol';
import { sanitizeObject } from '@pelagora/pim-protocol';

const VALID_LISTING_STATUSES: ListingStatus[] = ['private', 'for_sale', 'willing_to_sell', 'for_rent'];
const PUBLIC_STATUSES: ListingStatus[] = ['for_sale', 'willing_to_sell', 'for_rent'];

const router = Router();

// GET /refs?category=...&subcategory=...&search=...&archived=true
router.get('/', (req: Request, res: Response) => {
  const refs = new RefQueries();
  const archived = req.query.archived === 'true' || req.query.status === 'archived';

  if (archived) {
    return res.json(refs.listArchived());
  }

  const search = String(req.query.search || '');
  const category = String(req.query.category || '');
  const subcategory = String(req.query.subcategory || '');

  if (search.length > 0) {
    return res.json(refs.search(search));
  }

  res.json(refs.list(category || undefined, subcategory || undefined));
});

// POST /refs/bulk-archive
router.post('/bulk-archive', (req: Request, res: Response) => {
  const refs = new RefQueries();
  const negotiations = new NegotiationQueries();
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array' });
  }

  let archived = 0;
  for (const id of ids) {
    const ref = refs.get(String(id));
    if (!ref) continue;

    // If ref was synced, unsync it
    if (ref.reffoSynced) {
      const syncManager = req.app.get('syncManager');
      if (syncManager) {
        syncManager.unsyncItem(String(id)).catch(() => {});
      }
    }

    // Unpublish from network mirror
    if (ref.networkPublished) {
      const networkPublisher = req.app.get('networkPublisher');
      if (networkPublisher) {
        networkPublisher.unpublishItem(String(id)).catch(() => {});
      }
    }

    // Auto-reject pending negotiations
    const pendingNegs = negotiations.listForRef(String(id)).filter(
      (n: { status: string }) => n.status === 'pending' || n.status === 'countered'
    );
    for (const neg of pendingNegs) {
      negotiations.updateStatus(neg.id, 'rejected', undefined, 'Ref is no longer available');
    }

    refs.archive(String(id), 'deleted');
    archived++;
  }

  res.json({ archived });
});

// POST /refs/bulk-update-status
router.post('/bulk-update-status', (req: Request, res: Response) => {
  const refs = new RefQueries();
  const { ids, listingStatus } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array' });
  }

  const validStatuses: ListingStatus[] = ['private', 'for_sale', 'willing_to_sell', 'for_rent'];
  if (!validStatuses.includes(listingStatus)) {
    return res.status(400).json({ error: `Invalid listingStatus. Must be one of: ${validStatuses.join(', ')}` });
  }

  let updated = 0;
  for (const id of ids) {
    const ref = refs.get(String(id));
    if (!ref) continue;
    refs.update(String(id), { listingStatus });
    updated++;
  }

  res.json({ updated });
});

// POST /refs/bulk-move-collection
router.post('/bulk-move-collection', (req: Request, res: Response) => {
  const refs = new RefQueries();
  const { ids, collectionId } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array' });
  }

  let updated = 0;
  for (const id of ids) {
    const ref = refs.get(String(id));
    if (!ref) continue;
    refs.update(String(id), { collectionId: collectionId ?? null });
    updated++;
  }

  res.json({ updated });
});

// POST /refs/bulk-delete
router.post('/bulk-delete', (req: Request, res: Response) => {
  const refs = new RefQueries();
  const media = new MediaQueries();
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array' });
  }

  let deleted = 0;
  for (const id of ids) {
    const ref = refs.get(String(id));
    if (!ref) continue;
    if (ref.listingStatus !== 'archived_sold' && ref.listingStatus !== 'archived_deleted') continue;

    const filePaths = media.deleteAllForRef(String(id));
    refs.delete(String(id));

    for (const fp of filePaths) {
      const fullPath = path.join(process.cwd(), fp);
      try {
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      } catch {}
    }

    const refDir = path.join(process.cwd(), 'uploads', String(id));
    try {
      if (fs.existsSync(refDir)) fs.rmdirSync(refDir);
    } catch {}

    deleted++;
  }

  res.json({ deleted });
});

// GET /refs/:id
router.get('/:id', (req: Request, res: Response) => {
  const refs = new RefQueries();
  const ref = refs.get(String(req.params.id));
  if (!ref) return res.status(404).json({ error: 'Ref not found' });
  res.json(ref);
});

// POST /refs
router.post('/', (req: Request, res: Response) => {
  const refs = new RefQueries();
  const body = sanitizeObject(req.body);
  const { name, description, category, subcategory, image, sku, listingStatus, quantity,
    locationLat, locationLng, locationAddress, locationCity, locationState, locationZip, locationCountry,
    sellingScope, sellingRadiusMiles, attributes, condition,
    rentalTerms, rentalDeposit, rentalDuration, rentalDurationUnit,
    purchaseDate, purchasePrice, acceptedPaymentMethods } = body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }

  if (listingStatus !== undefined && !VALID_LISTING_STATUSES.includes(listingStatus)) {
    return res.status(400).json({ error: `Invalid listingStatus: ${listingStatus}. Must be one of: ${VALID_LISTING_STATUSES.join(', ')}` });
  }

  if (quantity !== undefined && (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1)) {
    return res.status(400).json({ error: 'quantity must be a positive integer' });
  }

  if (category && !isValidCategory(category)) {
    return res.status(400).json({ error: `Invalid category: ${category}` });
  }

  if (subcategory && category && !isValidSubcategory(category, subcategory)) {
    return res.status(400).json({ error: `Invalid subcategory: ${subcategory} for category: ${category}` });
  }

  const beaconId = req.app.get('beaconId') as string;
  const ref = refs.create({
    name, description, category, subcategory, image, sku, listingStatus, quantity,
    locationLat: locationLat != null ? Number(locationLat) : undefined,
    locationLng: locationLng != null ? Number(locationLng) : undefined,
    locationAddress, locationCity, locationState, locationZip, locationCountry,
    sellingScope, sellingRadiusMiles: sellingRadiusMiles != null ? Number(sellingRadiusMiles) : undefined,
    attributes, condition,
    rentalTerms, rentalDeposit: rentalDeposit != null ? Number(rentalDeposit) : undefined,
    rentalDuration: rentalDuration != null ? Number(rentalDuration) : undefined, rentalDurationUnit,
    purchaseDate: purchaseDate || undefined,
    purchasePrice: purchasePrice != null ? Number(purchasePrice) : undefined,
    acceptedPaymentMethods: Array.isArray(acceptedPaymentMethods) ? acceptedPaymentMethods : undefined,
  }, beaconId);

  // Auto-publish to Reffo network if listing is public
  if (PUBLIC_STATUSES.includes(ref.listingStatus)) {
    const networkPublisher = req.app.get('networkPublisher');
    if (networkPublisher) {
      const { OfferQueries } = require('../db');
      const refOffers = new OfferQueries().list(ref.id).filter((o: { status: string }) => o.status === 'active');
      networkPublisher.publishItem(ref, refOffers).catch((err: Error) => {
        console.warn('[Network] Auto-publish failed for ref', ref.id, err.message);
      });
    }
  }

  res.status(201).json(ref);
});

// PATCH /refs/:id
router.patch('/:id', (req: Request, res: Response) => {
  const refs = new RefQueries();
  const body = sanitizeObject(req.body);
  const { name, description, category, subcategory, image, sku, listingStatus, quantity,
    locationLat, locationLng, locationAddress, locationCity, locationState, locationZip, locationCountry,
    sellingScope, sellingRadiusMiles, attributes, condition,
    rentalTerms, rentalDeposit, rentalDuration, rentalDurationUnit,
    purchaseDate, purchasePrice, collectionId, acceptedPaymentMethods } = body;

  if (listingStatus !== undefined && !VALID_LISTING_STATUSES.includes(listingStatus)) {
    return res.status(400).json({ error: `Invalid listingStatus: ${listingStatus}. Must be one of: ${VALID_LISTING_STATUSES.join(', ')}` });
  }

  if (quantity !== undefined && (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1)) {
    return res.status(400).json({ error: 'quantity must be a positive integer' });
  }

  if (category !== undefined && category !== '' && !isValidCategory(category)) {
    return res.status(400).json({ error: `Invalid category: ${category}` });
  }

  if (subcategory !== undefined && category && !isValidSubcategory(category, subcategory)) {
    return res.status(400).json({ error: `Invalid subcategory: ${subcategory} for category: ${category}` });
  }

  const updated = refs.update(String(req.params.id), {
    name, description, category, subcategory, image, sku, listingStatus, quantity,
    locationLat: locationLat != null ? Number(locationLat) : locationLat,
    locationLng: locationLng != null ? Number(locationLng) : locationLng,
    locationAddress, locationCity, locationState, locationZip, locationCountry,
    sellingScope, sellingRadiusMiles: sellingRadiusMiles != null ? Number(sellingRadiusMiles) : sellingRadiusMiles,
    attributes, condition,
    rentalTerms, rentalDeposit: rentalDeposit != null ? Number(rentalDeposit) : rentalDeposit,
    rentalDuration: rentalDuration != null ? Number(rentalDuration) : rentalDuration, rentalDurationUnit,
    purchaseDate, purchasePrice: purchasePrice != null ? Number(purchasePrice) : purchasePrice,
    collectionId,
    acceptedPaymentMethods: Array.isArray(acceptedPaymentMethods) ? acceptedPaymentMethods : undefined,
  });
  if (!updated) return res.status(404).json({ error: 'Ref not found' });

  // If ref is synced to Reffo.ai, push update (fire-and-forget)
  if (updated.reffoSynced) {
    const syncManager = req.app.get('syncManager');
    if (syncManager) {
      syncManager.syncItem(updated.id).catch((err: Error) => {
        console.warn('[Sync] Auto re-sync failed for ref', updated.id, err.message);
      });
    }
  }

  // Network publish: publish/unpublish based on listing status change
  const networkPublisher = req.app.get('networkPublisher');
  if (networkPublisher) {
    const isPublic = PUBLIC_STATUSES.includes(updated.listingStatus);
    if (isPublic) {
      const { OfferQueries } = require('../db');
      const refOffers = new OfferQueries().list(updated.id).filter((o: { status: string }) => o.status === 'active');
      networkPublisher.publishItem(updated, refOffers).catch((err: Error) => {
        console.warn('[Network] Auto-publish failed for ref', updated.id, err.message);
      });
    } else if (updated.networkPublished) {
      networkPublisher.unpublishItem(updated.id).catch((err: Error) => {
        console.warn('[Network] Auto-unpublish failed for ref', updated.id, err.message);
      });
    }
  }

  res.json(updated);
});

// DELETE /refs/:id — soft archive (not hard delete)
router.delete('/:id', (req: Request, res: Response) => {
  const refs = new RefQueries();
  const negotiations = new NegotiationQueries();
  const refId = String(req.params.id);

  const ref = refs.get(refId);
  if (!ref) return res.status(404).json({ error: 'Ref not found' });

  // If ref was synced, unsync it
  if (ref.reffoSynced) {
    const syncManager = req.app.get('syncManager');
    if (syncManager) {
      syncManager.unsyncItem(refId).catch(() => {});
    }
  }

  // Unpublish from network mirror
  if (ref.networkPublished) {
    const networkPublisher = req.app.get('networkPublisher');
    if (networkPublisher) {
      networkPublisher.unpublishItem(refId).catch(() => {});
    }
  }

  // Auto-reject any pending/countered negotiations for this ref
  const pendingNegs = negotiations.listForRef(refId).filter(
    (n: { status: string }) => n.status === 'pending' || n.status === 'countered'
  );
  for (const neg of pendingNegs) {
    negotiations.updateStatus(neg.id, 'rejected', undefined, 'Ref is no longer available');
  }

  refs.archive(refId, 'deleted');
  res.status(204).send();
});

// POST /refs/:id/restore — restore an archived ref
router.post('/:id/restore', (req: Request, res: Response) => {
  const refs = new RefQueries();
  const refId = String(req.params.id);

  const restored = refs.restore(refId);
  if (!restored) return res.status(404).json({ error: 'Archived ref not found' });

  res.json(restored);
});

// DELETE /refs/:id/permanent — hard delete (only for archived refs)
router.delete('/:id/permanent', (req: Request, res: Response) => {
  const refs = new RefQueries();
  const media = new MediaQueries();
  const refId = String(req.params.id);

  const ref = refs.get(refId);
  if (!ref) return res.status(404).json({ error: 'Ref not found' });
  if (ref.listingStatus !== 'archived_sold' && ref.listingStatus !== 'archived_deleted') {
    return res.status(400).json({ error: 'Only archived refs can be permanently deleted' });
  }

  // Get media file paths before deletion (CASCADE will remove DB records)
  const filePaths = media.deleteAllForRef(refId);

  refs.delete(refId);

  // Clean up files from disk
  for (const fp of filePaths) {
    const fullPath = path.join(process.cwd(), fp);
    try {
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch {
      // File already gone
    }
  }

  // Try to remove the ref's upload directory
  const refDir = path.join(process.cwd(), 'uploads', refId);
  try {
    if (fs.existsSync(refDir)) fs.rmdirSync(refDir);
  } catch {
    // Directory not empty or doesn't exist
  }

  res.status(204).send();
});

// POST /refs/suggest-category — AI-based category suggestion from title
router.post('/suggest-category', async (req: Request, res: Response) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    return res.status(400).json({ error: 'title is required (min 2 characters)' });
  }

  const provider = (process.env.AI_PROVIDER || 'reffo').toLowerCase();
  const taxonomyStr = Object.entries(TAXONOMY)
    .map(([cat, subs]) => `${cat}: ${subs.join(', ')}`)
    .join('\n');

  const prompt = `Given this product title, pick the best category and subcategory from the taxonomy below. Return JSON only.

Title: "${title.trim()}"

Taxonomy:
${taxonomyStr}

Return: {"category": "<exact category name>", "subcategory": "<exact subcategory name or null>", "confidence": "<high|medium|low>"}
Only return "high" confidence if you are very sure. Return ONLY valid JSON.`;

  try {
    if (provider === 'reffo') {
      const apiKey = process.env.REFFO_API_KEY;
      if (!apiKey) {
        return res.json({ category: null, subcategory: null, confidence: 'low' });
      }
      const reffoUrl = process.env.REFFO_API_URL || 'https://reffo.ai';
      const upstream = await fetch(`${reffoUrl}/api/category-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (upstream.ok) {
        const data = await upstream.json() as Record<string, unknown>;
        return res.json(data);
      }
      return res.json({ category: null, subcategory: null, confidence: 'low' });
    }

    // Direct AI provider
    const aiApiKey = process.env.AI_API_KEY;
    if (!aiApiKey) {
      return res.json({ category: null, subcategory: null, confidence: 'low' });
    }

    let result: { category: string | null; subcategory: string | null; confidence: string };

    if (provider === 'anthropic') {
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': aiApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 128,
          temperature: 0,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!aiRes.ok) return res.json({ category: null, subcategory: null, confidence: 'low' });
      const data = await aiRes.json() as { content?: { type: string; text: string }[] };
      const text = data.content?.[0]?.type === 'text' ? data.content[0].text : '';
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      result = JSON.parse(cleaned);
    } else {
      // OpenAI-compatible (openai, xai, google handled similarly)
      const endpoints: Record<string, { url: string; model: string }> = {
        openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
        xai: { url: 'https://api.x.ai/v1/chat/completions', model: 'grok-3-mini-fast' },
      };
      const ep = endpoints[provider] || endpoints.openai;
      const aiRes = await fetch(ep.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiApiKey}` },
        body: JSON.stringify({
          model: ep.model,
          temperature: 0,
          max_tokens: 128,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!aiRes.ok) return res.json({ category: null, subcategory: null, confidence: 'low' });
      const data = await aiRes.json() as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content ?? '';
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      result = JSON.parse(cleaned);
    }

    // Validate category exists
    if (result.category && !isValidCategory(result.category)) {
      return res.json({ category: null, subcategory: null, confidence: 'low' });
    }

    return res.json({
      category: result.category || null,
      subcategory: result.subcategory || null,
      confidence: result.confidence || 'low',
    });
  } catch {
    return res.json({ category: null, subcategory: null, confidence: 'low' });
  }
});

export default router;
