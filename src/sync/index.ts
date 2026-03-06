/**
 * SyncManager: orchestrates syncing beacon refs to Reffo.ai
 */

import { ReffoClient } from './reffo-client';
import { RefQueries, OfferQueries, MediaQueries, NegotiationQueries } from '../db/queries';
import { getVersion } from '../version';
import { setUpdateInfo } from '../api/health';

function semverNewer(remote: string, local: string): boolean {
  const r = remote.split('.').map(Number);
  const l = local.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}

export class SyncManager {
  private client: ReffoClient;
  private beaconId: string;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private refs: RefQueries;
  private offers: OfferQueries;
  private media: MediaQueries;
  private negotiations: NegotiationQueries;
  private lastOfferPoll: string | null = null;
  public registered: boolean = false;
  public lastError: string | null = null;
  public latestVersion: string | null = null;
  public updateAvailable: boolean = false;

  constructor(apiKey: string, beaconId: string, baseUrl?: string) {
    this.client = new ReffoClient(apiKey, baseUrl);
    this.beaconId = beaconId;
    this.refs = new RefQueries();
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

  async syncItem(refId: string): Promise<{ ok: boolean; warning?: string; error?: string }> {
    const ref = this.refs.get(refId);
    if (!ref) return { ok: false, error: 'Ref not found' };

    // Always mark synced locally
    this.refs.setSynced(refId, true);

    // Try to push to remote (non-blocking — local sync succeeds regardless)
    let warning: string | undefined;
    try {
      const offers = this.offers.list(refId);
      const result = await this.client.pushItem(this.beaconId, ref, offers);

      if (result.ok) {
        this.refs.setSynced(refId, true, result.refId);

        // Push media
        const mediaList = this.media.listForRef(refId);
        for (const m of mediaList) {
          const mediaResult = await this.client.pushMedia(refId, m);
          if (!mediaResult.ok) {
            console.warn(`[Sync] Media push failed for ${m.id}: ${mediaResult.error}`);
          }
        }
      } else {
        warning = `Marked for sync locally. Remote push pending: ${result.error}`;
        console.warn(`[Sync] Remote push failed for ${refId}: ${result.error}`);
      }
    } catch (err) {
      warning = `Marked for sync locally. Remote push pending: ${(err as Error).message}`;
      console.warn(`[Sync] Remote push failed for ${refId}:`, (err as Error).message);
    }

    return { ok: true, warning };
  }

  async unsyncItem(refId: string): Promise<{ ok: boolean; warning?: string; error?: string }> {
    const ref = this.refs.get(refId);
    if (!ref) return { ok: false, error: 'Ref not found' };

    // Always mark unsynced locally
    this.refs.setSynced(refId, false);

    // Try to remove from remote (non-blocking)
    let warning: string | undefined;
    try {
      const result = await this.client.removeItem(refId, this.beaconId);
      if (!result.ok) {
        warning = `Removed locally. Remote removal pending: ${result.error}`;
        console.warn(`[Sync] Remote remove failed for ${refId}: ${result.error}`);
      }
    } catch (err) {
      warning = `Removed locally. Remote removal pending: ${(err as Error).message}`;
      console.warn(`[Sync] Remote remove failed for ${refId}:`, (err as Error).message);
    }

    return { ok: true, warning };
  }

  async syncAll(): Promise<{ synced: number; errors: string[] }> {
    const syncedRefs = this.refs.listSynced();
    let synced = 0;
    const errors: string[] = [];

    for (const ref of syncedRefs) {
      const result = await this.syncItem(ref.id);
      if (result.ok) {
        synced++;
      } else {
        errors.push(`${ref.name}: ${result.error}`);
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

      // Build a map of synced refs: local ref ID -> ref (keyed by local ID which is also the ref ID on webapp)
      const syncedRefs = this.refs.listSynced();
      const syncedRefMap = new Map(syncedRefs.map(ref => [ref.id, ref]));

      for (const offer of result.offers) {
        // Check if we already have this negotiation
        const existing = this.negotiations.get(offer.id);
        if (existing) continue;

        // Map the offer's item_id back to a local ref
        const localRef = syncedRefMap.get(offer.item_id);
        if (!localRef) {
          console.warn(`[Sync] Offer ${offer.id} references unknown ref ${offer.item_id}, skipping`);
          continue;
        }

        try {
          this.negotiations.create({
            id: offer.id,
            refId: localRef.id,
            refName: offer.item_name || localRef.name,
            buyerBeaconId: offer.buyer_id,
            sellerBeaconId: this.beaconId,
            price: offer.amount,
            priceCurrency: offer.currency || 'USD',
            message: offer.message || '',
            role: 'seller',
            status: 'pending',
          });
          received++;
          console.log(`[Sync] Received offer ${offer.id} for ref "${localRef.name}"`);
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

  async pushOfferResponse(
    offerId: string,
    status: string,
    counterAmount?: number,
    responseMessage?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const result = await this.client.pushOfferResponse(offerId, status, counterAmount, responseMessage);
      if (!result.ok) {
        console.warn(`[Sync] Failed to push offer response for ${offerId}: ${result.error}`);
      } else {
        console.log(`[Sync] Pushed offer response for ${offerId}: ${status}`);
      }
      return result;
    } catch (err) {
      const msg = (err as Error).message;
      console.warn(`[Sync] Failed to push offer response for ${offerId}: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  private handleHeartbeatResult(result: { ok: boolean; latestVersion?: string }): void {
    if (result.ok && result.latestVersion) {
      const local = getVersion();
      const newer = semverNewer(result.latestVersion, local);
      this.latestVersion = result.latestVersion;
      this.updateAvailable = newer;
      setUpdateInfo({ available: newer, version: result.latestVersion });
    }
  }

  startHeartbeat(intervalMs = 5 * 60 * 1000): void {
    if (this.heartbeatInterval) return;

    // Initial heartbeat + offer poll
    this.client.heartbeat(this.beaconId)
      .then((result) => {
        this.handleHeartbeatResult(result);
        return this.pollOffers();
      })
      .catch(() => {});

    this.heartbeatInterval = setInterval(() => {
      this.client.heartbeat(this.beaconId)
        .then((result) => {
          this.handleHeartbeatResult(result);
          return this.pollOffers();
        })
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
