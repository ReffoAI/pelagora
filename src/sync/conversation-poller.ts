/**
 * ConversationPoller — Polls the Reffo webapp for new conversation messages
 * addressed to this beacon (buyer-role conversations). No API key required —
 * uses the public /api/network/conversations endpoint.
 */

import { ConversationQueries } from '../db/conversation-queries';
import { RefQueries } from '../db/queries';
import type { ChatMessageType } from '@pelagora/pim-protocol';

const DEFAULT_WEBAPP_URL = 'https://reffo.ai';
const POLL_INTERVAL = 5 * 1000; // 5 seconds for near-realtime chat

interface ConversationMessageResponse {
  conversationId: string;
  messageId: string;
  refId: string;
  refName: string;
  senderBeaconId: string;
  buyerBeaconId: string;
  sellerBeaconId: string;
  messageType: string;
  content: string | null;
  amount: number | null;
  currency: string;
  createdAt: string;
}

export class ConversationPoller {
  private baseUrl: string;
  private beaconId: string;
  private conversations: ConversationQueries;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastPollTime: string | null = null;

  constructor(beaconId: string, baseUrl?: string) {
    this.beaconId = beaconId;
    this.baseUrl = (baseUrl || DEFAULT_WEBAPP_URL).replace(/\/$/, '');
    this.conversations = new ConversationQueries();
  }

  start(): void {
    if (this.timer) return;

    // Initial poll
    this.pollAll().catch(() => {});

    console.log(`[ConversationPoller] Started (${POLL_INTERVAL / 1000}s interval)`);
    this.timer = setInterval(() => {
      this.pollAll().catch((err) => {
        console.error('[ConversationPoller] Poll error:', err instanceof Error ? err.message : err);
      });
    }, POLL_INTERVAL);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async pollAll(): Promise<{ received: number }> {
    let received = 0;

    try {
      const params = new URLSearchParams({ beaconId: this.beaconId });
      if (this.lastPollTime) {
        params.set('since', this.lastPollTime);
      }

      const res = await fetch(
        `${this.baseUrl}/api/network/conversations?${params.toString()}`
      );
      if (!res.ok) return { received };

      const data = await res.json() as { messages?: ConversationMessageResponse[] };
      const messages = data.messages || [];

      // Track the latest message timestamp to use as the next `since` cursor
      let latestTimestamp = this.lastPollTime;

      for (const msg of messages) {
        try {
          // Track the newest message timestamp we've seen
          if (!latestTimestamp || msg.createdAt > latestTimestamp) {
            latestTimestamp = msg.createdAt;
          }

          // Skip messages we sent ourselves
          if (msg.senderBeaconId === this.beaconId) continue;

          // Determine our role: check if we own the item (seller) or not (buyer).
          // We can't rely on buyerBeaconId matching because the webapp stores
          // the remote beacon's ID in buyer_beacon_id regardless of actual role.
          const refs = new RefQueries();
          const ownedRef = refs.get(msg.refId);
          const isSeller = !!ownedRef; // If we have this item in our inventory, we're the seller
          const counterpartId = isSeller ? msg.buyerBeaconId : msg.sellerBeaconId;
          const role = isSeller ? 'seller' : 'buyer';

          // Ensure the conversation exists locally
          const conversation = this.conversations.getOrCreate(
            msg.refId,
            msg.refName,
            counterpartId,
            role,
          );

          // Check if we already have this message
          const existingMessages = this.conversations.getMessages(conversation.id);
          const alreadyExists = existingMessages.some(m => m.id === msg.messageId);
          if (alreadyExists) continue;

          // Add the message to the local conversation
          this.conversations.addMessage({
            id: msg.messageId,
            conversationId: conversation.id,
            senderBeaconId: msg.senderBeaconId,
            messageType: msg.messageType as ChatMessageType,
            content: msg.content || undefined,
            amount: msg.amount || undefined,
            currency: msg.currency || 'USD',
          });

          received++;
          console.log(
            `[ConversationPoller] Added message ${msg.messageId} to conversation ${conversation.id}`
          );
        } catch (innerErr) {
          console.error('[ConversationPoller] Message processing error:', innerErr instanceof Error ? innerErr.message : innerErr);
        }
      }

      // Advance cursor to the latest message we've seen (not current time)
      if (latestTimestamp) {
        this.lastPollTime = latestTimestamp;
      }
    } catch (err) {
      console.error('[ConversationPoller] Poll error:', err instanceof Error ? err.message : err);
    }

    if (received > 0) {
      console.log(`[ConversationPoller] Received ${received} new message(s)`);
    }

    return { received };
  }
}
