/**
 * HTTP client for communicating with the Reffo.ai sync API.
 * Uses Node 20 built-in fetch.
 */

import fs from 'fs';
import path from 'path';
import type { Item, Offer, ItemMedia } from '../types';

const DEFAULT_BASE_URL = 'https://reffo.ai';

export interface WebappOffer {
  id: string;
  item_id: string;
  buyer_id: string;
  seller_id: string;
  item_name: string;
  amount: number;
  currency: string;
  message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export class ReffoClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}/api/sync${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    return res;
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await this.request('/beacon', { method: 'GET' });
      if (res.ok) return { ok: true };
      const data = await res.json() as Record<string, unknown>;
      return { ok: false, error: (data.error as string) || `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  async registerBeacon(beaconId: string, name: string, version: string, url?: string): Promise<{ ok: boolean; data?: unknown; error?: string }> {
    try {
      const res = await this.request('/beacon', {
        method: 'POST',
        body: JSON.stringify({ beacon_id: beaconId, name, version, url }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) return { ok: false, error: (data.error as string) || `HTTP ${res.status}` };
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  async pushItem(
    beaconId: string,
    item: Item,
    offers: Offer[],
  ): Promise<{ ok: boolean; refId?: string; error?: string }> {
    try {
      const activeOffer = offers.find(o => o.status === 'active');
      const res = await this.request('/items', {
        method: 'POST',
        body: JSON.stringify({
          localId: item.id,
          beaconId,
          name: item.name,
          description: item.description,
          category: item.category,
          subcategory: item.subcategory,
          listingStatus: item.listingStatus,
          quantity: item.quantity,
          price: activeOffer?.price,
          priceCurrency: activeOffer?.priceCurrency || 'USD',
        }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) return { ok: false, error: (data.error as string) || `HTTP ${res.status}` };
      return { ok: true, refId: (data.id as string) || item.id };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  async pushMedia(
    itemId: string,
    media: ItemMedia,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const fullPath = path.join(process.cwd(), media.filePath);
      if (!fs.existsSync(fullPath)) {
        return { ok: false, error: `File not found: ${media.filePath}` };
      }

      const fileBuffer = fs.readFileSync(fullPath);
      const blob = new Blob([fileBuffer], { type: media.mimeType });

      const formData = new FormData();
      formData.append('file', blob, path.basename(media.filePath));
      formData.append('mediaType', media.mediaType);
      formData.append('sort_order', String(media.sortOrder));

      const url = `${this.baseUrl}/api/sync/items/${itemId}/media`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json() as Record<string, unknown>;
        return { ok: false, error: (data.error as string) || `HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  async removeItem(localId: string, beaconId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await this.request('/items', {
        method: 'DELETE',
        body: JSON.stringify({ localId, beaconId }),
      });
      if (!res.ok) {
        const data = await res.json() as Record<string, unknown>;
        return { ok: false, error: (data.error as string) || `HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  async fetchOffers(since?: string): Promise<{ ok: boolean; offers?: WebappOffer[]; error?: string }> {
    try {
      const params = since ? `?since=${encodeURIComponent(since)}` : '';
      const res = await this.request(`/offers${params}`, { method: 'GET' });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) return { ok: false, error: (data.error as string) || `HTTP ${res.status}` };
      return { ok: true, offers: (data.offers as WebappOffer[]) || [] };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  async heartbeat(beaconId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await this.request('/heartbeat', {
        method: 'POST',
        body: JSON.stringify({ beaconId }),
      });
      if (!res.ok) {
        const data = await res.json() as Record<string, unknown>;
        return { ok: false, error: (data.error as string) || `HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}
