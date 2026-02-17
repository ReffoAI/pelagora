import { Router, Request, Response } from 'express';
import { ItemQueries } from '../db';
import { isValidCategory, isValidSubcategory } from '../taxonomy';
import type { ListingStatus } from '../types';

const VALID_LISTING_STATUSES: ListingStatus[] = ['private', 'for_sale', 'willing_to_sell'];

const router = Router();

// GET /items?category=...&subcategory=...&search=...
router.get('/', (req: Request, res: Response) => {
  const items = new ItemQueries();
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
  const { name, description, category, subcategory, image, sku, listingStatus } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }

  if (listingStatus !== undefined && !VALID_LISTING_STATUSES.includes(listingStatus)) {
    return res.status(400).json({ error: `Invalid listingStatus: ${listingStatus}. Must be one of: ${VALID_LISTING_STATUSES.join(', ')}` });
  }

  if (category && !isValidCategory(category)) {
    return res.status(400).json({ error: `Invalid category: ${category}` });
  }

  if (subcategory && category && !isValidSubcategory(category, subcategory)) {
    return res.status(400).json({ error: `Invalid subcategory: ${subcategory} for category: ${category}` });
  }

  const beaconId = req.app.get('beaconId') as string;
  const item = items.create({ name, description, category, subcategory, image, sku, listingStatus }, beaconId);
  res.status(201).json(item);
});

// PATCH /items/:id
router.patch('/:id', (req: Request, res: Response) => {
  const items = new ItemQueries();
  const { name, description, category, subcategory, image, sku, listingStatus } = req.body;

  if (listingStatus !== undefined && !VALID_LISTING_STATUSES.includes(listingStatus)) {
    return res.status(400).json({ error: `Invalid listingStatus: ${listingStatus}. Must be one of: ${VALID_LISTING_STATUSES.join(', ')}` });
  }

  if (category !== undefined && category !== '' && !isValidCategory(category)) {
    return res.status(400).json({ error: `Invalid category: ${category}` });
  }

  if (subcategory !== undefined && category && !isValidSubcategory(category, subcategory)) {
    return res.status(400).json({ error: `Invalid subcategory: ${subcategory} for category: ${category}` });
  }

  const updated = items.update(String(req.params.id), { name, description, category, subcategory, image, sku, listingStatus });
  if (!updated) return res.status(404).json({ error: 'Item not found' });
  res.json(updated);
});

// DELETE /items/:id
router.delete('/:id', (req: Request, res: Response) => {
  const items = new ItemQueries();
  const deleted = items.delete(String(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Item not found' });
  res.status(204).send();
});

export default router;
