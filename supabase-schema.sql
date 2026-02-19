-- =============================================================================
-- Reffo Supabase Schema
-- Updated to match beacon SQLite features: media, negotiations, listing_status,
-- quantity, subcategory, SKU
-- =============================================================================

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================================================
-- TABLES
-- =============================================================================

-- Users table (handled by Supabase Auth, but add profile)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Beacons (self-hosted or managed)
CREATE TABLE beacons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  beacon_url TEXT,  -- NULL for managed beacons
  beacon_type TEXT NOT NULL CHECK (beacon_type IN ('self_hosted', 'managed')),
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline')),
  last_heartbeat TIMESTAMP,
  webhook_id TEXT UNIQUE,
  sync_mode TEXT DEFAULT 'metadata_only' CHECK (sync_mode IN ('metadata_only', 'full_sync')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Items (refs)
CREATE TABLE refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beacon_id UUID REFERENCES beacons(id) ON DELETE CASCADE,
  ref_type TEXT NOT NULL CHECK (ref_type IN ('Product', 'Offer', 'Organization')),

  -- Schema.org fields
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  sku TEXT,

  -- Pricing
  price NUMERIC,
  currency TEXT DEFAULT 'USD',

  -- Quantity
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Negotiation metadata (Reffo extensions)
  negotiable BOOLEAN DEFAULT true,
  min_acceptable_price NUMERIC,

  -- Listing status (replaces visibility_state)
  -- private: not discoverable
  -- for_sale: listed with price
  -- willing_to_sell: no fixed price, open to offers
  listing_status TEXT DEFAULT 'private'
    CHECK (listing_status IN ('private', 'for_sale', 'willing_to_sell', 'archived_sold', 'archived_deleted')),

  -- Location (PostGIS)
  location_point GEOMETRY(Point, 4326),
  location_data JSONB,

  -- Full Schema.org data
  schema_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Item media (photos and videos)
-- Mirrors beacon's item_media table
-- Constraints: max 4 photos, 1 video per item (enforced in app, not DB)
CREATE TABLE ref_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id UUID NOT NULL REFERENCES refs(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Offers / Negotiations
-- Combines original Supabase offers with beacon's negotiations table
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES refs(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id),
  seller_id UUID REFERENCES auth.users(id),

  -- Snapshot of item name at time of offer
  item_name TEXT,

  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  conditions TEXT,
  message TEXT,

  -- Role perspective for P2P sync
  role TEXT CHECK (role IN ('buyer', 'seller')),

  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'withdrawn', 'expired', 'sold')),

  expires_at TIMESTAMP,

  -- Negotiation / counter-offer fields
  counter_amount NUMERIC,
  counter_message TEXT,
  response_message TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  rate_limit_per_month INTEGER DEFAULT 1000,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Queued Offers (when beacon offline)
CREATE TABLE queued_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beacon_id UUID REFERENCES beacons(id) ON DELETE CASCADE,
  offer_data JSONB NOT NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'delivered', 'expired')),
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP
);

-- Webhooks
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  filters JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Beacons
CREATE INDEX idx_beacons_user_id ON beacons(user_id);
CREATE INDEX idx_beacons_status ON beacons(status);

-- Refs
CREATE INDEX idx_refs_beacon_id ON refs(beacon_id);
CREATE INDEX idx_refs_listing_status ON refs(listing_status);
CREATE INDEX idx_refs_category ON refs(category);
CREATE INDEX idx_refs_subcategory ON refs(subcategory);
CREATE INDEX idx_refs_location ON refs USING GIST(location_point);

-- Ref media
CREATE INDEX idx_ref_media_ref_id ON ref_media(ref_id);
CREATE INDEX idx_ref_media_type ON ref_media(ref_id, media_type);

-- Offers
CREATE INDEX idx_offers_item_id ON offers(item_id);
CREATE INDEX idx_offers_buyer_id ON offers(buyer_id);
CREATE INDEX idx_offers_seller_id ON offers(seller_id);
CREATE INDEX idx_offers_status ON offers(status);

-- API keys
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Proximity search (updated to use listing_status)
CREATE OR REPLACE FUNCTION nearby_items(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION DEFAULT 25
)
RETURNS SETOF refs AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM refs
  WHERE listing_status = 'for_sale'
    AND ST_DWithin(
      location_point,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_miles * 1609.34  -- Convert miles to meters
    )
  ORDER BY ST_Distance(
    location_point,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacons ENABLE ROW LEVEL SECURITY;
ALTER TABLE refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- ---- user_profiles ----

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- ---- beacons ----

CREATE POLICY "Users can view own beacons"
  ON beacons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own beacons"
  ON beacons FOR ALL
  USING (auth.uid() = user_id);

-- ---- refs ----

CREATE POLICY "Anyone can view for_sale items"
  ON refs FOR SELECT
  USING (listing_status = 'for_sale');

CREATE POLICY "Anyone can view willing_to_sell items"
  ON refs FOR SELECT
  USING (listing_status = 'willing_to_sell');

CREATE POLICY "Users can view own items"
  ON refs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM beacons
      WHERE beacons.id = refs.beacon_id
      AND beacons.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own items"
  ON refs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM beacons
      WHERE beacons.id = refs.beacon_id
      AND beacons.user_id = auth.uid()
    )
  );

-- ---- ref_media ----

CREATE POLICY "Anyone can view media for listed items"
  ON ref_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM refs
      WHERE refs.id = ref_media.ref_id
      AND refs.listing_status IN ('for_sale', 'willing_to_sell')
    )
  );

CREATE POLICY "Users can view own item media"
  ON ref_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM refs
      JOIN beacons ON beacons.id = refs.beacon_id
      WHERE refs.id = ref_media.ref_id
      AND beacons.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own item media"
  ON ref_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM refs
      JOIN beacons ON beacons.id = refs.beacon_id
      WHERE refs.id = ref_media.ref_id
      AND beacons.user_id = auth.uid()
    )
  );

-- ---- offers ----

CREATE POLICY "Sellers can view offers on their items"
  ON offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM refs
      JOIN beacons ON beacons.id = refs.beacon_id
      WHERE refs.id = offers.item_id
      AND beacons.user_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can view their own offers"
  ON offers FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view offers by seller_id"
  ON offers FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Anyone can create offers"
  ON offers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Offer participants can update"
  ON offers FOR UPDATE
  USING (
    auth.uid() = buyer_id
    OR auth.uid() = seller_id
    OR EXISTS (
      SELECT 1 FROM refs
      JOIN beacons ON beacons.id = refs.beacon_id
      WHERE refs.id = offers.item_id
      AND beacons.user_id = auth.uid()
    )
  );

-- ---- api_keys ----

CREATE POLICY "Users can manage own API keys"
  ON api_keys FOR ALL
  USING (auth.uid() = user_id);
