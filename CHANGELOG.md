# Changelog

All notable changes to **pelagora** will be documented in this file.

This project follows [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

## [0.2.2] — 2026-03-26

### Added
- Multi-stage UPC barcode resolution pipeline: UPCitemdb → Serper+AI → Direct AI → Reffo.ai fallback
- UPC normalization with multi-format digit variants (EAN-8, UPC-A, EAN-13)
- SKU-based product catalog cache with index for fast UPC lookups
- Rich barcode result card: product image, name, price with confidence badge, attributes, product URL
- Unidentified barcode flow: manual product name entry with retry
- Support for manual name override on barcode retry (`{ upc, name }` request body)

### Changed
- Barcode route now resolves UPC → product name before enrichment (previously treated UPC digits as a product name)
- Cache lookup uses `sku` field instead of `name_normalized` for barcode results

---

## [Unreleased]

> **Note:** Versions 0.1.1–0.1.8 were published to npm but not documented here. Entries below cover all changes since 0.1.0.

### Added
- Network publishing: auto-mirror public items to reffo.ai
- Email-style Inbox unifying Negotiations + Messages with reply mechanism
- Currency formatting and offer delivery via heartbeat
- Bidirectional sync: pull refs from Reffo.ai during heartbeat
- Sync modal with "Make me sell" for willing_to_sell listings
- AI suggested image card in create and detail views
- Resolved and Archived tabs for negotiations with bell links
- Scan-to-list, collections, and barcode features (webapp parity)
- AI product lookup for all listing statuses
- Home landing page tab with hero, search, and listings grid
- AI Quick Start feature for beacon dashboard and sidebar
- Bulk status updates, multi-select, and dashboard admin view
- Smart Listing Autofill (multi-provider AI product lookup)
- Skills plugin system with reverse auction skill
- Reffo.ai search alongside DHT peers with source filter
- Favorites feature and auto-update notification system
- Input sanitization on all API and DHT boundaries
- Support page with contact form via Resend
- Card/row layout toggle and Airbnb-style image lightbox gallery
- Profile picture upload to beacon settings
- "Link to Reffo.ai" button in header when no API key
- Legal pages and expanded dropdown menu

### Changed
- Rebrand: reffo-beacon → pelagora throughout (DB path, DHT topic, launchers, package name, imports, CI)
- Rebrand node UI to match official Pelagora brand system
- Restyle Settings page to match webapp Account page
- Show promo card in settings when no API key, hide controls when connected
- Switch sidebar to position:fixed with independent scroll
- Set heartbeat interval to 1 minute for production
- Overhaul category taxonomy: 15 categories, 97 subcategories, 32 schemas
- Update footer: Pelagora logo, sidebar overlap fix, white card background
- Show recent listings as single non-wrapping card row
- Remove version from release bundle filename for stable download URLs
- Pre-launch polish: tiered media limits, hide video, AI improvements

### Fixed
- Reorder sidebar: actions and search network to top, AI quickstart above settings
- Link dashboard stat cards to their respective pages
- SyntaxError in onclick handlers (escapeJs instead of escapeHtml)
- Fix escapeJs regex escaping for template literal context
- Show "Free" for zero-price listings, confirm before publishing with no price
- Send price: 0 instead of undefined for items with no active offer
- Hide sidebar scrollbar while keeping scroll functionality
- Archive UI refresh and auto-download AI product images
- Remove font-family from JS string-concatenated inline styles

## [0.1.0] - 2026-02-18

Initial public beta.

### Added
- Self-hosted beacon server with Express API and SQLite database
- Web UI with tabs: My Refs, Search, Negotiations, Settings
- Hyperswarm DHT peer-to-peer discovery and search
- Ref (item) CRUD with photos, categories, subcategories, and SKU
- Listing statuses: private, for_sale, willing_to_sell, for_rent
- Rental fields: terms, deposit, duration, duration unit
- Item location with city, state, zip, country, lat/lng
- Selling scope (global, national, range) and radius
- Category-specific attributes and condition field
- Offer and negotiation system with proposals and responses
- Per-item sync toggle to share listings on Reffo.ai
- Reffo.ai API key connection with status indicator
- Media uploads (photos) with gallery display
- Schema.org JSON-LD structured data
- Downloadable bundles with embedded Node.js runtime
- Under Contract / Sold flow and item archive system
- Location-based search with geocoding and radius filtering
- AGPL-3.0 license
