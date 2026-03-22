import { Router, Request, Response } from 'express';
import { ConversationQueries } from '../db/conversation-queries';
import type { DhtDiscovery } from '../dht/discovery';
import type { SyncManager } from '../sync';
import { sanitizeObject } from '@pelagora/pim-protocol';
import type { ChatMessageType } from '@pelagora/pim-protocol';

type DeliveryChannel = 'dht' | 'webapp' | 'none';

const router = Router();

// GET /conversations?role=buyer|seller|closed
router.get('/', (req: Request, res: Response) => {
  const conversations = new ConversationQueries();
  const role = String(req.query.role || '');

  const validRoles = ['buyer', 'seller', 'closed'];
  const list = conversations.list(validRoles.includes(role) ? role : undefined);
  res.json(list);
});

// GET /conversations/:id — get with all messages
router.get('/:id', (req: Request, res: Response) => {
  const conversations = new ConversationQueries();
  const conv = conversations.get(String(req.params.id));
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const messages = conversations.getMessages(conv.id);
  res.json({ ...conv, messages });
});

// GET /conversations/:id/messages — get messages for a conversation
router.get('/:id/messages', (req: Request, res: Response) => {
  const conversations = new ConversationQueries();
  const conv = conversations.get(String(req.params.id));
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const messages = conversations.getMessages(conv.id);
  res.json(messages);
});

