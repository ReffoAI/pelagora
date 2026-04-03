import { Router, Request, Response } from 'express';
import { CollectionQueries } from '../db';
import { sanitizeObject } from '@pelagora/pim-protocol';

const router = Router();

// GET /collections
router.get('/', (_req: Request, res: Response) => {
  const collections = new CollectionQueries();
  const list = collections.list();
  const result = list.map(c => ({
    ...c,
    refCount: collections.countRefs(c.id),
  }));
  res.json(result);
});

// POST /collections
router.post('/', (req: Request, res: Response) => {
  const collections = new CollectionQueries();
  const { name, description } = sanitizeObject(req.body);

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }

  const collection = collections.create({ name, description });
  res.status(201).json({
    ...collection,
    refCount: 0,
  });
});

// GET /collections/:id
router.get('/:id', (req: Request, res: Response) => {
  const collections = new CollectionQueries();
  const collection = collections.get(String(req.params.id));
  if (!collection) return res.status(404).json({ error: 'Collection not found' });

  res.json({
    ...collection,
    refCount: collections.countRefs(collection.id),
  });
});

// PATCH /collections/:id
router.patch('/:id', (req: Request, res: Response) => {
  const collections = new CollectionQueries();
  const { name, description } = sanitizeObject(req.body);

  const updated = collections.update(String(req.params.id), { name, description });
  if (!updated) return res.status(404).json({ error: 'Collection not found' });

  res.json({
    ...updated,
    refCount: collections.countRefs(updated.id),
  });
});

// DELETE /collections/:id
router.delete('/:id', (req: Request, res: Response) => {
  const collections = new CollectionQueries();
  const deleted = collections.delete(String(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Collection not found' });

  res.status(204).send();
});

// GET /collections/:id/refs
router.get('/:id/refs', (req: Request, res: Response) => {
  const collections = new CollectionQueries();
  const collection = collections.get(String(req.params.id));
  if (!collection) return res.status(404).json({ error: 'Collection not found' });

  res.json(collections.listRefs(collection.id));
});

export default router;
