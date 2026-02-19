/**
 * SyncManager: orchestrates syncing beacon items to Reffo.ai
 */

import { ReffoClient } from './reffo-client';
import { ItemQueries, OfferQueries, MediaQueries, NegotiationQueries } from '../db/queries';

export class SyncManager {
  private client: ReffoClient;
  private beaconId: string;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private items: ItemQueries;
  private offers: OfferQueries;
  private media: MediaQueries;
  private negotiations: NegotiationQueries;
  private lastOfferPoll: string | null = null;
  public registered: boolean = false;

  constructor(apiKey: string, beaconId: string, baseUrl?: string) {
    this.client = new ReffoClient(apiKey, baseUrl);
    this.beaconId = beaconId;
    this.items = new ItemQueries();
    this.offers = new OfferQueries();
    this.media = new MediaQueries();
    this.negotiations = new NegotiationQueries();
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    return this.client.testConnection();
  }

  async registerBeacon(name: string, version: string, url?: string): Promise<{ ok: boolean; error?: string }> {
    const result = await this.client.registerBeacon(this.beaconId, name, version, url);
    return { ok: result.ok, error: result.error };
  }

  async syncItem(itemId: string): Promise<{ ok: boolean; warning?: string; error?: string }> {
    const item = this.items.get(itemId);
    if (!item) return { ok: false, error: 'Item not found' };

    // Always mark synced locally
    this.items.setSynced(itemId, true);

    // Try to push to remote (non-blocking — local sync succeeds regardless)
    let warning: string | undefined;
    try {
      const offers = this.offers.list(itemId);
      const result = await this.client.pushItem(this.beaconId, item, offers);

      if (result.ok) {
        this.items.setSynced(itemId, true, result.refId);

        // Push media
        const mediaList = this.media.listForItem(itemId);
        for (const m of mediaList) {
          const mediaResult = await this.client.pushMedia(itemId, m);
          if (!mediaResult.ok) {
            console.warn(`[Sync] Media push failed for ${m.id}: ${mediaResult.error}`);
          }
        }
      } else {
        warning = `Marked for sync locally. Remote push pending: ${result.error}`;
        console.warn(`[Sync] Remote push failed for ${itemId}: ${result.error}`);
      }
    } catch (err) {
      warning = `Marked for sync locally. Remote push pending: ${(err as Error).message}`;
      console.warn(`[Sync] Remote push failed for ${itemId}:`, (err as Error).message);
    }

    return { ok: true, warning };
  }

  async unsyncItem(itemId: string): Promise<{ ok: boolean; warning?: string; error?: string }> {
    const item = this.items.get(itemId);
    if (!item) return { ok: false, error: 'Item not found' };

    // Always mark unsynced locally
    this.items.setSynced(itemId, false);

    // Try to remove from remote (non-blocking)
    let warning: string | undefined;
    try {
      const result = await this.client.removeItem(itemId, this.beaconId);
      if (!result.ok) {
        warning = `Removed locally. Remote removal pending: ${result.error}`;
        console.warn(`[Sync] Remote remove failed for ${itemId}: ${result.error}`);
      }
    } catch (err) {
      warning = `Removed locally. Remote removal pending: ${(err as Error).message}`;
      console.warn(`[Sync] Remote remove failed for ${itemId}:`, (err as Error).message);
    }

    return { ok: true, warning };
  }

  async syncAll(): Promise<{ synced: number; errors: string[] }> {
    const syncedItems = this.items.listSynced();
    let synced = 0;
    const errors: string[] = [];

    for (const item of syncedItems) {
      const result = await this.syncItem(item.id);
      if (result.ok) {
        synced++;
      } else {
        errors.push(`${item.name}: ${result.error}`);
      }
    }

    return { synced, errors };
  }

  async pollOffers(): Promise<{ received: number; errors: string[] }> {
    let received = 0;
    const errors: string[] = [];

    try {
      const result = await this.client.fetchOffers(this.lastOfferPoll || undefined);
      if (!result.ok || !result.offers) {
        errors.push(result.error || 'Unknown error fetching offers');
        return { received, errors };
      }

      // Build a map of synced items: local item ID -> item (keyed by local ID which is also the ref ID on webapp)
      const syncedItems = this.items.listSynced();
      const syncedItemMap = new Map(syncedItems.map(item => [item.id, item]));

      for (const offer of result.offers) {
        // Check if we already have this negotiation
        const existing = this.negotiations.get(offer.id);
        if (existing) continue;

        // Map the offer's item_id back to a local item
        const localItem = syncedItemMap.get(offer.item_id);
        if (!localItem) {
          console.warn(`[Sync] Offer ${offer.id} references unknown item ${offer.item_id}, skipping`);
          continue;
        }

        try {
          this.negotiations.create({
            id: offer.id,
            itemId: localItem.id,
            itemName: offer.item_name || localItem.name,
            buyerBeaconId: offer.buyer_id,
            sellerBeaconId: this.beaconId,
            price: offer.amount,
            priceCurrency: offer.currency || 'USD',
            message: offer.message || '',
            role: 'seller',
            status: 'pending',
          });
          received++;
          console.log(`[Sync] Received offer ${offer.id} for item "${localItem.name}"`);
        } catch (err) {
          errors.push(`Offer ${offer.id}: ${(err as Error).message}`);
        }
      }

      // Update last poll timestamp
      this.lastOfferPoll = new Date().toISOString();
    } catch (err) {
      errors.push((err as Error).message);
    }

    if (received > 0) {
      console.log(`[Sync] Received ${received} new offer(s)`);
    }

    return { received, errors };
  }

  startHeartbeat(intervalMs = 5 * 60 * 1000): void {
    if (this.heartbeatInterval) return;

    // Initial heartbeat + offer poll
    this.client.heartbeat(this.beaconId)
      .then(() => this.pollOffers())
      .catch(() => {});

    this.heartbeatInterval = setInterval(() => {
      this.client.heartbeat(this.beaconId)
        .then(() => this.pollOffers())
        .catch((err) => {
          console.warn('[Sync] Heartbeat failed:', err.message);
        });
    }, intervalMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