// POST /conversations — buyer creates conversation + first message
router.post('/', async (req: Request, res: Response) => {
  const conversations = new ConversationQueries();
  const beaconId = req.app.get('beaconId') as string;
  const dht: DhtDiscovery | undefined = req.app.get('dht');
  const syncManager: SyncManager | undefined = req.app.get('syncManager');

  const { refId, refName, sellerBeaconId, messageType, content, amount, currency } = sanitizeObject(req.body);

  if (!refId || typeof refId !== 'string') {
    return res.status(400).json({ error: 'refId is required' });
  }
  if (!sellerBeaconId || typeof sellerBeaconId !== 'string') {
    return res.status(400).json({ error: 'sellerBeaconId is required' });
  }
  if (!messageType || typeof messageType !== 'string') {
    return res.status(400).json({ error: 'messageType is required' });
  }
  if (beaconId === sellerBeaconId) {
    return res.status(400).json({ error: 'Cannot message yourself' });
  }

  // Create or get existing conversation
  const conversation = conversations.getOrCreate(refId, refName || '', sellerBeaconId, 'buyer');

  // Add first message
  const message = conversations.addMessage({
    conversationId: conversation.id,
    senderBeaconId: beaconId,
    messageType: messageType as ChatMessageType,
    content: content || undefined,
    amount: typeof amount === 'number' ? amount : undefined,
    currency: currency || undefined,
  });

  let deliveredVia: DeliveryChannel = 'none';

  // Try to send via DHT first
  if (dht) {
    const sent = dht.sendToPeer(sellerBeaconId, {
      type: 'chat_message',
      beaconId,
      payload: {
        conversationId: conversation.id,
        messageId: message.id,
        refId,
        refName: refName || '',
        messageType,
        content: content || '',
        amount: typeof amount === 'number' ? amount : undefined,
        currency: currency || undefined,
      },
    });

    if (sent) {
      deliveredVia = 'dht';
    }
  }

  // If DHT delivery failed, try SyncManager fallback
  if (deliveredVia === 'none' && syncManager) {
    try {
      const result = await syncManager.pushConversationMessage({
        conversationId: conversation.id,
        messageId: message.id,
        refId,
        refName: refName || '',
        buyerBeaconId: beaconId,
        messageType,
        content: content || '',
        amount: typeof amount === 'number' ? amount : undefined,
        currency: currency || undefined,
      });

      if (result.ok) {
        deliveredVia = 'webapp';
      }
    } catch {
      // SyncManager fallback failed
    }
  }

  // If SyncManager fallback didn't work, try direct HTTP to webapp
  if (deliveredVia === 'none') {
    const reffoUrl = (process.env.REFFO_API_URL || process.env.REFFO_WEBAPP_URL || 'https://reffo.ai').replace(/\/$/, '');
    try {
      const resp = await fetch(`${reffoUrl}/api/network/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          messageId: message.id,
          refId,
          refName: refName || '',
          buyerBeaconId: beaconId,
          sellerBeaconId,
          messageType,
          content: content || '',
          amount: typeof amount === 'number' ? amount : undefined,
          currency: currency || undefined,
        }),
      });
      if (resp.ok) {
        deliveredVia = 'webapp';
      }
    } catch {
      // Direct HTTP failed too
    }
  }

  res.status(201).json({ conversation, message, deliveredVia });
});

// POST /conversations/:id/messages — send message in existing conversation
router.post('/:id/messages', async (req: Request, res: Response) => {
  const conversations = new ConversationQueries();
  const beaconId = req.app.get('beaconId') as string;
  const dht: DhtDiscovery | undefined = req.app.get('dht');
  const syncManager: SyncManager | undefined = req.app.get('syncManager');

  const convId = String(req.params.id);
  const conv = conversations.get(convId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  if (conv.status !== 'open') return res.status(400).json({ error: 'Conversation is closed' });

  const { messageType, content, amount, currency } = sanitizeObject(req.body);

  if (!messageType || typeof messageType !== 'string') {
    return res.status(400).json({ error: 'messageType is required' });
  }

  // When seller accepts an offer, include next-steps guidance in the accept message
  const nextStepsContent = messageType === 'accept'
    ? (content || 'Offer accepted! Next steps: 1) Use this chat to exchange contact details or arrange a meet-up. 2) Agree on your preferred payment method. 3) Complete the exchange in person or ship the item. 4) Mark the item as "Sold" in your inventory.')
    : (content || undefined);

  const message = conversations.addMessage({
    conversationId: convId,
    senderBeaconId: beaconId,
    messageType: messageType as ChatMessageType,
    content: nextStepsContent,
    amount: typeof amount === 'number' ? amount : undefined,
    currency: currency || undefined,
  });

  // Send via DHT to counterpart
  let deliveredVia: DeliveryChannel = 'none';
  if (dht) {
    const sent = dht.sendToPeer(conv.counterpartBeaconId, {
      type: 'chat_message',
      beaconId,
      payload: {
        conversationId: convId,
        messageId: message.id,
        refId: conv.refId,
        refName: conv.refName,
        messageType,
        content: content || '',
        amount: typeof amount === 'number' ? amount : undefined,
        currency: currency || undefined,
      },
    });
    if (sent) deliveredVia = 'dht';
  }

  // If DHT failed, try pushing to webapp
  if (deliveredVia === 'none') {
    const reffoUrl = (process.env.REFFO_WEBAPP_URL || process.env.REFFO_API_URL || 'https://reffo.ai').replace(/\/$/, '');
    try {
      const resp = await fetch(`${reffoUrl}/api/network/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          messageId: message.id,
          refId: conv.refId,
          refName: conv.refName,
          // If we're the seller, counterpart is the buyer; if we're the buyer, we are the buyer
          buyerBeaconId: conv.role === 'seller' ? conv.counterpartBeaconId : beaconId,
          sellerBeaconId: conv.role === 'seller' ? beaconId : conv.counterpartBeaconId,
          senderBeaconId: beaconId,
          messageType,
          content: content || '',
          amount: typeof amount === 'number' ? amount : undefined,
          currency: currency || undefined,
        }),
      });
      if (resp.ok) deliveredVia = 'webapp';
    } catch {
      // Direct HTTP failed
    }
  }

  // Auto-reject pattern: if this is an 'accept' message, close other open conversations for the same ref
  if (messageType === 'accept') {
    const siblings = conversations.listForRef(conv.refId);
    for (const sib of siblings) {
      if (sib.id !== convId && sib.status === 'open') {
        conversations.close(sib.id, beaconId);
        // Add reject message to sibling conversation
        conversations.addMessage({
          conversationId: sib.id,
          senderBeaconId: beaconId,
          messageType: 'reject',
          content: 'Another offer was accepted',
        });
        // Notify counterpart via DHT
        if (dht) {
          dht.sendToPeer(sib.counterpartBeaconId, {
            type: 'chat_message',
            beaconId,
            payload: {
              conversationId: sib.id,
              refId: sib.refId,
              refName: sib.refName,
              messageType: 'reject',
              content: 'Another offer was accepted',
            },
          });
        }
        // Push to webapp (fire-and-forget)
        if (syncManager) {
          syncManager.pushConversationMessage({
            conversationId: sib.id,
            messageId: '',
            refId: sib.refId,
            refName: sib.refName,
            buyerBeaconId: sib.counterpartBeaconId,
            messageType: 'reject',
            content: 'Another offer was accepted',
          }).catch(() => {});
        }
      }
    }
  }

  res.status(201).json({ message, deliveredVia });
});

// PATCH /conversations/:id/close — close conversation
router.patch('/:id/close', (req: Request, res: Response) => {
  const conversations = new ConversationQueries();
  const beaconId = req.app.get('beaconId') as string;

  const convId = String(req.params.id);
  const conv = conversations.get(convId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  if (conv.status === 'closed') return res.status(400).json({ error: 'Conversation is already closed' });

  const updated = conversations.close(convId, beaconId);
  res.json(updated);
});

// PATCH /conversations/:id/reopen — reopen conversation
router.patch('/:id/reopen', (req: Request, res: Response) => {
  const conversations = new ConversationQueries();

  const convId = String(req.params.id);
  const conv = conversations.get(convId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  if (conv.status !== 'closed') return res.status(400).json({ error: 'Conversation is not closed' });

  const updated = conversations.reopen(convId);
  res.json(updated);
});

// DELETE /conversations/:id — permanently delete
router.delete('/:id', (req: Request, res: Response) => {
  const conversations = new ConversationQueries();

  const convId = String(req.params.id);
  const conv = conversations.get(convId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  conversations.delete(convId);
  res.json({ ok: true });
});

export default router;
