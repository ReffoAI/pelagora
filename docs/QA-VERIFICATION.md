# Reffo.ai QA Verification Checklist

> **Version:** 0.1.0-beta
> **Date:** 2026-02-18
>
> This document covers end-to-end testing of the Reffo.ai platform: the webapp (reffo-webapp), the beacon server (reffo-beacon), and the CLI installer (create-reffo-beacon). Work through each section in order. Mark each test case **Pass** or **Fail** and note any issues in the **Notes** column.

---

## Table of Contents

1. [Prerequisites & Setup](#1-prerequisites--setup)
2. [Webapp Verification](#2-webapp-verification)
3. [Beacon Server Verification](#3-beacon-server-verification)
4. [End-to-End Sync Verification](#4-end-to-end-sync-verification)
5. [CLI Installer Verification](#5-cli-installer-verification)
6. [Edge Cases & Error States](#6-edge-cases--error-states)
7. [Auto-Update Notification](#7-auto-update-notification)

---

## 1. Prerequisites & Setup

### 1.1 Supabase Project

You need a Supabase project with the following 6 tables and 1 storage bucket. Run the SQL below in the Supabase SQL Editor (**Settings > SQL Editor**).

#### Tables

```sql
-- 1. user_profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. beacons
CREATE TABLE beacons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  beacon_url TEXT,
  beacon_type TEXT NOT NULL CHECK (beacon_type IN ('self_hosted', 'managed')),
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline')),
  last_heartbeat TIMESTAMP,
  webhook_id TEXT UNIQUE,
  sync_mode TEXT DEFAULT 'metadata_only' CHECK (sync_mode IN ('metadata_only', 'full_sync')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. refs
CREATE TABLE refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beacon_id UUID REFERENCES beacons(id) ON DELETE CASCADE,
  ref_type TEXT NOT NULL CHECK (ref_type IN ('Product', 'Offer', 'Organization')),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  sku TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'USD',
  quantity INTEGER NOT NULL DEFAULT 1,
  negotiable BOOLEAN DEFAULT true,
  min_acceptable_price NUMERIC,
  listing_status TEXT DEFAULT 'private'
    CHECK (listing_status IN ('private', 'for_sale', 'willing_to_sell', 'for_rent', 'archived_sold', 'archived_deleted')),
  condition TEXT,
  attributes JSONB,
  selling_scope TEXT DEFAULT 'global',
  selling_radius_miles INTEGER,
  rental_terms TEXT,
  rental_deposit NUMERIC,
  rental_duration INTEGER,
  rental_duration_unit TEXT,
  location_point GEOMETRY(Point, 4326),
  location_data JSONB,
  schema_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. ref_media
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

-- 5. api_keys
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

-- 6. offers
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES refs(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id),
  seller_id UUID REFERENCES auth.users(id),
  item_name TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  conditions TEXT,
  message TEXT,
  role TEXT CHECK (role IN ('buyer', 'seller')),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'withdrawn', 'expired')),
  expires_at TIMESTAMP,
  counter_amount NUMERIC,
  counter_message TEXT,
  response_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### RLS Policies

Enable Row Level Security on every table, then run:

```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE refs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_media      ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys       ENABLE ROW LEVEL SECURITY;

-- user_profiles: users can view and update own profile
CREATE POLICY "Users can view own profile"   ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- beacons: users can view and manage own beacons
CREATE POLICY "Users can view own beacons"  ON beacons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own beacons" ON beacons FOR ALL   USING (auth.uid() = user_id);

-- refs: public reads for listed items, owner management
CREATE POLICY "Anyone can view for_sale items"        ON refs FOR SELECT USING (listing_status = 'for_sale');
CREATE POLICY "Anyone can view willing_to_sell items" ON refs FOR SELECT USING (listing_status = 'willing_to_sell');
CREATE POLICY "Anyone can view for_rent items"       ON refs FOR SELECT USING (listing_status = 'for_rent');
CREATE POLICY "Users can view own items"   ON refs FOR SELECT USING (
  beacon_id IN (SELECT id FROM beacons WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own items" ON refs FOR ALL USING (
  beacon_id IN (SELECT id FROM beacons WHERE user_id = auth.uid())
);

-- ref_media: public reads for listed item media, owner management
CREATE POLICY "Anyone can view listed item media" ON ref_media FOR SELECT USING (
  ref_id IN (SELECT id FROM refs WHERE listing_status IN ('for_sale', 'willing_to_sell', 'for_rent'))
);
CREATE POLICY "Users can view own item media"  ON ref_media FOR SELECT USING (
  ref_id IN (SELECT id FROM refs WHERE beacon_id IN (SELECT id FROM beacons WHERE user_id = auth.uid()))
);
CREATE POLICY "Users can manage own item media" ON ref_media FOR ALL USING (
  ref_id IN (SELECT id FROM refs WHERE beacon_id IN (SELECT id FROM beacons WHERE user_id = auth.uid()))
);

-- offers: buyers and sellers can see their own; anyone can create
CREATE POLICY "Sellers can view offers on their items" ON offers FOR SELECT USING (
  item_id IN (SELECT r.id FROM refs r JOIN beacons b ON r.beacon_id = b.id WHERE b.user_id = auth.uid())
);
CREATE POLICY "Buyers can view own offers"  ON offers FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers can view by seller_id" ON offers FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Authenticated users can create offers" ON offers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND item_id IN (
      SELECT id FROM refs
      WHERE listing_status IN ('for_sale', 'willing_to_sell', 'for_rent')
    )
  );
CREATE POLICY "Offer participants can update" ON offers FOR UPDATE USING (
  auth.uid() = buyer_id OR auth.uid() = seller_id
  OR item_id IN (SELECT r.id FROM refs r JOIN beacons b ON r.beacon_id = b.id WHERE b.user_id = auth.uid())
);

-- api_keys: users manage own keys
CREATE POLICY "Users can manage own API keys" ON api_keys FOR ALL USING (auth.uid() = user_id);
```

#### Storage Bucket

In **Supabase Dashboard > Storage**, create a **public** bucket named:

```
ref-media
```

This bucket stores item photos and videos. The file path structure is:

```
ref-media/{user_id}/{item_id}/{file_id}.{ext}
```

### 1.2 Environment Variables

#### Webapp (`reffo-webapp/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_API_URL=https://api.reffo.ai
```

#### Beacon (`reffo-beacon/.env`)

```env
PORT=3000
# BEACON_ID=            # auto-generated 64-char hex if omitted
REFFO_API_KEY=           # paste rfk_ key from webapp Account page
# REFFO_API_URL=https://reffo.ai
# BEACON_URL=http://localhost:3000
# REFFO_DB_PATH=./reffo-beacon.db
```

### 1.3 Starting the Servers

```bash
# Terminal 1 — Webapp
cd reffo-webapp
npm install
npm run dev
# Runs at http://localhost:3001 (or next available port)

# Terminal 2 — Beacon
cd reffo-beacon
npm install
npm run dev
# Runs at http://localhost:3000
```

Verify both servers start without errors before proceeding.

---

## 2. Webapp Verification

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
PASS | 2.1 | **Landing page loads** | Navigate to `http://localhost:3001/` | Landing page renders with branding, navigation, and call-to-action. No console errors. | ☐ | |
PASS | 2.2 | **Signup flow** | 1. Go to `/auth/signup` 2. Enter email, password (min 6 chars) 3. Submit | Success message: "Check your email - We sent a confirmation link to [email]". A `user_profiles` row is created in Supabase. | ☐ | |
PASS | 2.3 | **Login flow** | 1. Confirm email from step 2.2 2. Go to `/auth/login` 3. Enter credentials 4. Submit | Redirected to home page. Session persists on page refresh. | ☐ | |
PASS | 2.4 | **Password reset** | 1. Go to `/auth/reset-password` 2. Enter registered email 3. Submit | "Check your email" confirmation shown. Reset email arrives in inbox. | ☐ | |
PASS | 2.5 | **Protected route redirect** | 1. Log out 2. Navigate directly to `/account` | Redirected to `/auth/login`. Cannot access account page without authentication. | ☐ | |
PASS | 2.6 | **Account page — edit profile** | 1. Log in 2. Go to `/account` 3. Change display name 4. Click Save | Toast/message: "Profile saved." Refreshing the page shows updated name. | ☐ | |
PASS | 2.7 | **API key generation** | 1. Go to `/account` 2. Click "Generate API Key" | Key displayed with `rfk_` prefix. Alert: "Your new API key (copy it now -- it will not be shown again):". Copy button works. Key appears in key list with prefix only. | ☐ | |
PASS | 2.8 | **API key revocation** | 1. On `/account`, locate the key from 2.7 2. Click Revoke/Delete | Key disappears from the list. Using the old key in beacon returns 401. | ☐ | |
PASS | 2.9 | **My Listings — create item** | 1. Go to `/my-listings` 2. Click "Add New Item" 3. Fill in name, description, category, subcategory, SKU, price, quantity, listing status 4. Upload a photo 5. Save | Item appears in the grid. Photo thumbnail visible. All fields saved correctly. | ☐ | |
PASS | 2.10 | **My Listings — edit & delete** | 1. Click an item from 2.9 2. Edit the name and save 3. Return to grid, verify update 4. Delete the item | Edit: name updates immediately. Delete: item removed from grid. | ☐ | |
PASS | 2.11 | **Search page** | 1. Create items with `for_sale` and `willing_to_sell` statuses 2. Go to `/search` 3. Verify items appear 4. Try category/text filters | Listed items appear in search results. `private` items do NOT appear. Filters narrow results correctly. | ☐ | |
PASS | 2.12 | **Item detail & offer** | 1. Click a search result 2. View `/items/[id]` page 3. Check photo gallery 4. Click "Make Offer" 5. Enter amount and message 6. Submit | Detail page shows all item fields and gallery. Offer modal accepts amount. Success message: "Offer Sent - Your offer has been submitted. The seller will be notified." | ☐ | |
---

## 3. Beacon Server Verification

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
PASS | 3.1 | **Beacon starts and serves UI** | 1. Start beacon (`npm run dev`) 2. Open `http://localhost:3000` | Web UI loads with tabs: My Items, Search, Negotiations, Settings. No console errors. | ☐ | |
PASS | 3.2 | **Create items via UI** | 1. Go to "My Items" tab 2. Click "Add Item" 3. Fill in all fields (name, description, category, subcategory, SKU, quantity, listing status) 4. Upload a photo 5. Save | Item appears in grid. Photo thumbnail displays. All fields saved to local SQLite DB. | ☐ | |
PASS | 3.3 | **Settings — enter API key** | 1. Go to "Settings" tab 2. Paste a valid `rfk_` API key 3. Click Save | Status dot turns green. Text shows "Connected". Success message: "Connected!" | ☐ | |
PASS | 3.4 | **Settings — remove API key** | 1. On Settings tab, click "Remove" | Status dot turns red/gray. Text shows "Not Connected". API key input is cleared. | ☐ | |
PASS | 3.5 | **Per-item sync — toggle ON** | 1. Create an item (or use existing) 2. Toggle the "Share on Reffo" switch ON | Toast: "Item synced to Reffo.ai". Synced badge (blue "Synced" label) appears on item card. | ☐ | |
PASS | 3.6 | **Per-item sync — toggle OFF** | 1. Find a synced item 2. Toggle the switch OFF | Toast: "Item removed from Reffo.ai". Synced badge disappears. Item is removed from reffo.ai search. | ☐ | |
PASS | 3.7 | **Settings — synced item count** | 1. Go to Settings tab 2. Check the "Synced Items" count 3. Toggle a few items on/off 4. Return to Settings | Count reflects the actual number of items with sync enabled. | ☐ | |
PASS | 3.8 | **DHT/P2P search** | 1. Go to "Search" tab 2. Enter a search query 3. Submit | Search executes against peer network via `/search?q=...`. Results (if peers available) display in the UI. No errors on empty results. | ☐ | |

---

## 4. End-to-End Sync Verification

These tests verify the connection between the beacon and the webapp.

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
PASS | 4.1 | **API key connection** | 1. On webapp `/account`, generate a new API key 2. Copy the full key 3. On beacon Settings tab, paste the key and click Save | Beacon shows "Connected" (green dot). Beacon registers with reffo.ai (`beacons` row created in Supabase with `self_hosted` type). Heartbeat starts (every 5 minutes). | ☐ | |
PASS | 4.2 | **Sync item to webapp** | 1. Create an item on beacon 2. Toggle "Share on Reffo" ON 3. On webapp, go to `/search` | Item appears in webapp search results. Name, description, category, price, and listing status match. | ☐ | |
PASS | 4.3 | **Sync media to webapp** | 1. Upload a photo to a beacon item 2. Toggle sync ON (or re-sync if already on) 3. On webapp, open the item detail page | Photo appears in the webapp item gallery. Image loads from Supabase `ref-media` storage bucket. | ☐ | |
PASS | 4.4 | **Unsync item from webapp** | 1. On beacon, toggle "Share on Reffo" OFF for a synced item 2. On webapp, search for the item | Item no longer appears in webapp search results. The `refs` row is removed from Supabase (or listing_status set to private). | ☐ | |
PASS | 4.5 | **Webapp-only listing** | 1. On webapp, go to `/my-listings` 2. Create an item with `for_sale` status 3. Go to `/search` | Item appears in search results. This confirms webapp-created items work independently of beacon sync. | ☐ | |

---

## 5. CLI Installer Verification

Run these tests from outside the reffo-beacon project directory.

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
PASS | 5.1 | **CLI prompts appear** | 1. `cd` to a temp directory 2. Run `node /path/to/create-reffo-beacon/src/index.js` | Banner: "create-reffo-beacon v0.1.0". Prompts appear in order: Project directory, HTTP port, Package manager, API key. | ☐ | |
PASS | 5.2 | **Valid API key accepted** | 1. At the API key prompt, enter a key starting with `rfk_` | Key is accepted without warnings. Installer proceeds to file generation. | ☐ | |
PASS 5.3 | **Invalid API key — warning** | 1. At the API key prompt, enter a key NOT starting with `rfk_` | Warning: `Warning: Reffo API keys start with "rfk_". The key you entered may be invalid.` Prompt: `Use this key anyway? [y/N]:`. Entering `N` (or Enter) skips with message: `Skipped — you can add it later in .env`. | ☐ | |
PASS | 5.4 | **Generated project structure** | 1. Complete the installer with defaults 2. Inspect the generated directory | Contains: `.env` (with PORT and REFFO_API_KEY filled in), `package.json` (with `reffo-beacon` dependency and start/dev scripts), `.gitignore` (excludes node_modules, .env, *.db, uploads/), `uploads/` directory (empty), `node_modules/` (dependencies installed). Success messages: `Created .env`, `Created package.json`, `Created .gitignore`, `Created uploads/`, `Dependencies installed`, `Reffo Beacon is ready!` | ☐ | |

---

## 6. Edge Cases & Error States

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
PASS | 6.1 | **Offer while logged out** | 1. Log out of webapp 2. Go to `/search` and click an item 3. Click "Make Offer" | Modal shows: **"Sign in to make an offer"** with subtext "You need an account to send offers to sellers." No offer form is displayed. | ☐ | |
PASS | 6.2 | **Bad API key prefix in beacon** | 1. On beacon Settings tab 2. Enter a key that does NOT start with `rfk_` 3. Click Save | Error message displayed. Key is rejected. Status stays "Not Connected". | ☐ | |
PASS | 6.3 | **Sync toggle with no API key** | 1. Ensure no API key is configured in beacon Settings 2. Toggle "Share on Reffo" ON for an item | Error toast: "Reffo.ai is not connected. Set an API key first." Toggle reverts to OFF. | ☐ | |
PASS | 6.4 | **Search with no results** | 1. On webapp `/search`, enter a nonsense query (e.g. "xyzzy999") | Empty state shown — no items displayed, no errors. Page remains functional. | ☐ | |
PASS | 6.5 | **My Listings — empty state** | 1. Log in to webapp with a new account (no items) 2. Go to `/my-listings` | Message: "No items yet. Add your first listing to get started." | ☐ | |
PASS | 6.6 | **No API keys — empty state** | 1. Log in to webapp with a new account 2. Go to `/account` and check the API keys section | Message: "No API keys yet. Generate one to get started." | ☐ | |
PASS | 6.7 | **Media upload limits** | 1. On webapp My Listings, add an item 2. Try uploading 5 photos | Error: "Maximum 4 photos allowed." Fifth photo is rejected. | ☐ | |
PASS | 6.8 | **Beacon health endpoint** | `curl http://localhost:3000/health` | Returns JSON with `id`, `version`, `itemCount`, `offerCount`, `uptime`, and `dht` status. HTTP 200. | ☐ | |
PASS | 6.10 | **Password too short on signup** | 1. Go to `/auth/signup` 2. Enter a password shorter than 6 characters 3. Submit | Error: "Password must be at least 6 characters." Account is not created. | ☐ | |

---

## 7. Auto-Update Notification

These tests verify the update notification system. You do **not** need to publish an actual new version — just set an environment variable to simulate a newer version being available.

### Setup

Add `LATEST_BEACON_VERSION` to your webapp `.env.local`:

```env
# In reffo-webapp/.env.local — add this line
LATEST_BEACON_VERSION=0.2.0
```

Restart the webapp dev server after adding the env var. No changes are needed to the beacon itself.

### Test Cases

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 7.1 | **Health endpoint returns update info** | 1. Start beacon with API key configured 2. Wait for first heartbeat (a few seconds) 3. `curl http://localhost:3000/health` | Response JSON includes `"updateAvailable": true`, `"latestVersion": "0.2.0"`, and `"version": "0.1.0"`. | ☐ | |
| 7.2 | **Update banner appears in Settings** | 1. Open beacon UI at `http://localhost:3000` 2. Click "Settings" tab | Purple/pink gradient banner appears below the "Settings" heading showing "Update available: v0.2.0" and "Run: npx create-reffo-beacon@latest". | ☐ | |
| 7.3 | **Banner hidden when no update** | 1. In webapp `.env.local`, change `LATEST_BEACON_VERSION=0.1.0` (same as current) 2. Restart webapp dev server 3. Wait for next beacon heartbeat (or restart beacon) 4. Open Settings tab | No update banner is visible. | ☐ | |
| 7.4 | **Banner hidden when env var removed** | 1. Remove `LATEST_BEACON_VERSION` from webapp `.env.local` 2. Restart webapp dev server 3. Wait for next heartbeat (or restart beacon) 4. Open Settings tab | No update banner is visible. Health endpoint shows `"updateAvailable": false`, `"latestVersion": null`. | ☐ | |
| 7.5 | **Version from package.json** | 1. Check beacon health: `curl http://localhost:3000/health` 2. Check `"version"` field 3. Compare with `package.json` version | The `version` field matches `package.json` exactly (currently `0.1.0`). It is NOT hardcoded. | ☐ | |
| 7.6 | **Settings page shows dynamic version** | 1. Open Settings tab 2. Check "Beacon Info" section | Version shown matches `package.json` version. | ☐ | |
| 7.7 | **No update without API key** | 1. Remove API key from beacon (Settings > Remove) 2. Open Settings tab | No update banner appears (heartbeat doesn't run without an API key, so no update info is received). | ☐ | |
| 7.8 | **Other tabs unchanged** | 1. With update banner active, click through My Items, Search, and Negotiations tabs | All tabs function normally. Banner only appears on Settings tab. | ☐ | |

---

** HOLD FOR NOW **
**Invalid API key on sync endpoint** | `curl -H "Authorization: Bearer invalid_key" https://reffo.ai/api/sync/beacon` | Returns `{"error": "Invalid API key format"}` with HTTP 401. | ☐ | |

** FEATURE ADDS **




## Summary

| Section | Total Tests | Passed | Failed |
|---------|-------------|--------|--------|
| 2. Webapp Verification | 12 | | |
| 3. Beacon Server Verification | 8 | | |
| 4. End-to-End Sync Verification | 5 | | |
| 5. CLI Installer Verification | 4 | | |
| 6. Edge Cases & Error States | 10 | | |
| 7. Auto-Update Notification | 8 | | |
| **Total** | **47** | | |

**Tested by:** ____________________
**Date:** ____________________
**Environment:** ____________________
**Overall Result:** ☐ Pass / ☐ Fail
