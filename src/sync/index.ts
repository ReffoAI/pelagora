/**
 * SyncManager: orchestrates syncing beacon refs to Reffo.ai
 */

import { ReffoClient, type WebappRef } from './reffo-client';
import { RefQueries, OfferQueries, MediaQueries, NegotiationQueries } from '../db/queries';
import { ConversationQueries } from '../db/conversation-queries';
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
  private baseUrl: string;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private refs: RefQueries;
  private offers: OfferQueries;
  private media: MediaQueries;
  private negotiations: NegotiationQueries;
  private conversations: ConversationQueries;
  private lastOfferPoll: string | null = null;
  private lastRefPull: string | null = null;
  public registered: boolean = false;
  public lastError: string | null = null;
  public latestVersion: string | null = null;
  public updateAvailable: boolean = false;

  constructor(apiKey: string, beaconId: string, baseUrl?: string) {
    this.client = new ReffoClient(apiKey, baseUrl);
    this.beaconId = beaconId;
    this.baseUrl = (baseUrl || 'https://reffo.ai').replace(/\/$/, '');
    this.refs = new RefQueries();
    this.offers = new OfferQueries();
    this.media = new MediaQueries();
    this.negotiations = new NegotiationQueries();
    this.conversations = new ConversationQueries();
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

  async pullRefs(): Promise<{ pulled: number; updated: number; errors: string[] }> {
    let pulled = 0;
    let updated = 0;
    const errors: string[] = [];

    try {
      const result = await this.client.fetchRefs(this.lastRefPull || undefined);
      if (!result.ok || !result.refs) {
        errors.push(result.error || 'Unknown error fetching refs');
        return { pulled, updated, errors };
      }

      for (const webRef of result.refs) {
        try {
          const existing = this.refs.get(webRef.id);
          const loc = webRef.location_data;

          if (existing) {
            // Update existing local ref
            this.refs.update(webRef.id, {
              name: webRef.name,
              description: webRef.description || '',
              category: webRef.category || '',
              subcategory: webRef.subcategory || '',
              listingStatus: webRef.listing_status as 'private' | 'for_sale' | 'willing_to_sell' | 'for_rent',
              quantity: webRef.quantity || 1,
              condition: webRef.condition || undefined,
              attributes: webRef.attributes || undefined,
              locationCity: loc?.city || undefined,
              locationState: loc?.state || undefined,
              locationZip: loc?.zip || undefined,
              locationCountry: loc?.country || undefined,
              locationLat: loc?.lat,
              locationLng: loc?.lng,
              sellingScope: webRef.selling_scope as 'global' | 'national' | 'range' | undefined,
              sellingRadiusMiles: webRef.selling_radius_miles || undefined,
              rentalTerms: webRef.rental_terms || undefined,
              rentalDeposit: webRef.rental_deposit || undefined,
              rentalDuration: webRef.rental_duration || undefined,
              rentalDurationUnit: webRef.rental_duration_unit as 'hours' | 'days' | 'weeks' | 'months' | undefined,
            });
            // Keep it synced
            this.refs.setSynced(webRef.id, true, webRef.id);
            updated++;
          } else {
            // Create new local ref from webapp data
            // We use a direct insert with the webapp's ID to maintain the mapping
            this.refs.createWithId(webRef.id, {
              name: webRef.name,
              description: webRef.description || '',
              category: webRef.category || '',
              subcategory: webRef.subcategory || '',
              sku: webRef.sku || undefined,
              listingStatus: webRef.listing_status as 'private' | 'for_sale' | 'willing_to_sell' | 'for_rent',
              quantity: webRef.quantity || 1,
              condition: webRef.condition || undefined,
              attributes: webRef.attributes || undefined,
              locationCity: loc?.city || undefined,
              locationState: loc?.state || undefined,
              locationZip: loc?.zip || undefined,
              locationCountry: loc?.country || undefined,
              locationLat: loc?.lat,
              locationLng: loc?.lng,
              sellingScope: webRef.selling_scope as 'global' | 'national' | 'range' | undefined,
              sellingRadiusMiles: webRef.selling_radius_miles || undefined,
              rentalTerms: webRef.rental_terms || undefined,
              rentalDeposit: webRef.rental_deposit || undefined,
              rentalDuration: webRef.rental_duration || undefined,
              rentalDurationUnit: webRef.rental_duration_unit as 'hours' | 'days' | 'weeks' | 'months' | undefined,
            }, this.beaconId);
            // Mark as synced
            this.refs.setSynced(webRef.id, true, webRef.id);
            pulled++;
          }

          // Handle offer/price: create or update active offer
          if (webRef.price != null && webRef.price > 0) {
            const existingOffers = this.offers.list(webRef.id);
            const activeOffer = existingOffers.find(o => o.status === 'active');
            if (activeOffer) {
              this.offers.update(activeOffer.id, { price: webRef.price, priceCurrency: webRef.currency || 'USD' });
            } else {
              this.offers.create({
                refId: webRef.id,
                price: webRef.price,
                priceCurrency: webRef.currency || 'USD',
              }, this.beaconId);
            }
          }
        } catch (err) {
          errors.push(`Ref ${webRef.id}: ${(err as Error).message}`);
        }
      }

      this.lastRefPull = new Date().toISOString();
    } catch (err) {
      errors.push((err as Error).message);
    }

    if (pulled > 0 || updated > 0) {
      console.log(`[Sync] Pulled ${pulled} new ref(s), updated ${updated} ref(s) from Reffo.ai`);
    }

    return { pulled, updated, errors };
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

      // Track the earliest skipped offer so we don't advance the poll
      // timestamp past offers we couldn't process yet
      let earliestSkippedAt: string | null = null;

      for (const offer of result.offers) {
        // Check if we already have this negotiation
        const existing = this.negotiations.get(offer.id);
        if (existing) continue;

        // Map the offer's item_id back to a local ref
        const localRef = syncedRefMap.get(offer.item_id);
        if (!localRef) {
          console.warn(`[Sync] Offer ${offer.id} references unknown ref ${offer.item_id}, skipping`);
          if (!earliestSkippedAt || offer.created_at < earliestSkippedAt) {
            earliestSkippedAt = offer.created_at;
          }
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

      // Only advance poll timestamp if no offers were skipped; otherwise
      // rewind to just before the earliest skipped offer so it's retried
      if (earliestSkippedAt) {
        const rewindMs = new Date(earliestSkippedAt).getTime() - 1000;
        this.lastOfferPoll = new Date(rewindMs).toISOString();
        console.warn(`[Sync] ${errors.length || 'Some'} offer(s) skipped — rewinding poll timestamp to retry`);
      } else {
        this.lastOfferPoll = new Date().toISOString();
      }
    } catch (err) {
      errors.push((err as Error).message);
    }

    if (received > 0) {
      console.log(`[Sync] Received ${received} new offer(s)`);
    }

    return { received, errors };
  }

  async pushIncomingProposal(proposal: {
    negotiationId: string;
    refId: string;
    refName: string;
    buyerBeaconId: string;
    price: number;
    priceCurrency: string;
    message: string;
  }): Promise<{ ok: boolean; error?: string }> {
    try {
      const result = await this.client.pushProposal(proposal);
      if (!result.ok) {
        console.warn(`[Sync] Failed to push incoming proposal ${proposal.negotiationId}: ${result.error}`);
      } else {
        console.log(`[Sync] Pushed incoming proposal ${proposal.negotiationId} to webapp`);
      }
      return result;
    } catch (err) {
      const msg = (err as Error).message;
      console.warn(`[Sync] Failed to push incoming proposal ${proposal.negotiationId}: ${msg}`);
      return { ok: false, error: msg };
    }
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

  async pushConversationMessage(data: {
    conversationId: string;
    messageId: string;
    refId: string;
    refName: string;
    buyerBeaconId: string;
    sellerBeaconId?: string;
    messageType: string;
    content?: string;
    amount?: number;
    currency?: string;
  }): Promise<{ ok: boolean; error?: string }> {
    try {
      const url = `${this.baseUrl}/api/network/conversations`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: data.conversationId,
          messageId: data.messageId,
          refId: data.refId,
          refName: data.refName,
          buyerBeaconId: data.buyerBeaconId,
          sellerBeaconId: data.sellerBeaconId,
          messageType: data.messageType,
          content: data.content,
          amount: data.amount,
          currency: data.currency,
        }),
      });

      if (!res.ok) {
        const body = await res.json() as Record<string, unknown>;
        const error = (body.error as string) || `HTTP ${res.status}`;
        console.warn(`[Sync] Failed to push conversation message ${data.messageId}: ${error}`);
        return { ok: false, error };
      }

      console.log(`[Sync] Pushed conversation message ${data.messageId} to webapp`);
      return { ok: true };
    } catch (err) {
      const msg = (err as Error).message;
      console.warn(`[Sync] Failed to push conversation message ${data.messageId}: ${msg}`);
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

    // Initial heartbeat + ref pull then offer poll (refs must be pulled first
    // so pollOffers can match item_ids to local refs)
    this.client.heartbeat(this.beaconId)
      .then(async (result) => {
        this.handleHeartbeatResult(result);
        await this.pullRefs();
        await this.pollOffers();
      })
      .catch(() => {});

    this.heartbeatInterval = setInterval(() => {
      this.client.heartbeat(this.beaconId)
        .then(async (result) => {
          this.handleHeartbeatResult(result);
          await this.pullRefs();
          await this.pollOffers();
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
