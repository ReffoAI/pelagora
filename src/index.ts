import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createApp } from './api';
import { setBeaconId, setDhtStatus } from './api/health';
import { DhtDiscovery } from './dht';
import { getDb } from './db';
import { SyncManager } from './sync';
import { searchReffo } from './sync/reffo-client';
import { getVersion } from './version';
import { SkillLoader, createSkillRegistryRouter, createSkillExportRouter } from './skills';

// Load .env into process.env (no dotenv dependency)
function loadEnv(): void {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.split('#')[0].trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT || '3000', 10);

function getOrCreateBeaconId(): string {
  if (process.env.BEACON_ID) return process.env.BEACON_ID;
  const idFile = path.join(process.cwd(), 'data', 'beacon-id');
  try {
    return fs.readFileSync(idFile, 'utf-8').trim();
  } catch {
    const id = crypto.randomUUID();
    fs.mkdirSync(path.dirname(idFile), { recursive: true });
    fs.writeFileSync(idFile, id);
    return id;
  }
}

const BEACON_ID = getOrCreateBeaconId();

async function main(): Promise<void> {
  // Ensure uploads directory exists
  fs.mkdirSync(path.join(process.cwd(), 'uploads'), { recursive: true });

  // Initialize database
  getDb();
  console.log('[DB] SQLite initialized');

  // Create Express app
  const app = createApp();
  app.set('beaconId', BEACON_ID);
  app.set('startTime', Date.now());
  setBeaconId(BEACON_ID);

  // Initialize Reffo.ai sync if API key is configured
  const reffoApiKey = process.env.REFFO_API_KEY;
  if (reffoApiKey) {
    const reffoUrl = process.env.REFFO_API_URL || 'https://reffo.ai';
    const syncManager = new SyncManager(reffoApiKey, BEACON_ID, reffoUrl);
    const beaconUrl = process.env.BEACON_URL || `http://localhost:${PORT}`;
    app.set('syncManager', syncManager);

    syncManager.registerBeacon('Reffo Beacon', getVersion(), beaconUrl)
      .then(result => {
        if (result.ok) {
          syncManager.registered = true;
          syncManager.lastError = null;
          console.log('[Sync] Registered with Reffo.ai');
          syncManager.startHeartbeat();
        } else {
          syncManager.registered = false;
          syncManager.lastError = result.error || 'Registration failed';
          console.warn('[Sync] Registration failed:', result.error);
        }
      })
      .catch(err => {
        syncManager.lastError = err.message;
        console.warn('[Sync] Registration error:', err.message);
      });
  }

  // Start DHT discovery
  const dht = new DhtDiscovery(BEACON_ID);
  dht.httpPort = PORT;
  app.set('dht', dht);

  // Load skill plugins
  const db = getDb();
  const skillLoader = new SkillLoader(db, BEACON_ID, dht);
  await skillLoader.loadAll(app);

  // Mount skill registry API and export routes
  app.use('/skills', createSkillRegistryRouter(skillLoader.getRegistry()));
  app.use('/skills', createSkillExportRouter(skillLoader.getSkills()));

  // Expose DHT + Reffo search endpoint
  app.get('/search', async (req, res) => {
    const { q, c, sc, maxPrice, lat, lng, radius, source } = req.query;
    const searchSource = typeof source === 'string' ? source : 'all';
    const query = {
      search: typeof q === 'string' ? q : undefined,
      category: typeof c === 'string' ? c : undefined,
      subcategory: typeof sc === 'string' ? sc : undefined,
      maxPrice: typeof maxPrice === 'string' ? parseFloat(maxPrice) : undefined,
      lat: typeof lat === 'string' ? parseFloat(lat) : undefined,
      lng: typeof lng === 'string' ? parseFloat(lng) : undefined,
      radiusMiles: typeof radius === 'string' ? parseFloat(radius) : undefined,
    };

    const dhtPromise = (searchSource === 'reffo')
      ? Promise.resolve([])
      : dht.queryPeers(query);

    const reffoUrl = process.env.REFFO_API_URL || 'https://reffo.ai';
    const reffoPromise = (searchSource === 'beacons')
      ? Promise.resolve({ results: [], total: 0 })
      : searchReffo({
          search: query.search,
          category: query.category,
          lat: query.lat,
          lng: query.lng,
          radiusMiles: query.radiusMiles,
          sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
        }, reffoUrl);

    const [dhtResult, reffoResult] = await Promise.allSettled([dhtPromise, reffoPromise]);

    const dhtResponses = dhtResult.status === 'fulfilled' ? dhtResult.value : [];
    const reffoData = reffoResult.status === 'fulfilled' ? reffoResult.value : { results: [], total: 0 };

    // Build DHT results with source tag
    const dhtResults = dhtResponses.map(r => ({
      beaconId: r.beaconId,
      source: 'dht' as const,
      ...(r.payload as object),
    }));

    // Convert Reffo results to peer-like format with source tag
    const reffoResults = reffoData.results.map(r => ({
      beaconId: r.beaconId,
      source: 'reffo' as const,
      refs: [{
        id: r.localId,
        name: r.name,
        description: r.description,
        category: r.category,
        subcategory: r.subcategory,
        listingStatus: r.listingStatus,
        condition: r.condition,
        locationCity: r.location?.city || null,
        locationState: r.location?.state || null,
        locationZip: r.location?.zip || null,
        createdAt: r.createdAt,
      }],
      offers: r.price != null ? [{
        refId: r.localId,
        price: r.price,
        priceCurrency: r.currency,
        status: 'active',
      }] : [],
      media: r.photos.length > 0 ? {
        [r.localId]: r.photos.map((url, i) => ({
          mediaType: 'photo',
          filePath: url,
          sortOrder: i,
        })),
      } : {},
    }));

    res.json({
      peers: dhtResults.length,
      reffoTotal: reffoData.total,
      results: [...dhtResults, ...reffoResults],
    });
  });

  await dht.start((peerCount) => {
    setDhtStatus({ connected: dht.isConnected, peers: peerCount });
  });

  setDhtStatus({ connected: dht.isConnected, peers: dht.peerCount });

  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`[Beacon] Reffo Beacon running on http://localhost:${PORT}`);
    console.log(`[Beacon] ID: ${BEACON_ID.slice(0, 16)}...`);
    console.log(`[Beacon] Endpoints:`);
    console.log(`         GET  /              - Web UI`);
    console.log(`         GET  /health        - Beacon status`);
    console.log(`         GET  /taxonomy      - Category taxonomy`);
    console.log(`         GET  /refs          - List refs`);
    console.log(`         POST /refs          - Create ref`);
    console.log(`         POST /refs/:id/media - Upload media`);
    console.log(`         GET  /offers        - List offers`);
    console.log(`         POST /offers        - Create offer`);
    console.log(`         GET  /negotiations  - List negotiations`);
    console.log(`         POST /negotiations  - Create proposal`);
    console.log(`         GET  /search?q=...  - Search peer network`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[Beacon] Shutting down...');
    server.close();
    // Force exit after 2s if DHT hangs
    const forceExit = setTimeout(() => process.exit(0), 2000);
    try { await dht.stop(); } catch {}
    clearTimeout(forceExit);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[Beacon] Fatal error:', err);
  process.exit(1);
});
