import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { getDb } from './schema';
import type { Item, ItemCreate, ItemUpdate, ListingStatus, Offer, OfferCreate, OfferUpdate, ItemMedia, MediaType, Negotiation, NegotiationCreate, NegotiationStatus, NegotiationRole, BeaconSettings, SellingScope } from '../types';

function rowToItem(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    category: row.category as string,
    subcategory: row.subcategory as string,
    image: row.image as string | undefined,
    sku: row.sku as string | undefined,
    listingStatus: row.listing_status as ListingStatus,
    quantity: (row.quantity as number) || 1,
    reffoSynced: !!(row.reffo_synced as number),
    reffoRefId: row.reffo_ref_id as string | undefined,
    locationLat: row.location_lat as number | undefined,
    locationLng: row.location_lng as number | undefined,
    locationAddress: row.location_address as string | undefined,
    locationCity: row.location_city as string | undefined,
    locationState: row.location_state as string | undefined,
    locationZip: row.location_zip as string | undefined,
    locationCountry: row.location_country as string | undefined,
    sellingScope: (row.selling_scope as SellingScope) || undefined,
    sellingRadiusMiles: row.selling_radius_miles as number | undefined,
    beaconId: row.beacon_id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToOffer(row: Record<string, unknown>): Offer {
  return {
    id: row.id as string,
    itemId: row.item_id as string,
    price: row.price as number,
    priceCurrency: row.price_currency as string,
    status: row.status as Offer['status'],
    sellerId: row.seller_id as string,
    location: row.location as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export class ItemQueries {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || getDb();
  }

  list(category?: string, subcategory?: string): Item[] {
    let sql = 'SELECT * FROM items';
    const conditions: string[] = ["listing_status NOT IN ('archived_sold', 'archived_deleted')"];
    const params: string[] = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (subcategory) {
      conditions.push('subcategory = ?');
      params.push(subcategory);
    }
    sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params);
    return rows.map(r => rowToItem(r as Record<string, unknown>));
  }

  get(id: string): Item | undefined {
    const row = this.db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    return row ? rowToItem(row as Record<string, unknown>) : undefined;
  }

  create(data: ItemCreate, beaconId: string): Item {
    const id = uuid();
    const now = new Date().toISOString();

    // Apply default location from settings if not provided
    let locLat = data.locationLat ?? null;
    let locLng = data.locationLng ?? null;
    let locAddress = data.locationAddress ?? null;
    let locCity = data.locationCity ?? null;
    let locState = data.locationState ?? null;
    let locZip = data.locationZip ?? null;
    let locCountry = data.locationCountry ?? null;
    let scope = data.sellingScope ?? null;
    let radiusMiles = data.sellingRadiusMiles ?? null;

    if (locLat == null && locLng == null) {
      const settings = new SettingsQueries(this.db).get();
      if (settings) {
        locLat = settings.locationLat ?? null;
        locLng = settings.locationLng ?? null;
        locAddress = settings.locationAddress ?? null;
        locCity = locCity ?? settings.locationCity ?? null;
        locState = locState ?? settings.locationState ?? null;
        locZip = locZip ?? settings.locationZip ?? null;
        locCountry = locCountry ?? settings.locationCountry ?? null;
        scope = scope ?? settings.defaultSellingScope;
        radiusMiles = radiusMiles ?? settings.defaultSellingRadiusMiles;
      }
    }

    this.db.prepare(`
      INSERT INTO items (id, name, description, category, subcategory, image, sku, listing_status, quantity,
        location_lat, location_lng, location_address, location_city, location_state, location_zip, location_country,
        selling_scope, selling_radius_miles, beacon_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.description || '', data.category || '', data.subcategory || '', data.image || null, data.sku || null,
      data.listingStatus || 'private', data.quantity || 1,
      locLat, locLng, locAddress, locCity, locState, locZip, locCountry,
      scope || 'global', radiusMiles, beaconId, now, now);
    return this.get(id)!;
  }

  update(id: string, data: ItemUpdate): Item | undefined {
    const existing = this.get(id);
    if (!existing) return undefined;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
    if (data.subcategory !== undefined) { fields.push('subcategory = ?'); values.push(data.subcategory); }
    if (data.image !== undefined) { fields.push('image = ?'); values.push(data.image); }
    if (data.sku !== undefined) { fields.push('sku = ?'); values.push(data.sku); }
    if (data.listingStatus !== undefined) { fields.push('listing_status = ?'); values.push(data.listingStatus); }
    if (data.quantity !== undefined) { fields.push('quantity = ?'); values.push(data.quantity); }
    if (data.locationLat !== undefined) { fields.push('location_lat = ?'); values.push(data.locationLat); }
    if (data.locationLng !== undefined) { fields.push('location_lng = ?'); values.push(data.locationLng); }
    if (data.locationAddress !== undefined) { fields.push('location_address = ?'); values.push(data.locationAddress); }
    if (data.locationCity !== undefined) { fields.push('location_city = ?'); values.push(data.locationCity); }
    if (data.locationState !== undefined) { fields.push('location_state = ?'); values.push(data.locationState); }
    if (data.locationZip !== undefined) { fields.push('location_zip = ?'); values.push(data.locationZip); }
    if (data.locationCountry !== undefined) { fields.push('location_country = ?'); values.push(data.locationCountry); }
    if (data.sellingScope !== undefined) { fields.push('selling_scope = ?'); values.push(data.sellingScope); }
    if (data.sellingRadiusMiles !== undefined) { fields.push('selling_radius_miles = ?'); values.push(data.sellingRadiusMiles); }

    if (fields.length === 0) return existing;

    fields.push("updated_at = datetime('now')");
    values.push(id);

    this.db.prepare(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.get(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM items WHERE id = ?').run(id);
    return result.changes > 0;
  }

  search(term: string): Item[] {
    const rows = this.db.prepare(
      "SELECT * FROM items WHERE listing_status NOT IN ('archived_sold', 'archived_deleted') AND (name LIKE ? OR description LIKE ?) ORDER BY created_at DESC"
    ).all(`%${term}%`, `%${term}%`);
    return rows.map(r => rowToItem(r as Record<string, unknown>));
  }

  listDiscoverable(category?: string, subcategory?: string): Item[] {
    let sql = "SELECT * FROM items WHERE listing_status IN ('for_sale', 'willing_to_sell')";
    const params: string[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (subcategory) {
      sql += ' AND subcategory = ?';
      params.push(subcategory);
    }
    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params);
    return rows.map(r => rowToItem(r as Record<string, unknown>));
  }

  searchDiscoverable(term: string): Item[] {
    const rows = this.db.prepare(
      "SELECT * FROM items WHERE listing_status IN ('for_sale', 'willing_to_sell') AND (name LIKE ? OR description LIKE ?) ORDER BY created_at DESC"
    ).all(`%${term}%`, `%${term}%`);
    return rows.map(r => rowToItem(r as Record<string, unknown>));
  }

  count(): number {
    const row = this.db.prepare("SELECT COUNT(*) as cnt FROM items WHERE listing_status NOT IN ('archived_sold', 'archived_deleted')").get() as { cnt: number };
    return row.cnt;
  }

  setSynced(id: string, synced: boolean, refId?: string): void {
    if (synced && refId) {
      this.db.prepare("UPDATE items SET reffo_synced = 1, reffo_ref_id = ?, updated_at = datetime('now') WHERE id = ?").run(refId, id);
    } else if (synced) {
      this.db.prepare("UPDATE items SET reffo_synced = 1, updated_at = datetime('now') WHERE id = ?").run(id);
    } else {
      this.db.prepare("UPDATE items SET reffo_synced = 0, reffo_ref_id = NULL, updated_at = datetime('now') WHERE id = ?").run(id);
    }
  }

  listSynced(): Item[] {
    const rows = this.db.prepare('SELECT * FROM items WHERE reffo_synced = 1 ORDER BY created_at DESC').all();
    return rows.map(r => rowToItem(r as Record<string, unknown>));
  }

  listArchived(): Item[] {
    const rows = this.db.prepare("SELECT * FROM items WHERE listing_status IN ('archived_sold', 'archived_deleted') ORDER BY updated_at DESC").all();
    return rows.map(r => rowToItem(r as Record<string, unknown>));
  }

  archive(id: string, reason: 'sold' | 'deleted'): boolean {
    const status = reason === 'sold' ? 'archived_sold' : 'archived_deleted';
    const result = this.db.prepare(
      "UPDATE items SET listing_status = ?, reffo_synced = 0, reffo_ref_id = NULL, updated_at = datetime('now') WHERE id = ?"
    ).run(status, id);
    return result.changes > 0;
  }

  restore(id: string): Item | undefined {
    const item = this.get(id);
    if (!item) return undefined;
    if (item.listingStatus !== 'archived_sold' && item.listingStatus !== 'archived_deleted') return undefined;

    const newQuantity = item.listingStatus === 'archived_sold' ? 1 : item.quantity;
    this.db.prepare(
      "UPDATE items SET listing_status = 'private', quantity = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(newQuantity, id);
    return this.get(id);
  }

  decrementQuantity(id: string): number {
    this.db.prepare(
      "UPDATE items SET quantity = MAX(0, quantity - 1), updated_at = datetime('now') WHERE id = ?"
    ).run(id);
    const item = this.get(id);
    return item ? item.quantity : 0;
  }
}

export class OfferQueries {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || getDb();
  }

  list(itemId?: string): Offer[] {
    const query = itemId
      ? this.db.prepare('SELECT * FROM offers WHERE item_id = ? ORDER BY created_at DESC')
      : this.db.prepare('SELECT * FROM offers ORDER BY created_at DESC');
    const rows = itemId ? query.all(itemId) : query.all();
    return rows.map(r => rowToOffer(r as Record<string, unknown>));
  }

  get(id: string): Offer | undefined {
    const row = this.db.prepare('SELECT * FROM offers WHERE id = ?').get(id);
    return row ? rowToOffer(row as Record<string, unknown>) : undefined;
  }

  create(data: OfferCreate, sellerId: string): Offer {
    const id = uuid();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO offers (id, item_id, price, price_currency, status, seller_id, location, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.itemId, data.price, data.priceCurrency || 'USD', data.status || 'active', sellerId, data.location || null, now, now);
    return this.get(id)!;
  }

  update(id: string, data: OfferUpdate): Offer | undefined {
    const existing = this.get(id);
    if (!existing) return undefined;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price); }
    if (data.priceCurrency !== undefined) { fields.push('price_currency = ?'); values.push(data.priceCurrency); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.location !== undefined) { fields.push('location = ?'); values.push(data.location); }

    if (fields.length === 0) return existing;

    fields.push("updated_at = datetime('now')");
    values.push(id);

    this.db.prepare(`UPDATE offers SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.get(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM offers WHERE id = ?').run(id);
    return result.changes > 0;
  }

  countActive(): number {
    const row = this.db.prepare("SELECT COUNT(*) as cnt FROM offers WHERE status = 'active'").get() as { cnt: number };
    return row.cnt;
  }
}

function rowToMedia(row: Record<string, unknown>): ItemMedia {
  return {
    id: row.id as string,
    itemId: row.item_id as string,
    mediaType: row.media_type as MediaType,
    filePath: row.file_path as string,
    mimeType: row.mime_type as string,
    fileSize: row.file_size as number,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
  };
}

export class MediaQueries {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || getDb();
  }

  listForItem(itemId: string): ItemMedia[] {
    const rows = this.db.prepare('SELECT * FROM item_media WHERE item_id = ? ORDER BY sort_order ASC, created_at ASC').all(itemId);
    return rows.map(r => rowToMedia(r as Record<string, unknown>));
  }

  countPhotos(itemId: string): number {
    const row = this.db.prepare("SELECT COUNT(*) as cnt FROM item_media WHERE item_id = ? AND media_type = 'photo'").get(itemId) as { cnt: number };
    return row.cnt;
  }

  hasVideo(itemId: string): boolean {
    const row = this.db.prepare("SELECT COUNT(*) as cnt FROM item_media WHERE item_id = ? AND media_type = 'video'").get(itemId) as { cnt: number };
    return row.cnt > 0;
  }

  create(data: { id: string; itemId: string; mediaType: MediaType; filePath: string; mimeType: string; fileSize: number; sortOrder?: number }): ItemMedia {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO item_media (id, item_id, media_type, file_path, mime_type, file_size, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.id, data.itemId, data.mediaType, data.filePath, data.mimeType, data.fileSize, data.sortOrder || 0, now);
    const row = this.db.prepare('SELECT * FROM item_media WHERE id = ?').get(data.id);
    return rowToMedia(row as Record<string, unknown>);
  }

  delete(id: string): ItemMedia | undefined {
    const row = this.db.prepare('SELECT * FROM item_media WHERE id = ?').get(id);
    if (!row) return undefined;
    const media = rowToMedia(row as Record<string, unknown>);
    this.db.prepare('DELETE FROM item_media WHERE id = ?').run(id);
    return media;
  }

  deleteAllForItem(itemId: string): string[] {
    const rows = this.db.prepare('SELECT file_path FROM item_media WHERE item_id = ?').all(itemId);
    const paths = rows.map(r => (r as Record<string, unknown>).file_path as string);
    this.db.prepare('DELETE FROM item_media WHERE item_id = ?').run(itemId);
    return paths;
  }
}

function rowToNegotiation(row: Record<string, unknown>): Negotiation {
  return {
    id: row.id as string,
    itemId: row.item_id as string,
    itemName: row.item_name as string,
    buyerBeaconId: row.buyer_beacon_id as string,
    sellerBeaconId: row.seller_beacon_id as string,
    price: row.price as number,
    priceCurrency: row.price_currency as string,
    message: row.message as string,
    status: row.status as NegotiationStatus,
    role: row.role as NegotiationRole,
    counterPrice: row.counter_price as number | undefined,
    responseMessage: row.response_message as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export class NegotiationQueries {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || getDb();
  }

  get(id: string): Negotiation | undefined {
    const row = this.db.prepare('SELECT * FROM negotiations WHERE id = ?').get(id);
    return row ? rowToNegotiation(row as Record<string, unknown>) : undefined;
  }

  listIncoming(): Negotiation[] {
    const rows = this.db.prepare("SELECT * FROM negotiations WHERE role = 'seller' ORDER BY created_at DESC").all();
    return rows.map(r => rowToNegotiation(r as Record<string, unknown>));
  }

  listOutgoing(): Negotiation[] {
    const rows = this.db.prepare("SELECT * FROM negotiations WHERE role = 'buyer' ORDER BY created_at DESC").all();
    return rows.map(r => rowToNegotiation(r as Record<string, unknown>));
  }

  listForItem(itemId: string): Negotiation[] {
    const rows = this.db.prepare('SELECT * FROM negotiations WHERE item_id = ? ORDER BY created_at DESC').all(itemId);
    return rows.map(r => rowToNegotiation(r as Record<string, unknown>));
  }

  create(data: NegotiationCreate): Negotiation {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO negotiations (id, item_id, item_name, buyer_beacon_id, seller_beacon_id, price, price_currency, message, status, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.id, data.itemId, data.itemName || '', data.buyerBeaconId, data.sellerBeaconId, data.price, data.priceCurrency || 'USD', data.message || '', data.status || 'pending', data.role, now, now);
    return this.get(data.id)!;
  }

  updateStatus(id: string, status: NegotiationStatus, counterPrice?: number, responseMessage?: string): Negotiation | undefined {
    const existing = this.get(id);
    if (!existing) return undefined;

    if (counterPrice !== undefined) {
      this.db.prepare("UPDATE negotiations SET status = ?, counter_price = ?, response_message = ?, updated_at = datetime('now') WHERE id = ?")
        .run(status, counterPrice, responseMessage || null, id);
    } else {
      this.db.prepare("UPDATE negotiations SET status = ?, response_message = ?, updated_at = datetime('now') WHERE id = ?")
        .run(status, responseMessage || null, id);
    }
    return this.get(id);
  }

  listPendingForItem(itemId: string, excludeId: string): Negotiation[] {
    const rows = this.db.prepare(
      "SELECT * FROM negotiations WHERE item_id = ? AND id != ? AND status IN ('pending', 'countered')"
    ).all(itemId, excludeId);
    return rows.map(r => rowToNegotiation(r as Record<string, unknown>));
  }

  countPending(): number {
    const row = this.db.prepare("SELECT COUNT(*) as cnt FROM negotiations WHERE status = 'pending' AND role = 'seller'").get() as { cnt: number };
    return row.cnt;
  }
}

function rowToSettings(row: Record<string, unknown>): BeaconSettings {
  return {
    id: row.id as string,
    locationLat: row.location_lat as number | undefined,
    locationLng: row.location_lng as number | undefined,
    locationAddress: row.location_address as string | undefined,
    locationCity: row.location_city as string | undefined,
    locationState: row.location_state as string | undefined,
    locationZip: row.location_zip as string | undefined,
    locationCountry: row.location_country as string | undefined,
    defaultSellingScope: (row.default_selling_scope as SellingScope) || 'global',
    defaultSellingRadiusMiles: (row.default_selling_radius_miles as number) || 250,
  };
}

export class SettingsQueries {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || getDb();
  }

  get(): BeaconSettings | undefined {
    const row = this.db.prepare("SELECT * FROM beacon_settings WHERE id = 'default'").get();
    return row ? rowToSettings(row as Record<string, unknown>) : undefined;
  }

  upsert(data: Partial<Omit<BeaconSettings, 'id'>>): BeaconSettings {
    const existing = this.get();
    if (existing) {
      const fields: string[] = [];
      const values: unknown[] = [];
      if (data.locationLat !== undefined) { fields.push('location_lat = ?'); values.push(data.locationLat); }
      if (data.locationLng !== undefined) { fields.push('location_lng = ?'); values.push(data.locationLng); }
      if (data.locationAddress !== undefined) { fields.push('location_address = ?'); values.push(data.locationAddress); }
      if (data.locationCity !== undefined) { fields.push('location_city = ?'); values.push(data.locationCity); }
      if (data.locationState !== undefined) { fields.push('location_state = ?'); values.push(data.locationState); }
      if (data.locationZip !== undefined) { fields.push('location_zip = ?'); values.push(data.locationZip); }
      if (data.locationCountry !== undefined) { fields.push('location_country = ?'); values.push(data.locationCountry); }
      if (data.defaultSellingScope !== undefined) { fields.push('default_selling_scope = ?'); values.push(data.defaultSellingScope); }
      if (data.defaultSellingRadiusMiles !== undefined) { fields.push('default_selling_radius_miles = ?'); values.push(data.defaultSellingRadiusMiles); }
      if (fields.length > 0) {
        fields.push("updated_at = datetime('now')");
        values.push('default');
        this.db.prepare(`UPDATE beacon_settings SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      }
    } else {
      this.db.prepare(`
        INSERT INTO beacon_settings (id, location_lat, location_lng, location_address, location_city, location_state, location_zip, location_country, default_selling_scope, default_selling_radius_miles)
        VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.locationLat ?? null, data.locationLng ?? null, data.locationAddress ?? null,
        data.locationCity ?? null, data.locationState ?? null, data.locationZip ?? null,
        data.locationCountry ?? 'US', data.defaultSellingScope ?? 'global', data.defaultSellingRadiusMiles ?? 250
      );
    }
    return this.get()!;
  }
}
