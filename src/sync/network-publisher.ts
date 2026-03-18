/**
 * NetworkPublisher — Auto-publishes public items to reffo.ai for discovery
 * by search engines, AI bots, and the broader web. No API key required.
 *
 * Separate from SyncManager (which handles user-account-linked sync).
 */

import type { Ref, Offer } from '@pelagora/pim-protocol';
import { blurLocation } from '@pelagora/pim-protocol';
import { RefQueries, OfferQueries, SettingsQueries } from '../db';

const DEFAULT_WEBAPP_URL = 'https://reffo.ai';
const RECONCILE_INTERVAL = 10 * 60 * 1000; // 10 minutes
const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

export interface NetworkMessage {
  id: string;
  refId: string;
  senderName?: string;
  senderEmail?: string;
  message: string;
  createdAt: string;
}

export interface PublishResult {
  published: number;
  items: Array<{ localId: string; webappUrl: string }>;
}

export class NetworkPublisher {
  private beaconId: string;
  private baseUrl: string;
  private reconcileTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private refs: RefQueries;
  private offers: OfferQueries;
  private settings: SettingsQueries;

  constructor(beaconId: string, baseUrl?: string) {
    this.beaconId = beaconId;
    this.baseUrl = (baseUrl || DEFAULT_WEBAPP_URL).replace(/\/$/, '');
    this.refs = new RefQueries();
    this.offers = new OfferQueries();
    this.settings = new SettingsQueries();
  }

  private isEnabled(): boolean {
    const settings = this.settings.get();
    return settings?.networkPublishEnabled !== false;
  }

  async publishItem(ref: Ref, offers: Offer[]): Promise<{ ok: boolean; webappUrl?: string; error?: string }> {
    if (!this.isEnabled()) return { ok: false, error: 'Network publishing disabled' };

    try {
      const activeOffer = offers.find(o => o.status === 'active');
      const blurred = (ref.locationLat != null && ref.locationLng != null)
        ? blurLocation(ref.locationLat, ref.locationLng) : null;

      const res = await fetch(`${this.baseUrl}/api/network/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beaconId: this.beaconId,
          items: [{
            localId: ref.id,
            name: ref.name,
            description: ref.description,
            category: ref.category,
            subcategory: ref.subcategory,
            listingStatus: ref.listingStatus,
            quantity: ref.quantity,
            price: activeOffer?.price,
            priceCurrency: activeOffer?.priceCurrency || 'USD',
            locationLat: blurred?.lat,
            locationLng: blurred?.lng,
            locationCity: ref.locationCity,
            locationState: ref.locationState,
            locationZip: ref.locationZip,
            locationCountry: ref.locationCountry,
            sellingScope: ref.sellingScope,
            sellingRadiusMiles: ref.sellingRadiusMiles,
            condition: ref.condition,
            attributes: ref.attributes,
            rentalTerms: ref.rentalTerms,
            rentalDeposit: ref.rentalDeposit,
            rentalDuration: ref.rentalDuration,
            rentalDurationUnit: ref.rentalDurationUnit,
          }],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
        return { ok: false, error: (data.error as string) || `HTTP ${res.status}` };
      }

      const data = await res.json() as PublishResult;
      const item = data.items?.[0];

      // Mark as published locally and store share URL
      this.refs.setNetworkPublished(ref.id, true);
      if (item?.webappUrl) {
        this.refs.setShareUrl(ref.id, item.webappUrl);
      }

      return { ok: true, webappUrl: item?.webappUrl };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  async unpublishItem(refId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/network/publish`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beaconId: this.beaconId,
          itemIds: [refId],
        }),
      });

      // Mark as unpublished locally regardless of remote result
      this.refs.setNetworkPublished(refId, false);

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
        return { ok: false, error: (data.error as string) || `HTTP ${res.status}` };
      }

      return { ok: true };
    } catch (err) {
      // Still mark as unpublished locally
      this.refs.setNetworkPublished(refId, false);
      return { ok: false, error: (err as Error).message };
    }
  }

  async reconcile(): Promise<{ published: number; removed: number; errors: string[] }> {
    const errors: string[] = [];
    let published = 0;
    let removed = 0;

    if (!this.isEnabled()) {
      // Unpublish everything if disabled
      const publishedRefs = this.refs.listNetworkPublished();
      for (const ref of publishedRefs) {
        const result = await this.unpublishItem(ref.id);
        if (result.ok) removed++;
        else if (result.error) errors.push(`unpublish ${ref.id}: ${result.error}`);
      }
      return { published, removed, errors };
    }

    // Get all discoverable refs and all currently-published refs
    const discoverable = this.refs.listDiscoverable();
    const currentlyPublished = this.refs.listNetworkPublished();

    const discoverableIds = new Set(discoverable.map(r => r.id));
    const publishedIds = new Set(currentlyPublished.map(r => r.id));

    // Publish new/updated discoverable refs
    for (const ref of discoverable) {
      if (!publishedIds.has(ref.id)) {
        const refOffers = this.offers.list(ref.id).filter(o => o.status === 'active');
        const result = await this.publishItem(ref, refOffers);
        if (result.ok) published++;
        else if (result.error) errors.push(`publish ${ref.id}: ${result.error}`);
      }
    }

    // Unpublish refs that are no longer discoverable
    for (const ref of currentlyPublished) {
      if (!discoverableIds.has(ref.id)) {
        const result = await this.unpublishItem(ref.id);
        if (result.ok) removed++;
        else if (result.error) errors.push(`unpublish ${ref.id}: ${result.error}`);
      }
    }

    return { published, removed, errors };
  }

  async heartbeat(): Promise<NetworkMessage[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/network/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beaconId: this.beaconId }),
      });

      if (!res.ok) return [];

      const data = await res.json() as { ok: boolean; messages?: NetworkMessage[] };
      return data.messages || [];
    } catch {
      return [];
    }
  }

  startReconciliation(intervalMs?: number): void {
    // Run initial reconciliation
    this.reconcile().then(result => {
      if (result.published > 0 || result.removed > 0) {
        console.log(`[Network] Reconciled: ${result.published} published, ${result.removed} removed`);
      }
      if (result.errors.length > 0) {
        console.warn(`[Network] Reconciliation errors:`, result.errors.slice(0, 3));
      }
    }).catch(err => {
      console.warn('[Network] Reconciliation failed:', err.message);
    });

    // Schedule periodic reconciliation
    this.reconcileTimer = setInterval(() => {
      this.reconcile().catch(err => {
        console.warn('[Network] Reconciliation failed:', err.message);
      });
    }, intervalMs || RECONCILE_INTERVAL);
  }

  startHeartbeat(intervalMs?: number): void {
    this.heartbeatTimer = setInterval(async () => {
      const messages = await this.heartbeat();
      if (messages.length > 0) {
        this.storeMessages(messages);
        console.log(`[Network] Received ${messages.length} message(s) from webapp`);
      }
    }, intervalMs || HEARTBEAT_INTERVAL);
  }

  private storeMessages(messages: NetworkMessage[]): void {
    const { getDb } = require('../db/schema');
    const db = getDb();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO network_messages (id, ref_id, sender_name, sender_email, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const msg of messages) {
      stmt.run(msg.id, msg.refId, msg.senderName || null, msg.senderEmail || null, msg.message, msg.createdAt);
    }
  }

  stop(): void {
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer);
      this.reconcileTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
