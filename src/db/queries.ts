import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { getDb } from './schema';
import type { Item, ItemCreate, ItemUpdate, ListingStatus, Offer, OfferCreate, OfferUpdate, ItemMedia, MediaType, Negotiation, NegotiationCreate, NegotiationStatus, NegotiationRole } from '../types';

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
    const conditions: string[] = [];
    const params: string[] = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (subcategory) {
      conditions.push('subcategory = ?');
      params.push(subcategory);
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
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
    this.db.prepare(`
      INSERT INTO items (id, name, description, category, subcategory, image, sku, listing_status, quantity, beacon_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.description || '', data.category || '', data.subcategory || '', data.image || null, data.sku || null, data.listingStatus || 'private', data.quantity || 1, beaconId, now, now);
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
      "SELECT * FROM items WHERE name LIKE ? OR description LIKE ? ORDER BY created_at DESC"
    ).all(`%${term}%`, `%${term}%`);
    return rows.map(r => rowToItem(r as Record<string, unknown>));
  }

  listDiscoverable(category?: string, subcategory?: string): Item[] {
    let sql = "SELECT * FROM items WHERE listing_status != 'private'";
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
      "SELECT * FROM items WHERE listing_status != 'private' AND (name LIKE ? OR description LIKE ?) ORDER BY created_at DESC"
    ).all(`%${term}%`, `%${term}%`);
    return rows.map(r => rowToItem(r as Record<string, unknown>));
  }

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM items').get() as { cnt: number };
    return row.cnt;
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

  countPending(): number {
    const row = this.db.prepare("SELECT COUNT(*) as cnt FROM negotiations WHERE status = 'pending' AND role = 'seller'").get() as { cnt: number };
    return row.cnt;
  }
}
