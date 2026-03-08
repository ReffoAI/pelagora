# Reffo Reverse Auction — Interactive Demo

This walkthrough demonstrates the reverse auction skill with two beacons. Perfect for video demos, onboarding, and testing.

## Prerequisites

- Node.js 20+
- Two terminal windows

## Setup

### Terminal 1 — Buyer Beacon (port 3000)

```bash
cd reffo-beacon
npm install
npm run dev
```

### Terminal 2 — Seller Beacon (port 3001)

```bash
cd reffo-beacon
PORT=3001 REFFO_DB_PATH=./seller-beacon.db npm run dev
```

Both beacons should show:
```
[Skills] Loaded 1 skill(s): reverse-auction
[Skills] Routes mounted: /skills/reverse-auction/
```

## Step 1: Verify Skills Installed

```bash
# Check buyer beacon
curl -s http://localhost:3000/skills | jq

# Check seller beacon
curl -s http://localhost:3001/skills | jq
```

Both should show the reverse auction skill.

## Step 2: Buyer Posts a Want

```bash
curl -s -X POST http://localhost:3000/skills/reverse-auction/wants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2025 Tesla Model 3",
    "description": "Looking for a 2025 Tesla Model 3, any color, under 10k miles. Prefer Long Range or Performance trim.",
    "category": "Vehicles",
    "subcategory": "Cars",
    "maxPrice": 42000,
    "priceCurrency": "USD",
    "condition": "Like New",
    "locationCity": "Austin",
    "locationState": "TX",
    "searchRadiusMiles": 200
  }' | jq
```

Save the returned `id` — you'll need it for bids.

## Step 3: Verify Want is Active

```bash
# List active wants on buyer beacon
curl -s http://localhost:3000/skills/reverse-auction/wants?status=active | jq
```

## Step 4: Seller Adds Inventory (Optional)

```bash
# Seller lists a Tesla on their beacon
curl -s -X POST http://localhost:3001/refs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2025 Tesla Model 3 Long Range - Pearl White",
    "description": "2025 Model 3 Long Range, Pearl White, black interior. 3,200 miles. Full self-driving capability.",
    "category": "Vehicles",
    "subcategory": "Cars",
    "listingStatus": "for_sale",
    "condition": "Like New"
  }' | jq
```

Save the `id` as the seller's `refId`.

## Step 5: Seller Sends a Bid

Replace `WANT_ID` with the want ID from Step 2, `BUYER_BEACON_ID` with the buyer's beacon ID, and `REF_ID` with the seller's ref ID from Step 4:

```bash
curl -s -X POST http://localhost:3001/skills/reverse-auction/bids \
  -H "Content-Type: application/json" \
  -d '{
    "wantId": "WANT_ID",
    "wantName": "2025 Tesla Model 3",
    "buyerBeaconId": "BUYER_BEACON_ID",
    "refId": "REF_ID",
    "refName": "2025 Tesla Model 3 Long Range - Pearl White",
    "price": 39500,
    "priceCurrency": "USD",
    "message": "Pearl White 2025 Model 3 LR, only 3,200 miles. Full self-driving included. Clean title, one owner."
  }' | jq
```

## Step 6: Buyer Reviews Bids

```bash
# List bids received (buyer side)
curl -s http://localhost:3000/skills/reverse-auction/bids?role=buyer | jq
```

## Step 7: Buyer Accepts the Best Bid

Replace `BID_ID` with the bid ID:

```bash
curl -s -X PATCH http://localhost:3000/skills/reverse-auction/bids/BID_ID/respond \
  -H "Content-Type: application/json" \
  -d '{
    "status": "accepted",
    "responseMessage": "Great price! Let us connect to arrange pickup."
  }' | jq
```

## Step 8: Mark as Sold

```bash
curl -s -X PATCH http://localhost:3000/skills/reverse-auction/bids/BID_ID/mark-sold \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

## Step 9: Verify Completion

```bash
# Want should be "fulfilled"
curl -s http://localhost:3000/skills/reverse-auction/wants?status=fulfilled | jq

# Bid should be "sold"
curl -s http://localhost:3000/skills/reverse-auction/bids/BID_ID | jq

# Seller sees "sold" status
curl -s http://localhost:3001/skills/reverse-auction/bids?role=seller | jq
```

## Step 10: Export Distribution Artifacts

```bash
# ClawHub SKILL.md
curl -s http://localhost:3000/skills/reverse-auction/export/clawhub

# OpenAPI spec
curl -s http://localhost:3000/skills/reverse-auction/export/openapi | jq

# Claude plugin manifest
curl -s http://localhost:3000/skills/reverse-auction/export/claude-plugin | jq
```

## Using with Claude Code (MCP)

Start the MCP server connected to your beacon:

```bash
REFFO_BEACON_URL=http://localhost:3000 npx @reffo/mcp
```

Then in Claude Code, use the prompts:

- **Buyer**: Use the `post-a-want` prompt — "I want a 2025 Tesla Model 3 under $42k"
- **Seller**: Use the `fulfill-a-want` prompt — browse wants and send competitive bids

## Cleanup

```bash
# Remove seller's test database
rm seller-beacon.db
```
