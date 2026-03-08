/**
 * HTTP client for communicating with the Reffo.ai sync API.
 * Uses Node 20 built-in fetch.
 */

import fs from 'fs';
import path from 'path';
import type { Ref, Offer, RefMedia } from '@reffo/protocol';
import { blurLocation } from '@reffo/protocol';

const DEFAULT_BASE_URL = 'https://reffo.ai';

export interface ReffoSearchParams {
  search?: string;
  category?: string;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface ReffoSearchResult {
  refId: string;
  localId: string;
  beaconId: string;
  name: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  listingStatus: string;
  price: number | null;
  currency: string;
  condition: string | null;
  location: { city: string | null; state: string | null; zip: string | null } | null;
  distanceMiles: number | null;
  photos: string[];
  createdAt: string;
}

export async function searchReffo(
  params: ReffoSearchParams,
  baseUrl?: string,
): Promise<{ results: ReffoSearchResult[]; total: number }> {
  const base = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const qs = new URLSearchParams();
  if (params.search) qs.set('q', params.search);
  if (params.category) qs.set('category', params.category);
  if (params.lat != null) qs.set('lat', String(params.lat));
  if (params.lng != null) qs.set('lng', String(params.lng));
  if (params.radiusMiles != null) qs.set('radius', String(params.radiusMiles));
  if (params.sort) qs.set('sort', params.sort);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));

  const res = await fetch(`${base}/api/search?${qs.toString()}`);
  if (!res.ok) {
    return { results: [], total: 0 };
  }
  const data = await res.json() as { results: ReffoSearchResult[]; total: number };
  return data;
}

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
    ref: Ref,
    offers: Offer[],
  ): Promise<{ ok: boolean; refId?: string; error?: string }> {
    try {
      const activeOffer = offers.find(o => o.status === 'active');
      const blurred = (ref.locationLat != null && ref.locationLng != null)
        ? blurLocation(ref.locationLat, ref.locationLng) : null;
      const res = await this.request('/refs', {
        method: 'POST',
        body: JSON.stringify({
          localId: ref.id,
          beaconId,
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
          rentalTerms: ref.rentalTerms,
          rentalDeposit: ref.rentalDeposit,
          rentalDuration: ref.rentalDuration,
          rentalDurationUnit: ref.rentalDurationUnit,
        }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) return { ok: false, error: (data.error as string) || `HTTP ${res.status}` };
      return { ok: true, refId: (data.id as string) || ref.id };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  async pushMedia(
    refId: string,
    media: RefMedia,
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

      const url = `${this.baseUrl}/api/sync/refs/${refId}/media`;
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
      const res = await this.request('/refs', {
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

  async pushOfferResponse(
    offerId: string,
    status: string,
    counterAmount?: number,
    responseMessage?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const body: Record<string, unknown> = { offerId, status };
      if (counterAmount != null) body.counterAmount = counterAmount;
      if (responseMessage) body.responseMessage = responseMessage;

      const res = await this.request('/offer-responses', {
        method: 'POST',
        body: JSON.stringify(body),
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

  async heartbeat(beaconId: string): Promise<{ ok: boolean; latestVersion?: string; error?: string }> {
    try {
      const res = await this.request('/heartbeat', {
        method: 'POST',
        body: JSON.stringify({ beaconId }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        return { ok: false, error: (data.error as string) || `HTTP ${res.status}` };
      }
      return {
        ok: true,
        latestVersion: (data.latest_version as string) || undefined,
      };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}
