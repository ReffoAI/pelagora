#!/bin/bash
# ─────────────────────────────────────────────────────────
#  Reffo Beacon — Build Release Bundle
#  Builds a platform-specific zip for the current OS/arch.
#
#  Usage:  ./scripts/build-release.sh
#  Output: release/reffo-beacon-<version>-<platform>-<arch>.zip
# ─────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROTOCOL_ROOT="$(cd "$PROJECT_ROOT/../reffo-protocol" && pwd)"

cd "$PROJECT_ROOT"

# ── Read version from package.json ──────────────────────
VERSION=$(node -e "console.log(require('./package.json').version)")
echo "Building reffo-beacon v$VERSION"

# ── Detect platform & architecture ──────────────────────
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin) PLATFORM="macos" ; NODE_OS="darwin" ;;
  Linux)  PLATFORM="linux" ; NODE_OS="linux"  ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM="windows" ; NODE_OS="win" ;;
  *) echo "ERROR: Unsupported OS: $OS" >&2; exit 1 ;;
esac

case "$ARCH" in
  arm64|aarch64) NODE_ARCH="arm64" ;;
  x86_64|x64)   NODE_ARCH="x64"   ;;
  *) echo "ERROR: Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

echo "Platform: $PLATFORM-$NODE_ARCH (Node: $NODE_OS-$NODE_ARCH)"

# ── Configuration ───────────────────────────────────────
NODE_VERSION="v20.18.1"
BUNDLE_NAME="reffo-beacon-v${VERSION}-${PLATFORM}-${NODE_ARCH}"
STAGING="$PROJECT_ROOT/release/staging/$BUNDLE_NAME"
RELEASE_DIR="$PROJECT_ROOT/release"

# ── Clean previous build ────────────────────────────────
rm -rf "$STAGING"
mkdir -p "$STAGING" "$RELEASE_DIR"

# ── Step 1: Download embedded Node.js ───────────────────
echo ""
echo "Step 1/6: Downloading Node.js $NODE_VERSION ($NODE_OS-$NODE_ARCH)..."

NODE_CACHE_DIR="$RELEASE_DIR/.node-cache"
mkdir -p "$NODE_CACHE_DIR"

if [ "$NODE_OS" = "win" ]; then
  NODE_ARCHIVE="node-${NODE_VERSION}-${NODE_OS}-${NODE_ARCH}.zip"
  NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_ARCHIVE}"
  NODE_CACHED="$NODE_CACHE_DIR/$NODE_ARCHIVE"

  if [ ! -f "$NODE_CACHED" ]; then
    curl -fSL --progress-bar -o "$NODE_CACHED" "$NODE_URL"
  else
    echo "  (cached)"
  fi

  # Extract just the node.exe binary
  mkdir -p "$STAGING/node"
  TEMP_NODE_DIR=$(mktemp -d)
  unzip -q "$NODE_CACHED" -d "$TEMP_NODE_DIR"
  cp "$TEMP_NODE_DIR/node-${NODE_VERSION}-${NODE_OS}-${NODE_ARCH}/node.exe" "$STAGING/node/node.exe"
  rm -rf "$TEMP_NODE_DIR"
else
  NODE_ARCHIVE="node-${NODE_VERSION}-${NODE_OS}-${NODE_ARCH}.tar.gz"
  NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_ARCHIVE}"
  NODE_CACHED="$NODE_CACHE_DIR/$NODE_ARCHIVE"

  if [ ! -f "$NODE_CACHED" ]; then
    curl -fSL --progress-bar -o "$NODE_CACHED" "$NODE_URL"
  else
    echo "  (cached)"
  fi

  # Extract just the node binary
  mkdir -p "$STAGING/node"
  tar -xzf "$NODE_CACHED" --strip-components=2 -C "$STAGING/node" \
    "node-${NODE_VERSION}-${NODE_OS}-${NODE_ARCH}/bin/node"
fi

echo "  Node.js binary: $(ls -lh "$STAGING/node/node"* | awk '{print $5}')"

