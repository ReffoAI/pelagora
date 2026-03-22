import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { NegotiationQueries, RefQueries } from '../db';
import type { DhtDiscovery } from '../dht/discovery';
import type { SyncManager } from '../sync';
import type { NegotiationStatus } from '@pelagora/pim-protocol';
import { sanitizeObject } from '@pelagora/pim-protocol';

type DeliveryChannel = 'dht' | 'webapp' | 'none';

const router = Router();

// GET /negotiations?role=buyer|seller|resolved|archived
router.get('/', (req: Request, res: Response) => {
  const negotiations = new NegotiationQueries();
  const role = String(req.query.role || '');

  if (role === 'buyer') {
    return res.json(negotiations.listOutgoing());
  }
  if (role === 'seller') {
    return res.json(negotiations.listIncoming());
  }
  if (role === 'resolved') {
    return res.json(negotiations.listResolved());
  }
  if (role === 'archived') {
    return res.json(negotiations.listArchived());
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

  const { refId, refName, sellerBeaconId, price, priceCurrency, message } = sanitizeObject(req.body);

  if (!refId || typeof refId !== 'string') {
    return res.status(400).json({ error: 'refId is required' });
  }
  if (!sellerBeaconId || typeof sellerBeaconId !== 'string') {
    return res.status(400).json({ error: 'sellerBeaconId is required' });
  }
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'price must be a positive number' });
  }
  if (beaconId === sellerBeaconId) {
    return res.status(400).json({ error: 'Cannot send a proposal to yourself' });
  }

  const negotiationId = uuid();
  const syncManager: SyncManager | undefined = req.app.get('syncManager');

  let deliveredVia: DeliveryChannel = 'none';

  // Try to send via DHT first
  if (dht) {
    const sent = dht.sendToPeer(sellerBeaconId, {
      type: 'proposal',
      beaconId,
      payload: {
        negotiationId,
        refId,
        refName: refName || '',
        price,
        priceCurrency: priceCurrency || 'USD',
        message: message || '',
      },
    });

    if (sent) {
      deliveredVia = 'dht';
    }
  }

  // If DHT delivery failed, try to route through the webapp as a fallback
  if (deliveredVia === 'none' && syncManager) {
    const result = await syncManager.pushIncomingProposal({
      negotiationId,
      refId,
      refName: refName || '',
      buyerBeaconId: beaconId,
      price,
      priceCurrency: priceCurrency || 'USD',
      message: message || '',
    });

    if (result.ok) {
      deliveredVia = 'webapp';
    }
  }

  // If SyncManager fallback didn't work, try direct HTTP to webapp (no API key needed)
  if (deliveredVia === 'none') {
    const reffoUrl = (process.env.REFFO_API_URL || process.env.REFFO_WEBAPP_URL || 'https://reffo.ai').replace(/\/$/, '');
    try {
      const resp = await fetch(`${reffoUrl}/api/network/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negotiationId,
          refId,
          refName: refName || '',
          buyerBeaconId: beaconId,
          sellerBeaconId,
          price,
          priceCurrency: priceCurrency || 'USD',
          message: message || '',
        }),
      });
      if (resp.ok) {
        deliveredVia = 'webapp';
      }
    } catch {
      // Direct HTTP failed too
    }
  }

  // If no channel worked, reject
  if (deliveredVia === 'none') {
    return res.status(503).json({ error: 'Seller is not reachable. They may be offline.' });
  }

  // Create buyer-side record
  const negotiation = negotiations.create({
    id: negotiationId,
    refId,
    refName: refName || '',
    buyerBeaconId: beaconId,
    sellerBeaconId,
    price,
    priceCurrency: priceCurrency || 'USD',
    message: message || '',
    role: 'buyer',
  });

  res.status(201).json({ ...negotiation, deliveredVia });
});

// PATCH /negotiations/:id/respond — seller accepts/rejects/counters
router.patch('/:id/respond', async (req: Request, res: Response) => {
  const negotiations = new NegotiationQueries();
  const beaconId = req.app.get('beaconId') as string;
  const dht: DhtDiscovery | undefined = req.app.get('dht');

  const { status, counterPrice, responseMessage } = sanitizeObject(req.body);
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

  // When accepting, include next-steps guidance for the buyer
  const nextStepsMessage = status === 'accepted'
    ? (responseMessage || 'Offer accepted! Next steps: 1) Use the chat to exchange contact details or arrange a meet-up. 2) Agree on your preferred payment method. 3) Complete the exchange in person or ship the item.')
    : (responseMessage || '');

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
        responseMessage: nextStepsMessage,
      },
    });
  }

  const updated = negotiations.updateStatus(negId, status, counterPrice, nextStepsMessage);

  // Push response back to webapp (fire-and-forget)
  const syncManager: SyncManager | undefined = req.app.get('syncManager');
  if (syncManager) {
    syncManager.pushOfferResponse(
      negId,
      status,
      status === 'countered' ? counterPrice : undefined,
      nextStepsMessage,
    ).catch(() => {});
  }

  // Auto-reject other pending/countered offers for the same ref when one is accepted
  if (status === 'accepted') {
    const siblings = negotiations.listPendingForRef(negotiation.refId, negId);
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
  const refs = new RefQueries();
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

  // Decrement ref quantity
  const newQuantity = refs.decrementQuantity(negotiation.refId);

  // If quantity reaches 0, archive the ref
  if (newQuantity === 0) {
    refs.archive(negotiation.refId, 'sold');
    // Unsync if synced
    const ref = refs.get(negotiation.refId);
    if (ref && syncManager) {
      syncManager.unsyncItem(negotiation.refId).catch(() => {});
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

// PATCH /negotiations/:id/archive — move to archive
router.patch('/:id/archive', (req: Request, res: Response) => {
  const negotiations = new NegotiationQueries();
  const negId = String(req.params.id);
  const negotiation = negotiations.get(negId);
  if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });

  const updated = negotiations.archive(negId);
  res.json(updated);
});

// PATCH /negotiations/:id/unarchive — restore from archive
router.patch('/:id/unarchive', (req: Request, res: Response) => {
  const negotiations = new NegotiationQueries();
  const negId = String(req.params.id);
  const negotiation = negotiations.get(negId);
  if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });

  const updated = negotiations.unarchive(negId);
  res.json(updated);
});

// DELETE /negotiations/:id — permanently delete
router.delete('/:id', (req: Request, res: Response) => {
  const negotiations = new NegotiationQueries();
  const negId = String(req.params.id);
  const negotiation = negotiations.get(negId);
  if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });

  negotiations.delete(negId);
  res.json({ ok: true });
});

export default router;
