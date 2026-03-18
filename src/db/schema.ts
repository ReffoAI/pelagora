import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.REFFO_DB_PATH || path.join(process.cwd(), 'pelagora.db');

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
  // Force WAL checkpoint to ensure sqlite_master and pragma are consistent
  database.pragma('wal_checkpoint(TRUNCATE)');

  // === Migration: rename old items/item_media tables from pre-rename databases ===
  const oldItemsTable = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='items'").get();
  if (oldItemsTable) {
    // A previous run may have created an empty `refs` table via CREATE TABLE IF NOT EXISTS — drop it first
    const emptyRefsTable = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='refs'").get();
    if (emptyRefsTable) {
      database.exec(`DROP TABLE refs`);
    }
    database.exec(`ALTER TABLE items RENAME TO refs`);
  }
  const oldItemMediaTable = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='item_media'").get();
  if (oldItemMediaTable) {
    const emptyRefMediaTable = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ref_media'").get();
    if (emptyRefMediaTable) {
      database.exec(`DROP TABLE ref_media`);
    }
    database.exec(`ALTER TABLE item_media RENAME TO ref_media`);
  }

  // Migration: rename item_id→ref_id in ref_media table
  const refMediaSql = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='ref_media'").get() as { sql: string } | undefined;
  if (refMediaSql && refMediaSql.sql.includes('item_id')) {
    database.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN TRANSACTION;
      CREATE TABLE ref_media_new (
        id TEXT PRIMARY KEY,
        ref_id TEXT NOT NULL REFERENCES refs(id) ON DELETE CASCADE,
        media_type TEXT NOT NULL CHECK(media_type IN ('photo', 'video')),
        file_path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO ref_media_new (id, ref_id, media_type, file_path, mime_type, file_size, sort_order, created_at)
        SELECT id, item_id, media_type, file_path, mime_type, file_size, sort_order, created_at FROM ref_media;
      DROP TABLE ref_media;
      ALTER TABLE ref_media_new RENAME TO ref_media;
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  }

  // Migration: rename item_id→ref_id in offers table
  // Use sqlite_master SQL (not pragma) to detect old columns reliably after WAL recovery
  const offersSql = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='offers'").get() as { sql: string } | undefined;
  if (offersSql && offersSql.sql.includes('item_id')) {
    database.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN TRANSACTION;
      CREATE TABLE offers_new (
        id TEXT PRIMARY KEY,
        ref_id TEXT NOT NULL REFERENCES refs(id) ON DELETE CASCADE,
        price REAL NOT NULL,
        price_currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'sold', 'withdrawn')),
        seller_id TEXT NOT NULL,
        location TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO offers_new (id, ref_id, price, price_currency, status, seller_id, location, created_at, updated_at)
        SELECT id, item_id, price, price_currency, status, seller_id, location, created_at, updated_at FROM offers;
      DROP TABLE offers;
      ALTER TABLE offers_new RENAME TO offers;
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  }

  // Migration: rename item_id→ref_id, item_name→ref_name in negotiations table
  const negsSql = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='negotiations'").get() as { sql: string } | undefined;
  if (negsSql && negsSql.sql.includes('item_id')) {
    database.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN TRANSACTION;
      CREATE TABLE negotiations_new (
        id TEXT PRIMARY KEY,
        ref_id TEXT NOT NULL,
        ref_name TEXT NOT NULL DEFAULT '',
        buyer_beacon_id TEXT NOT NULL,
        seller_beacon_id TEXT NOT NULL,
        price REAL NOT NULL,
        price_currency TEXT NOT NULL DEFAULT 'USD',
        message TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK(status IN ('pending', 'accepted', 'rejected', 'countered', 'withdrawn', 'sold')),
        role TEXT NOT NULL CHECK(role IN ('buyer', 'seller')),
        counter_price REAL,
        response_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO negotiations_new (id, ref_id, ref_name, buyer_beacon_id, seller_beacon_id, price, price_currency, message, status, role, counter_price, response_message, created_at, updated_at)
        SELECT id, item_id, item_name, buyer_beacon_id, seller_beacon_id, price, price_currency, message, status, role, counter_price, response_message, created_at, updated_at FROM negotiations;
      DROP TABLE negotiations;
      ALTER TABLE negotiations_new RENAME TO negotiations;
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS refs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      subcategory TEXT NOT NULL DEFAULT '',
      image TEXT,
      sku TEXT,
      listing_status TEXT NOT NULL DEFAULT 'private' CHECK(listing_status IN ('private', 'for_sale', 'willing_to_sell', 'for_rent', 'archived_sold', 'archived_deleted')),
      quantity INTEGER NOT NULL DEFAULT 1,
      location_lat REAL,
      location_lng REAL,
      location_address TEXT,
      location_city TEXT,
      location_state TEXT,
      location_zip TEXT,
      location_country TEXT,
      selling_scope TEXT DEFAULT 'global',
      selling_radius_miles INTEGER,
      attributes TEXT,
      condition TEXT,
      rental_terms TEXT,
      rental_deposit REAL,
      rental_duration INTEGER,
      rental_duration_unit TEXT,
      beacon_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add listing_status to existing databases
  const columns = database.pragma('table_info(refs)') as { name: string }[];
  if (!columns.some(c => c.name === 'listing_status')) {
    database.exec(`ALTER TABLE refs ADD COLUMN listing_status TEXT NOT NULL DEFAULT 'private' CHECK(listing_status IN ('private', 'for_sale', 'willing_to_sell'))`);
  }

  // Migration: add quantity to existing databases
  if (!columns.some(c => c.name === 'quantity')) {
    database.exec(`ALTER TABLE refs ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1`);
  }

  // Migration: add reffo_synced and reffo_ref_id to existing databases
  if (!columns.some(c => c.name === 'reffo_synced')) {
    database.exec(`ALTER TABLE refs ADD COLUMN reffo_synced INTEGER NOT NULL DEFAULT 0`);
  }
  if (!columns.some(c => c.name === 'reffo_ref_id')) {
    database.exec(`ALTER TABLE refs ADD COLUMN reffo_ref_id TEXT`);
  }

  // Migration: add location and selling scope columns to existing refs
  if (!columns.some(c => c.name === 'location_lat')) {
    database.exec(`ALTER TABLE refs ADD COLUMN location_lat REAL`);
    database.exec(`ALTER TABLE refs ADD COLUMN location_lng REAL`);
    database.exec(`ALTER TABLE refs ADD COLUMN location_address TEXT`);
    database.exec(`ALTER TABLE refs ADD COLUMN location_city TEXT`);
    database.exec(`ALTER TABLE refs ADD COLUMN location_state TEXT`);
    database.exec(`ALTER TABLE refs ADD COLUMN location_zip TEXT`);
    database.exec(`ALTER TABLE refs ADD COLUMN location_country TEXT`);
    database.exec(`ALTER TABLE refs ADD COLUMN selling_scope TEXT DEFAULT 'global'`);
    database.exec(`ALTER TABLE refs ADD COLUMN selling_radius_miles INTEGER`);
  }

  // Migration: add attributes and condition columns to existing refs
  if (!columns.some(c => c.name === 'attributes')) {
    database.exec(`ALTER TABLE refs ADD COLUMN attributes TEXT`);
  }
  if (!columns.some(c => c.name === 'condition')) {
    database.exec(`ALTER TABLE refs ADD COLUMN condition TEXT`);
  }

  // Migration: add rental fields to existing databases
  if (!columns.some(c => c.name === 'rental_terms')) {
    database.exec(`ALTER TABLE refs ADD COLUMN rental_terms TEXT`);
    database.exec(`ALTER TABLE refs ADD COLUMN rental_deposit REAL`);
    database.exec(`ALTER TABLE refs ADD COLUMN rental_duration INTEGER`);
    database.exec(`ALTER TABLE refs ADD COLUMN rental_duration_unit TEXT`);
  }

  // Migration: expand CHECK constraints for archived statuses on refs table
  const refsCheckInfo = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='refs'").get() as { sql: string } | undefined;
  if (refsCheckInfo && !refsCheckInfo.sql.includes('archived_sold')) {
    database.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN TRANSACTION;
      CREATE TABLE refs_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT '',
        subcategory TEXT NOT NULL DEFAULT '',
        image TEXT,
        sku TEXT,
        listing_status TEXT NOT NULL DEFAULT 'private' CHECK(listing_status IN ('private', 'for_sale', 'willing_to_sell', 'for_rent', 'archived_sold', 'archived_deleted')),
        quantity INTEGER NOT NULL DEFAULT 1,
        reffo_synced INTEGER NOT NULL DEFAULT 0,
        reffo_ref_id TEXT,
        location_lat REAL,
        location_lng REAL,
        location_address TEXT,
        location_city TEXT,
        location_state TEXT,
        location_zip TEXT,
        location_country TEXT,
        selling_scope TEXT DEFAULT 'global',
        selling_radius_miles INTEGER,
        attributes TEXT,
        condition TEXT,
        beacon_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO refs_new SELECT id, name, description, category, subcategory, image, sku, listing_status, quantity, reffo_synced, reffo_ref_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'global', NULL, NULL, NULL, beacon_id, created_at, updated_at FROM refs;
      DROP TABLE refs;
      ALTER TABLE refs_new RENAME TO refs;
      CREATE INDEX IF NOT EXISTS idx_refs_category ON refs(category);
      CREATE INDEX IF NOT EXISTS idx_refs_cat_subcat ON refs(category, subcategory);
      CREATE INDEX IF NOT EXISTS idx_refs_beacon ON refs(beacon_id);
      CREATE INDEX IF NOT EXISTS idx_refs_listing_status ON refs(listing_status);
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  }

  // Migration: expand CHECK constraints to include 'for_rent' status on refs table
  const refsForRentCheck = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='refs'").get() as { sql: string } | undefined;
  if (refsForRentCheck && refsForRentCheck.sql.includes('archived_sold') && !refsForRentCheck.sql.includes('for_rent')) {
    database.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN TRANSACTION;
      CREATE TABLE refs_new2 AS SELECT * FROM refs;
      DROP TABLE refs;
      CREATE TABLE refs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT '',
        subcategory TEXT NOT NULL DEFAULT '',
        image TEXT,
        sku TEXT,
        listing_status TEXT NOT NULL DEFAULT 'private' CHECK(listing_status IN ('private', 'for_sale', 'willing_to_sell', 'for_rent', 'archived_sold', 'archived_deleted')),
        quantity INTEGER NOT NULL DEFAULT 1,
        reffo_synced INTEGER NOT NULL DEFAULT 0,
        reffo_ref_id TEXT,
        location_lat REAL,
        location_lng REAL,
        location_address TEXT,
        location_city TEXT,
        location_state TEXT,
        location_zip TEXT,
        location_country TEXT,
        selling_scope TEXT DEFAULT 'global',
        selling_radius_miles INTEGER,
        attributes TEXT,
        condition TEXT,
        rental_terms TEXT,
        rental_deposit REAL,
        rental_duration INTEGER,
        rental_duration_unit TEXT,
        beacon_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO refs (id, name, description, category, subcategory, image, sku, listing_status, quantity, reffo_synced, reffo_ref_id, location_lat, location_lng, location_address, location_city, location_state, location_zip, location_country, selling_scope, selling_radius_miles, attributes, condition, beacon_id, created_at, updated_at)
        SELECT id, name, description, category, subcategory, image, sku, listing_status, quantity, reffo_synced, reffo_ref_id, location_lat, location_lng, location_address, location_city, location_state, location_zip, location_country, selling_scope, selling_radius_miles, attributes, condition, beacon_id, created_at, updated_at FROM refs_new2;
      DROP TABLE refs_new2;
      CREATE INDEX IF NOT EXISTS idx_refs_category ON refs(category);
      CREATE INDEX IF NOT EXISTS idx_refs_cat_subcat ON refs(category, subcategory);
      CREATE INDEX IF NOT EXISTS idx_refs_beacon ON refs(beacon_id);
      CREATE INDEX IF NOT EXISTS idx_refs_listing_status ON refs(listing_status);
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  }

  // Migration: expand CHECK constraints for 'sold' status on negotiations table
  // Also renames item_id→ref_id and item_name→ref_name
  const negCheckInfo = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='negotiations'").get() as { sql: string } | undefined;
  if (negCheckInfo && !negCheckInfo.sql.includes("'sold'")) {
    database.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN TRANSACTION;
      CREATE TABLE negotiations_new (
        id TEXT PRIMARY KEY,
        ref_id TEXT NOT NULL,
        ref_name TEXT NOT NULL DEFAULT '',
        buyer_beacon_id TEXT NOT NULL,
        seller_beacon_id TEXT NOT NULL,
        price REAL NOT NULL,
        price_currency TEXT NOT NULL DEFAULT 'USD',
        message TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK(status IN ('pending', 'accepted', 'rejected', 'countered', 'withdrawn', 'sold')),
        role TEXT NOT NULL CHECK(role IN ('buyer', 'seller')),
        counter_price REAL,
        response_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO negotiations_new (id, ref_id, ref_name, buyer_beacon_id, seller_beacon_id, price, price_currency, message, status, role, counter_price, response_message, created_at, updated_at)
        SELECT id, item_id, item_name, buyer_beacon_id, seller_beacon_id, price, price_currency, message, status, role, counter_price, response_message, created_at, updated_at FROM negotiations;
      DROP TABLE negotiations;
      ALTER TABLE negotiations_new RENAME TO negotiations;
      CREATE INDEX IF NOT EXISTS idx_negotiations_role ON negotiations(role);
      CREATE INDEX IF NOT EXISTS idx_negotiations_status ON negotiations(status);
      CREATE INDEX IF NOT EXISTS idx_negotiations_ref ON negotiations(ref_id);
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  }

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_refs_category ON refs(category);
    CREATE INDEX IF NOT EXISTS idx_refs_cat_subcat ON refs(category, subcategory);
    CREATE INDEX IF NOT EXISTS idx_refs_beacon ON refs(beacon_id);
    CREATE INDEX IF NOT EXISTS idx_refs_listing_status ON refs(listing_status);

    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      ref_id TEXT NOT NULL REFERENCES refs(id) ON DELETE CASCADE,
      price REAL NOT NULL,
      price_currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'sold', 'withdrawn')),
      seller_id TEXT NOT NULL,
      location TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_offers_ref ON offers(ref_id);
    CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
    CREATE INDEX IF NOT EXISTS idx_offers_seller ON offers(seller_id);

    CREATE TABLE IF NOT EXISTS ref_media (
      id TEXT PRIMARY KEY,
      ref_id TEXT NOT NULL REFERENCES refs(id) ON DELETE CASCADE,
      media_type TEXT NOT NULL CHECK(media_type IN ('photo', 'video')),
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ref_media_ref ON ref_media(ref_id);
    CREATE INDEX IF NOT EXISTS idx_ref_media_type ON ref_media(ref_id, media_type);

    CREATE TABLE IF NOT EXISTS negotiations (
      id TEXT PRIMARY KEY,
      ref_id TEXT NOT NULL,
      ref_name TEXT NOT NULL DEFAULT '',
      buyer_beacon_id TEXT NOT NULL,
      seller_beacon_id TEXT NOT NULL,
      price REAL NOT NULL,
      price_currency TEXT NOT NULL DEFAULT 'USD',
      message TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'accepted', 'rejected', 'countered', 'withdrawn', 'sold')),
      role TEXT NOT NULL CHECK(role IN ('buyer', 'seller')),
      counter_price REAL,
      response_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_negotiations_role ON negotiations(role);
    CREATE INDEX IF NOT EXISTS idx_negotiations_status ON negotiations(status);
    CREATE INDEX IF NOT EXISTS idx_negotiations_ref ON negotiations(ref_id);

    CREATE TABLE IF NOT EXISTS beacon_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      location_lat REAL,
      location_lng REAL,
      location_address TEXT,
      location_city TEXT,
      location_state TEXT,
      location_zip TEXT,
      location_country TEXT DEFAULT 'US',
      default_selling_scope TEXT NOT NULL DEFAULT 'global'
        CHECK(default_selling_scope IN ('global','national','range')),
      default_selling_radius_miles INTEGER NOT NULL DEFAULT 250,
      profile_picture_path TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      ref_id TEXT NOT NULL,
      ref_name TEXT NOT NULL DEFAULT '',
      beacon_id TEXT NOT NULL,
      offer_price REAL,
      offer_currency TEXT DEFAULT 'USD',
      listing_status TEXT,
      category TEXT DEFAULT '',
      subcategory TEXT DEFAULT '',
      location_city TEXT,
      location_state TEXT,
      location_zip TEXT,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_favorites_ref_beacon ON favorites(ref_id, beacon_id);

    CREATE TABLE IF NOT EXISTS product_catalog (
      id TEXT PRIMARY KEY,
      name_normalized TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT DEFAULT '',
      description TEXT,
      sku TEXT,
      product_url TEXT,
      image_url TEXT,
      attributes TEXT DEFAULT '{}',
      price_low REAL,
      price_high REAL,
      price_typical REAL,
      price_confidence TEXT,
      price_currency TEXT DEFAULT 'USD',
      ai_model TEXT,
      lookup_count INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT DEFAULT (datetime('now', '+30 days'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_product_catalog_lookup
      ON product_catalog (name_normalized, category, subcategory);

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      image_path TEXT,
      collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'processing',
      item_count INTEGER DEFAULT 0,
      ai_model TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scan_items (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT,
      confidence REAL,
      description TEXT,
      condition TEXT,
      price_low REAL,
      price_high REAL,
      price_typical REAL,
      attributes TEXT DEFAULT '{}',
      enriched INTEGER DEFAULT 0,
      ref_id TEXT REFERENCES refs(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_scan_items_scan ON scan_items(scan_id);
    CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
  `);

  // Migration: rename categories to match updated taxonomy
  // Clothing → Clothing & Accessories (except Jewelry & Watches which becomes top-level)
  database.exec(`UPDATE refs SET category = 'Clothing & Accessories' WHERE category = 'Clothing' AND subcategory != 'Jewelry & Watches'`);
  database.exec(`UPDATE refs SET category = 'Jewelry & Watches', subcategory = 'Fashion Jewelry' WHERE category = 'Clothing' AND subcategory = 'Jewelry & Watches'`);
  // Housing → Real Estate
  database.exec(`UPDATE refs SET category = 'Real Estate' WHERE category = 'Housing'`);
  // Collectibles|Toys & Figures → Toys & Hobbies|Action Figures & Dolls
  database.exec(`UPDATE refs SET category = 'Toys & Hobbies', subcategory = 'Action Figures & Dolls' WHERE category = 'Collectibles' AND subcategory = 'Toys & Figures'`);

  // Migration: add purchase_date and purchase_price to existing refs
  const refsColsForPurchase = database.pragma('table_info(refs)') as { name: string }[];
  if (!refsColsForPurchase.some(c => c.name === 'purchase_date')) {
    database.exec(`ALTER TABLE refs ADD COLUMN purchase_date TEXT`);
  }
  if (!refsColsForPurchase.some(c => c.name === 'purchase_price')) {
    database.exec(`ALTER TABLE refs ADD COLUMN purchase_price REAL`);
  }

  // Migration: add collection_id to existing refs
  const refsColsForCollection = database.pragma('table_info(refs)') as { name: string }[];
  if (!refsColsForCollection.some(c => c.name === 'collection_id')) {
    database.exec(`ALTER TABLE refs ADD COLUMN collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL`);
  }

  // Migration: add profile_picture_path to existing beacon_settings
  try {
    const settingsCols = database.pragma('table_info(beacon_settings)') as { name: string }[];
    if (!settingsCols.some(c => c.name === 'profile_picture_path')) {
      database.exec(`ALTER TABLE beacon_settings ADD COLUMN profile_picture_path TEXT`);
    }
  } catch {}

  // Migration: add archived_at to negotiations
  try {
    const negCols = database.pragma('table_info(negotiations)') as { name: string }[];
    if (!negCols.some(c => c.name === 'archived_at')) {
      database.exec(`ALTER TABLE negotiations ADD COLUMN archived_at TEXT`);
    }
  } catch {}

  // Migration: add network publishing columns to refs
  const refsColsForNetwork = database.pragma('table_info(refs)') as { name: string }[];
  if (!refsColsForNetwork.some(c => c.name === 'network_published')) {
    database.exec(`ALTER TABLE refs ADD COLUMN network_published INTEGER NOT NULL DEFAULT 0`);
  }
  if (!refsColsForNetwork.some(c => c.name === 'share_url')) {
    database.exec(`ALTER TABLE refs ADD COLUMN share_url TEXT`);
  }

  // Migration: add network_publish_enabled to beacon_settings
  try {
    const settingsColsNetwork = database.pragma('table_info(beacon_settings)') as { name: string }[];
    if (!settingsColsNetwork.some(c => c.name === 'network_publish_enabled')) {
      database.exec(`ALTER TABLE beacon_settings ADD COLUMN network_publish_enabled INTEGER NOT NULL DEFAULT 1`);
    }
  } catch {}

  // Network messages table for buyer inquiries relayed from webapp
  database.exec(`
    CREATE TABLE IF NOT EXISTS network_messages (
      id TEXT PRIMARY KEY,
      ref_id TEXT NOT NULL,
      sender_name TEXT,
      sender_email TEXT,
      message TEXT NOT NULL,
      reply TEXT,
      replied_at TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_network_messages_ref ON network_messages(ref_id);
    CREATE INDEX IF NOT EXISTS idx_network_messages_read ON network_messages(read);
  `);

  // Migration: add reply columns to existing network_messages
  try {
    const nmCols = database.pragma('table_info(network_messages)') as { name: string }[];
    if (!nmCols.some(c => c.name === 'reply')) {
      database.exec(`ALTER TABLE network_messages ADD COLUMN reply TEXT`);
    }
    if (!nmCols.some(c => c.name === 'replied_at')) {
      database.exec(`ALTER TABLE network_messages ADD COLUMN replied_at TEXT`);
    }
  } catch {}
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = undefined as unknown as Database.Database;
  }
}
