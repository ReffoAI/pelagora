#!/bin/bash
# ─────────────────────────────────────────────────────────
#  Reffo Beacon — macOS Launcher
#  Double-click this file in Finder to start your beacon.
# ─────────────────────────────────────────────────────────
set -euo pipefail

# Resolve the directory this script lives in (handles symlinks)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

NODE="$SCRIPT_DIR/node/node"
APP_ENTRY="$SCRIPT_DIR/app/dist/index.js"

# ── Preflight checks ────────────────────────────────────
if [ ! -x "$NODE" ]; then
  echo "ERROR: Embedded Node.js not found at $NODE"
  echo "This bundle may be incomplete. Re-download from https://github.com/reffo/reffo-beacon/releases"
  read -rp "Press Enter to close..."
  exit 1
fi

if [ ! -f "$APP_ENTRY" ]; then
  echo "ERROR: App entry point not found at $APP_ENTRY"
  echo "This bundle may be incomplete. Re-download from https://github.com/reffo/reffo-beacon/releases"
  read -rp "Press Enter to close..."
  exit 1
fi

# ── First-run setup ─────────────────────────────────────
mkdir -p "$SCRIPT_DIR/data"
mkdir -p "$SCRIPT_DIR/uploads"

if [ ! -f "$SCRIPT_DIR/.env" ]; then
  BEACON_ID=$("$NODE" -e "console.log(require('crypto').randomUUID())")
  cat > "$SCRIPT_DIR/.env" <<EOF
# Reffo Beacon configuration — generated on first run
BEACON_ID=$BEACON_ID
PORT=3000
EOF
  echo "Created .env with BEACON_ID=$BEACON_ID"
fi

# ── Start the beacon ────────────────────────────────────
export PATH="$SCRIPT_DIR/node:$PATH"
PORT="${PORT:-3000}"

echo ""
echo "  ⚡ Reffo Beacon"
echo "  ────────────────────────────────"
echo "  Starting on http://localhost:$PORT"
echo "  Press Ctrl+C to stop."
echo ""

# Open browser after a short delay (in background)
(sleep 2 && open "http://localhost:$PORT") &

# Run the beacon (working directory = bundle root so data/ and uploads/ resolve)
cd "$SCRIPT_DIR"
exec "$NODE" "$APP_ENTRY"
