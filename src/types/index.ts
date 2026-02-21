// Schema.org-based types with Reffo extensions
// See: https://schema.org/Product, https://schema.org/Offer

export type ListingStatus = 'private' | 'for_sale' | 'willing_to_sell' | 'archived_sold' | 'archived_deleted';

export type SellingScope = 'global' | 'national' | 'range';

export interface Item {
  id: string;
  /** Schema.org: name */
  name: string;
  /** Schema.org: description */
  description: string;
  /** Schema.org: category */
  category: string;
  /** Reffo: subcategory within category */
  subcategory: string;
  /** Schema.org: image (URL) */
  image?: string;
  /** Schema.org: sku */
  sku?: string;
  /** Reffo: listing visibility status */
  listingStatus: ListingStatus;
  /** Reffo: quantity available */
  quantity: number;
  /** Reffo: whether this item is synced to reffo.ai */
  reffoSynced: boolean;
  /** Reffo: the ref ID on reffo.ai (if synced) */
  reffoRefId?: string;
  /** Location: latitude */
  locationLat?: number;
  /** Location: longitude */
  locationLng?: number;
  /** Location: street address (stored locally only, never shared) */
  locationAddress?: string;
  /** Location: city */
  locationCity?: string;
  /** Location: state/province */
  locationState?: string;
  /** Location: zip/postal code */
  locationZip?: string;
  /** Location: country code */
  locationCountry?: string;
  /** Selling scope */
  sellingScope?: SellingScope;
  /** Selling radius in miles (when scope = 'range') */
  sellingRadiusMiles?: number;
  /** Reffo: beacon public key that owns this item */
  beaconId: string;
  /** Schema.org: dateCreated */
  createdAt: string;
  /** Schema.org: dateModified */
  updatedAt: string;
}

export type ItemCreate = Omit<Item, 'id' | 'beaconId' | 'createdAt' | 'updatedAt' | 'listingStatus' | 'quantity' | 'reffoSynced' | 'reffoRefId'> & {
  listingStatus?: ListingStatus;
  quantity?: number;
};

export type ItemUpdate = Partial<ItemCreate>;

export type OfferStatus = 'active' | 'sold' | 'withdrawn';

export interface Offer {
  id: string;
  /** The item being offered */
  itemId: string;
  /** Schema.org: price */
  price: number;
  /** Schema.org: priceCurrency (ISO 4217) */
  priceCurrency: string;
  /** Schema.org: availability */
  status: OfferStatus;
  /** Schema.org: seller (beacon public key) */
  sellerId: string;
  /** Schema.org: availableAtOrFrom */
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export type OfferCreate = Omit<Offer, 'id' | 'sellerId' | 'createdAt' | 'updatedAt' | 'status'> & {
  status?: OfferStatus;
};

export type OfferUpdate = Partial<Omit<OfferCreate, 'itemId'>>;

export interface BeaconSettings {
  id: string;
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  locationCity?: string;
  locationState?: string;
  locationZip?: string;
  locationCountry?: string;
  defaultSellingScope: SellingScope;
  defaultSellingRadiusMiles: number;
}

export interface BeaconInfo {
  id: string;
  version: string;
  itemCount: number;
  offerCount: number;
  uptime: number;
  dht: {
    connected: boolean;
    peers: number;
  };
}

// Media types
export type MediaType = 'photo' | 'video';

export interface ItemMedia {
  id: string;
  itemId: string;
  mediaType: MediaType;
  filePath: string;
  mimeType: string;
  fileSize: number;
  sortOrder: number;
  createdAt: string;
}

// Negotiation types
export type NegotiationStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn' | 'sold';
export type NegotiationRole = 'buyer' | 'seller';

export interface Negotiation {
  id: string;
  itemId: string;
  itemName: string;
  buyerBeaconId: string;
  sellerBeaconId: string;
  price: number;
  priceCurrency: string;
  message: string;
  status: NegotiationStatus;
  role: NegotiationRole;
  counterPrice?: number;
  responseMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export type NegotiationCreate = Omit<Negotiation, 'createdAt' | 'updatedAt' | 'status' | 'counterPrice' | 'responseMessage'> & {
  status?: NegotiationStatus;
};

// DHT payloads for negotiations
export interface ProposalPayload {
  negotiationId: string;
  itemId: string;
  itemName: string;
  price: number;
  priceCurrency: string;
  message: string;
}

export interface ProposalResponsePayload {
  negotiationId: string;
  status: NegotiationStatus;
  counterPrice?: number;
  responseMessage?: string;
}

export interface PeerMessage {
  type: 'query' | 'response' | 'announce' | 'proposal' | 'proposal_response';
  beaconId: string;
  payload: unknown;
}

export interface QueryPayload {
  category?: string;
  subcategory?: string;
  search?: string;
  maxPrice?: number;
  currency?: string;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
}

export interface AnnouncePayload {
  items: (Pick<Item, 'id' | 'name' | 'category' | 'subcategory' | 'listingStatus'> & {
    locationLat?: number;
    locationLng?: number;
    locationCity?: string;
    locationState?: string;
    locationZip?: string;
    locationCountry?: string;
    sellingScope?: SellingScope;
    sellingRadiusMiles?: number;
  })[];
  offers: Pick<Offer, 'id' | 'itemId' | 'price' | 'priceCurrency' | 'status'>[];
}

/** Blur lat/lng to ~0.7 mile / zip-code precision */
export function blurLocation(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  };
}

/** Haversine distance in miles between two lat/lng points */
export function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
