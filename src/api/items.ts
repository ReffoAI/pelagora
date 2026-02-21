import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ItemQueries, MediaQueries, NegotiationQueries } from '../db';
import { isValidCategory, isValidSubcategory } from '../taxonomy';
import type { ListingStatus } from '../types';

const VALID_LISTING_STATUSES: ListingStatus[] = ['private', 'for_sale', 'willing_to_sell'];

const router = Router();

// GET /items?category=...&subcategory=...&search=...&archived=true
router.get('/', (req: Request, res: Response) => {
  const items = new ItemQueries();
  const archived = req.query.archived === 'true';

  if (archived) {
    return res.json(items.listArchived());
  }

  const search = String(req.query.search || '');
  const category = String(req.query.category || '');
  const subcategory = String(req.query.subcategory || '');

  if (search.length > 0) {
    return res.json(items.search(search));
  }

  res.json(items.list(category || undefined, subcategory || undefined));
});

// GET /items/:id
router.get('/:id', (req: Request, res: Response) => {
  const items = new ItemQueries();
  const item = items.get(String(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// POST /items
router.post('/', (req: Request, res: Response) => {
  const items = new ItemQueries();
  const { name, description, category, subcategory, image, sku, listingStatus, quantity,
    locationLat, locationLng, locationAddress, locationCity, locationState, locationZip, locationCountry,
    sellingScope, sellingRadiusMiles } = req.body;

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
  const item = items.create({
    name, description, category, subcategory, image, sku, listingStatus, quantity,
    locationLat: locationLat != null ? Number(locationLat) : undefined,
    locationLng: locationLng != null ? Number(locationLng) : undefined,
    locationAddress, locationCity, locationState, locationZip, locationCountry,
    sellingScope, sellingRadiusMiles: sellingRadiusMiles != null ? Number(sellingRadiusMiles) : undefined,
  }, beaconId);
  res.status(201).json(item);
});

// PATCH /items/:id
router.patch('/:id', (req: Request, res: Response) => {
  const items = new ItemQueries();
  const { name, description, category, subcategory, image, sku, listingStatus, quantity,
    locationLat, locationLng, locationAddress, locationCity, locationState, locationZip, locationCountry,
    sellingScope, sellingRadiusMiles } = req.body;

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

  const updated = items.update(String(req.params.id), {
    name, description, category, subcategory, image, sku, listingStatus, quantity,
    locationLat: locationLat != null ? Number(locationLat) : locationLat,
    locationLng: locationLng != null ? Number(locationLng) : locationLng,
    locationAddress, locationCity, locationState, locationZip, locationCountry,
    sellingScope, sellingRadiusMiles: sellingRadiusMiles != null ? Number(sellingRadiusMiles) : sellingRadiusMiles,
  });
  if (!updated) return res.status(404).json({ error: 'Item not found' });

  // If item is synced to Reffo.ai, push update (fire-and-forget)
  if (updated.reffoSynced) {
    const syncManager = req.app.get('syncManager');
    if (syncManager) {
      syncManager.syncItem(updated.id).catch((err: Error) => {
        console.warn('[Sync] Auto re-sync failed for item', updated.id, err.message);
      });
    }
  }

  res.json(updated);
});

// DELETE /items/:id — soft archive (not hard delete)
router.delete('/:id', (req: Request, res: Response) => {
  const items = new ItemQueries();
  const negotiations = new NegotiationQueries();
  const itemId = String(req.params.id);

  const item = items.get(itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  // If item was synced, unsync it
  if (item.reffoSynced) {
    const syncManager = req.app.get('syncManager');
    if (syncManager) {
      syncManager.unsyncItem(itemId).catch(() => {});
    }
  }

  // Auto-reject any pending/countered negotiations for this item
  const pendingNegs = negotiations.listForItem(itemId).filter(
    n => n.status === 'pending' || n.status === 'countered'
  );
  for (const neg of pendingNegs) {
    negotiations.updateStatus(neg.id, 'rejected', undefined, 'Item is no longer available');
  }

  items.archive(itemId, 'deleted');
  res.status(204).send();
});

// POST /items/:id/restore — restore an archived item
router.post('/:id/restore', (req: Request, res: Response) => {
  const items = new ItemQueries();
  const itemId = String(req.params.id);

  const restored = items.restore(itemId);
  if (!restored) return res.status(404).json({ error: 'Archived item not found' });

  res.json(restored);
});

// DELETE /items/:id/permanent — hard delete (only for archived items)
router.delete('/:id/permanent', (req: Request, res: Response) => {
  const items = new ItemQueries();
  const media = new MediaQueries();
  const itemId = String(req.params.id);

  const item = items.get(itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.listingStatus !== 'archived_sold' && item.listingStatus !== 'archived_deleted') {
    return res.status(400).json({ error: 'Only archived items can be permanently deleted' });
  }

  // Get media file paths before deletion (CASCADE will remove DB records)
  const filePaths = media.deleteAllForItem(itemId);

  items.delete(itemId);

  // Clean up files from disk
  for (const fp of filePaths) {
    const fullPath = path.join(process.cwd(), fp);
    try {
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch {
      // File already gone
    }
  }

  // Try to remove the item's upload directory
  const itemDir = path.join(process.cwd(), 'uploads', itemId);
  try {
    if (fs.existsSync(itemDir)) fs.rmdirSync(itemDir);
  } catch {
    // Directory not empty or doesn't exist
  }

  res.status(204).send();
});

export default router;
