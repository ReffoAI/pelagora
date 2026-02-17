import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.REFFO_DB_PATH || path.join(process.cwd(), 'reffo-beacon.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

/** For tests: initialize an in-memory database */
export function getTestDb(): Database.Database {
  const testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  initSchema(testDb);
  return testDb;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      subcategory TEXT NOT NULL DEFAULT '',
      image TEXT,
      sku TEXT,
      listing_status TEXT NOT NULL DEFAULT 'private' CHECK(listing_status IN ('private', 'for_sale', 'willing_to_sell')),
      quantity INTEGER NOT NULL DEFAULT 1,
      beacon_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add listing_status to existing databases
  const columns = database.pragma('table_info(items)') as { name: string }[];
  if (!columns.some(c => c.name === 'listing_status')) {
    database.exec(`ALTER TABLE items ADD COLUMN listing_status TEXT NOT NULL DEFAULT 'private' CHECK(listing_status IN ('private', 'for_sale', 'willing_to_sell'))`);
  }

  // Migration: add quantity to existing databases
  if (!columns.some(c => c.name === 'quantity')) {
    database.exec(`ALTER TABLE items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1`);
  }

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
    CREATE INDEX IF NOT EXISTS idx_items_cat_subcat ON items(category, subcategory);
    CREATE INDEX IF NOT EXISTS idx_items_beacon ON items(beacon_id);
    CREATE INDEX IF NOT EXISTS idx_items_listing_status ON items(listing_status);

    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      price REAL NOT NULL,
      price_currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'sold', 'withdrawn')),
      seller_id TEXT NOT NULL,
      location TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_offers_item ON offers(item_id);
    CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
    CREATE INDEX IF NOT EXISTS idx_offers_seller ON offers(seller_id);

    CREATE TABLE IF NOT EXISTS item_media (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      media_type TEXT NOT NULL CHECK(media_type IN ('photo', 'video')),
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_item_media_item ON item_media(item_id);
    CREATE INDEX IF NOT EXISTS idx_item_media_type ON item_media(item_id, media_type);

    CREATE TABLE IF NOT EXISTS negotiations (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL DEFAULT '',
      buyer_beacon_id TEXT NOT NULL,
      seller_beacon_id TEXT NOT NULL,
      price REAL NOT NULL,
      price_currency TEXT NOT NULL DEFAULT 'USD',
      message TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'accepted', 'rejected', 'countered', 'withdrawn')),
      role TEXT NOT NULL CHECK(role IN ('buyer', 'seller')),
      counter_price REAL,
      response_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_negotiations_role ON negotiations(role);
    CREATE INDEX IF NOT EXISTS idx_negotiations_status ON negotiations(status);
    CREATE INDEX IF NOT EXISTS idx_negotiations_item ON negotiations(item_id);
  `);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = undefined as unknown as Database.Database;
  }
}
