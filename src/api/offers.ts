import { Router, Request, Response } from 'express';
import { OfferQueries, RefQueries } from '../db';
import { sanitizeObject } from '@reffo/protocol';

const router = Router();

// GET /offers?refId=...
router.get('/', (req: Request, res: Response) => {
  const offers = new OfferQueries();
  const refId = String(req.query.refId || '') || undefined;
  res.json(offers.list(refId));
});

// GET /offers/:id
router.get('/:id', (req: Request, res: Response) => {
  const offers = new OfferQueries();
  const offer = offers.get(String(req.params.id));
  if (!offer) return res.status(404).json({ error: 'Offer not found' });
  res.json(offer);
});

// POST /offers
router.post('/', (req: Request, res: Response) => {
  const offers = new OfferQueries();
  const refs = new RefQueries();
  const { refId, price, priceCurrency, status, location } = sanitizeObject(req.body);

  if (!refId || typeof refId !== 'string') {
    return res.status(400).json({ error: 'refId is required' });
  }
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'price must be a non-negative number' });
  }

  const ref = refs.get(refId);
  if (!ref) return res.status(404).json({ error: 'Ref not found' });

  const sellerId = req.app.get('beaconId') as string;
  const offer = offers.create({ refId, price, priceCurrency, status, location }, sellerId);
  res.status(201).json(offer);
});

// PATCH /offers/:id
router.patch('/:id', (req: Request, res: Response) => {
  const offers = new OfferQueries();
  const { price, priceCurrency, status, location } = sanitizeObject(req.body);
  const updated = offers.update(String(req.params.id), { price, priceCurrency, status, location });
  if (!updated) return res.status(404).json({ error: 'Offer not found' });
  res.json(updated);
});

// DELETE /offers/:id
router.delete('/:id', (req: Request, res: Response) => {
  const offers = new OfferQueries();
  const deleted = offers.delete(String(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Offer not found' });
  res.status(204).send();
});

export default router;
