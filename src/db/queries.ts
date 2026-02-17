import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { getDb } from './schema';
import type { Item, ItemCreate, ItemUpdate, ListingStatus, Offer, OfferCreate, OfferUpdate } from '../types';

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
      INSERT INTO items (id, name, description, category, subcategory, image, sku, listing_status, beacon_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.description || '', data.category || '', data.subcategory || '', data.image || null, data.sku || null, data.listingStatus || 'private', beaconId, now, now);
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
