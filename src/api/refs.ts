import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { RefQueries, MediaQueries, NegotiationQueries } from '../db';
import { isValidCategory, isValidSubcategory } from '../taxonomy';
import type { ListingStatus } from '@reffo/protocol';
import { sanitizeObject } from '@reffo/protocol';

const VALID_LISTING_STATUSES: ListingStatus[] = ['private', 'for_sale', 'willing_to_sell', 'for_rent'];

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
    rentalTerms, rentalDeposit, rentalDuration, rentalDurationUnit } = body;

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
  }, beaconId);
  res.status(201).json(ref);
});

// PATCH /refs/:id
router.patch('/:id', (req: Request, res: Response) => {
  const refs = new RefQueries();
  const body = sanitizeObject(req.body);
  const { name, description, category, subcategory, image, sku, listingStatus, quantity,
    locationLat, locationLng, locationAddress, locationCity, locationState, locationZip, locationCountry,
    sellingScope, sellingRadiusMiles, attributes, condition,
    rentalTerms, rentalDeposit, rentalDuration, rentalDurationUnit } = body;

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

export default router;
