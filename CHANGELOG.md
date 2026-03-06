# Changelog

All notable changes to **reffo-beacon** will be documented in this file.

This project follows [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- Restyle Settings page to match webapp Account page (scoped `.settings-card` CSS)
- Show promo card in settings when no API key, hide controls when connected
- Add "Link to Reffo.ai" button in header when no API key configured
- Add profile picture upload to beacon settings

### Fixed
- Nothing yet

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
