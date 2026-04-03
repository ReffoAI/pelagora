import { Router, Request, Response } from 'express';
import { FavoriteQueries } from '../db';
import { sanitizeObject } from '@pelagora/pim-protocol';

const router = Router();

// GET /favorites — list all favorites
router.get('/', (_req: Request, res: Response) => {
  const favorites = new FavoriteQueries();
  res.json(favorites.list());
});

// GET /favorites/ids — return array of "refId:beaconId" strings for quick card overlay
router.get('/ids', (_req: Request, res: Response) => {
  const favorites = new FavoriteQueries();
  res.json(favorites.listKeys());
});

// POST /favorites/toggle — toggle favorite on/off
router.post('/toggle', (req: Request, res: Response) => {
  const favorites = new FavoriteQueries();
  const { refId, refName, beaconId, offerPrice, offerCurrency, listingStatus, category, subcategory, locationCity, locationState, locationZip, imageUrl } = sanitizeObject(req.body);

  if (!refId || typeof refId !== 'string') {
    return res.status(400).json({ error: 'refId is required' });
  }
  if (!beaconId || typeof beaconId !== 'string') {
    return res.status(400).json({ error: 'beaconId is required' });
  }

  const result = favorites.toggle({ refId, refName, beaconId, offerPrice, offerCurrency, listingStatus, category, subcategory, locationCity, locationState, locationZip, imageUrl });
  res.json(result);
});

// DELETE /favorites — remove by refId + beaconId
router.delete('/', (req: Request, res: Response) => {
  const favorites = new FavoriteQueries();
  const { refId, beaconId } = req.body;

  if (!refId || typeof refId !== 'string') {
    return res.status(400).json({ error: 'refId is required' });
  }
  if (!beaconId || typeof beaconId !== 'string') {
    return res.status(400).json({ error: 'beaconId is required' });
  }

  const removed = favorites.remove(refId, beaconId);
  res.json({ removed });
});

export default router;