# ── Step 2: Build reffo-protocol ────────────────────────
echo ""
echo "Step 2/6: Building @reffo/protocol..."

cd "$PROTOCOL_ROOT"
npm ci --ignore-scripts 2>/dev/null || npm install --ignore-scripts 2>/dev/null
npm run build
cd "$PROJECT_ROOT"

# ── Step 3: Compile TypeScript ──────────────────────────
echo ""
echo "Step 3/6: Compiling TypeScript..."

npm run build

# ── Step 4: Install production dependencies ─────────────
echo ""
echo "Step 4/6: Installing production dependencies..."

APP_DIR="$STAGING/app"
mkdir -p "$APP_DIR"

# Copy package.json and package-lock.json
cp package.json "$APP_DIR/"
if [ -f package-lock.json ]; then
  cp package-lock.json "$APP_DIR/"
fi

# Rewrite the file: dependency to a placeholder before npm ci
# We'll copy the actual protocol package manually afterward
cd "$APP_DIR"
node -e "
  const pkg = require('./package.json');
  // Remove the file: dependency — we copy it manually
  delete pkg.dependencies['@reffo/protocol'];
  require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
"

# Install production deps only
npm install --omit=dev --ignore-scripts 2>/dev/null || true

# Rebuild native modules for the target platform
npm rebuild 2>/dev/null || true

cd "$PROJECT_ROOT"

# ── Step 5: Copy compiled app & protocol ────────────────
echo ""
echo "Step 5/6: Assembling bundle..."

# Copy compiled JS
cp -r dist "$APP_DIR/dist"

# Copy @reffo/protocol into node_modules
mkdir -p "$APP_DIR/node_modules/@reffo/protocol"
cp "$PROTOCOL_ROOT/package.json" "$APP_DIR/node_modules/@reffo/protocol/"
cp -r "$PROTOCOL_ROOT/dist" "$APP_DIR/node_modules/@reffo/protocol/dist"
if [ -f "$PROTOCOL_ROOT/LICENSE" ]; then
  cp "$PROTOCOL_ROOT/LICENSE" "$APP_DIR/node_modules/@reffo/protocol/"
fi

# ── Step 6: Add launcher scripts + README ───────────────
echo ""
echo "Step 6/6: Adding launcher scripts..."

cp "$SCRIPT_DIR/launchers/start-beacon.command" "$STAGING/"
cp "$SCRIPT_DIR/launchers/start-beacon.bat" "$STAGING/"
cp "$SCRIPT_DIR/launchers/README.txt" "$STAGING/"
chmod +x "$STAGING/start-beacon.command"

# ── Create zip ──────────────────────────────────────────
echo ""
echo "Creating zip archive..."

cd "$RELEASE_DIR/staging"
ZIP_FILE="$RELEASE_DIR/${BUNDLE_NAME}.zip"
rm -f "$ZIP_FILE"

if command -v zip &>/dev/null; then
  zip -rq "$ZIP_FILE" "$BUNDLE_NAME"
else
  # Fallback for systems without zip
  tar -czf "${ZIP_FILE%.zip}.tar.gz" "$BUNDLE_NAME"
  ZIP_FILE="${ZIP_FILE%.zip}.tar.gz"
fi

cd "$PROJECT_ROOT"

# ── Cleanup staging ─────────────────────────────────────
rm -rf "$RELEASE_DIR/staging"

# ── Done ────────────────────────────────────────────────
ZIP_SIZE=$(ls -lh "$ZIP_FILE" | awk '{print $5}')
echo ""
echo "════════════════════════════════════════════════════"
echo "  Build complete!"
echo "  $ZIP_FILE"
echo "  Size: $ZIP_SIZE"
echo "════════════════════════════════════════════════════"
echo ""
echo "To test: unzip the archive, cd into it, and run:"
echo "  ./start-beacon.command    (macOS)"
echo "  start-beacon.bat          (Windows)"
