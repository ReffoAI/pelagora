// Schema.org-based types with Reffo extensions
// See: https://schema.org/Product, https://schema.org/Offer

export type ListingStatus = 'private' | 'for_sale' | 'willing_to_sell';

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
  /** Reffo: beacon public key that owns this item */
  beaconId: string;
  /** Schema.org: dateCreated */
  createdAt: string;
  /** Schema.org: dateModified */
  updatedAt: string;
}

export type ItemCreate = Omit<Item, 'id' | 'beaconId' | 'createdAt' | 'updatedAt' | 'listingStatus'> & {
  listingStatus?: ListingStatus;
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

export interface PeerMessage {
  type: 'query' | 'response' | 'announce';
  beaconId: string;
  payload: unknown;
}

export interface QueryPayload {
  category?: string;
  subcategory?: string;
  search?: string;
  maxPrice?: number;
  currency?: string;
}

export interface AnnouncePayload {
  items: Pick<Item, 'id' | 'name' | 'category' | 'subcategory' | 'listingStatus'>[];
  offers: Pick<Offer, 'id' | 'itemId' | 'price' | 'priceCurrency' | 'status'>[];
}
