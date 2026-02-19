import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { NegotiationQueries, ItemQueries } from '../db';
import type { DhtDiscovery } from '../dht/discovery';
import type { SyncManager } from '../sync';
import type { NegotiationStatus } from '../types';

const router = Router();

// GET /negotiations?role=buyer|seller
router.get('/', (req: Request, res: Response) => {
  const negotiations = new NegotiationQueries();
  const role = String(req.query.role || '');

  if (role === 'buyer') {
    return res.json(negotiations.listOutgoing());
  }
  if (role === 'seller') {
    return res.json(negotiations.listIncoming());
  }

  // Return all if no role filter
  const incoming = negotiations.listIncoming();
  const outgoing = negotiations.listOutgoing();
  res.json([...incoming, ...outgoing]);
});

// GET /negotiations/:id
router.get('/:id', (req: Request, res: Response) => {
  const negotiations = new NegotiationQueries();
  const neg = negotiations.get(String(req.params.id));
  if (!neg) return res.status(404).json({ error: 'Negotiation not found' });
  res.json(neg);
});

// POST /negotiations — buyer creates proposal and sends via DHT
router.post('/', async (req: Request, res: Response) => {
  const negotiations = new NegotiationQueries();
  const beaconId = req.app.get('beaconId') as string;
  const dht: DhtDiscovery | undefined = req.app.get('dht');

  const { itemId, itemName, sellerBeaconId, price, priceCurrency, message } = req.body;

  if (!itemId || typeof itemId !== 'string') {
    return res.status(400).json({ error: 'itemId is required' });
  }
  if (!sellerBeaconId || typeof sellerBeaconId !== 'string') {
    return res.status(400).json({ error: 'sellerBeaconId is required' });
  }
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'price must be a positive number' });
  }

  const negotiationId = uuid();

  // Try to send via DHT first
  if (dht) {
    const sent = dht.sendToPeer(sellerBeaconId, {
      type: 'proposal',
      beaconId,
      payload: {
        negotiationId,
        itemId,
        itemName: itemName || '',
        price,
        priceCurrency: priceCurrency || 'USD',
        message: message || '',
      },
    });

    if (!sent) {
      return res.status(503).json({ error: 'Seller is not online. Try again later.' });
    }
  }

  // Create buyer-side record
  const negotiation = negotiations.create({
    id: negotiationId,
    itemId,
    itemName: itemName || '',
    buyerBeaconId: beaconId,
    sellerBeaconId,
    price,
    priceCurrency: priceCurrency || 'USD',
    message: message || '',
    role: 'buyer',
  });

  res.status(201).json(negotiation);
});

// PATCH /negotiations/:id/respond — seller accepts/rejects/counters
router.patch('/:id/respond', async (req: Request, res: Response) => {
  const negotiations = new NegotiationQueries();
  const beaconId = req.app.get('beaconId') as string;
  const dht: DhtDiscovery | undefined = req.app.get('dht');

  const { status, counterPrice, responseMessage } = req.body;
  const validStatuses: NegotiationStatus[] = ['accepted', 'rejected', 'countered'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  if (status === 'countered' && (typeof counterPrice !== 'number' || counterPrice <= 0)) {
    return res.status(400).json({ error: 'counterPrice is required for counter offers' });
  }

  const negId = String(req.params.id);
  const negotiation = negotiations.get(negId);
  if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });
  if (negotiation.role !== 'seller') return res.status(403).json({ error: 'Only the seller can respond' });
  if (negotiation.status !== 'pending') return res.status(400).json({ error: 'Can only respond to pending negotiations' });

  // Send response via DHT
  let delivered = false;
  if (dht) {
    delivered = dht.sendToPeer(negotiation.buyerBeaconId, {
      type: 'proposal_response',
      beaconId,
      payload: {
        negotiationId: negotiation.id,
        status,
        counterPrice: status === 'countered' ? counterPrice : undefined,
        responseMessage: responseMessage || '',
      },
    });
  }

  const updated = negotiations.updateStatus(negId, status, counterPrice, responseMessage);

  // Push response back to webapp (fire-and-forget)
  const syncManager: SyncManager | undefined = req.app.get('syncManager');
  if (syncManager) {
    syncManager.pushOfferResponse(
      negId,
      status,
      status === 'countered' ? counterPrice : undefined,
      responseMessage,
    ).catch(() => {});
  }

  // Auto-reject other pending/countered offers for the same item when one is accepted
  if (status === 'accepted') {
    const siblings = negotiations.listPendingForItem(negotiation.itemId, negId);
    for (const sib of siblings) {
      negotiations.updateStatus(sib.id, 'rejected', undefined, 'Another offer was accepted');
      // Notify buyer via DHT
      if (dht) {
        dht.sendToPeer(sib.buyerBeaconId, {
          type: 'proposal_response',
          beaconId,
          payload: {
            negotiationId: sib.id,
            status: 'rejected',
            responseMessage: 'Another offer was accepted',
          },
        });
      }
      // Push to webapp (fire-and-forget)
      if (syncManager) {
        syncManager.pushOfferResponse(
          sib.id,
          'rejected',
          undefined,
          'Another offer was accepted',
        ).catch(() => {});
      }
    }
  }

  res.json({ ...updated, delivered });
});

// PATCH /negotiations/:id/mark-sold — seller marks accepted offer as sold
router.patch('/:id/mark-sold', async (req: Request, res: Response) => {
  const negotiations = new NegotiationQueries();
  const items = new ItemQueries();
  const beaconId = req.app.get('beaconId') as string;
  const dht: DhtDiscovery | undefined = req.app.get('dht');
  const syncManager: SyncManager | undefined = req.app.get('syncManager');

  const negId = String(req.params.id);
  const negotiation = negotiations.get(negId);
  if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });
  if (negotiation.role !== 'seller') return res.status(403).json({ error: 'Only the seller can mark as sold' });
  if (negotiation.status !== 'accepted') return res.status(400).json({ error: 'Can only mark accepted negotiations as sold' });

  // Update negotiation status to sold
  const updated = negotiations.updateStatus(negId, 'sold');

  // Decrement item quantity
  const newQuantity = items.decrementQuantity(negotiation.itemId);

  // If quantity reaches 0, archive the item
  if (newQuantity === 0) {
    items.archive(negotiation.itemId, 'sold');
    // Unsync if synced
    const item = items.get(negotiation.itemId);
    if (item && syncManager) {
      syncManager.unsyncItem(negotiation.itemId).catch(() => {});
    }
  }

  // Push sold status to webapp
  if (syncManager) {
    syncManager.pushOfferResponse(negId, 'sold').catch(() => {});
  }

  // Notify buyer via DHT
  if (dht) {
    dht.sendToPeer(negotiation.buyerBeaconId, {
      type: 'proposal_response',
      beaconId,
      payload: {
        negotiationId: negotiation.id,
        status: 'sold',
      },
    });
  }

  res.json(updated);
});

// PATCH /negotiations/:id/withdraw — buyer withdraws pending proposal
router.patch('/:id/withdraw', (req: Request, res: Response) => {
  const negotiations = new NegotiationQueries();

  const negId = String(req.params.id);
  const negotiation = negotiations.get(negId);
  if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });
  if (negotiation.role !== 'buyer') return res.status(403).json({ error: 'Only the buyer can withdraw' });
  if (negotiation.status !== 'pending') return res.status(400).json({ error: 'Can only withdraw pending negotiations' });

  const updated = negotiations.updateStatus(negId, 'withdrawn');
  res.json(updated);
});

export default router;
