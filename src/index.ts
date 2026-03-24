import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createApp } from './api';
import { setBeaconId, setDhtStatus } from './api/health';
import { DhtDiscovery } from './dht';
import { getDb } from './db';
import { SyncManager } from './sync';
import { NetworkPublisher } from './sync/network-publisher';
import { ConversationPoller } from './sync/conversation-poller';
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
const HOST = process.env.HOST || '127.0.0.1';

function isNonLocalhost(host: string): boolean {
  return host !== '127.0.0.1' && host !== 'localhost' && host !== '::1';
}

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

// Generate or load a local auth token (prevents rogue local processes from accessing data)
function getOrCreateLocalToken(): string {
  const tokenFile = path.join(process.cwd(), 'data', 'local-token');
  try {
    return fs.readFileSync(tokenFile, 'utf-8').trim();
  } catch {
    const token = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(tokenFile), { recursive: true });
    fs.writeFileSync(tokenFile, token, { mode: 0o600 });
    return token;
  }
}

const LOCAL_TOKEN = getOrCreateLocalToken();

// Secure sensitive files — restrict to owner-only read/write (chmod 600)
function secureSensitiveFiles(): void {
  const filesToSecure = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'pelagora.db'),
    path.join(process.cwd(), 'pelagora.db-wal'),
    path.join(process.cwd(), 'pelagora.db-shm'),
    path.join(process.cwd(), 'data', 'beacon-id'),
    path.join(process.cwd(), 'data', 'local-token'),
  ];
  for (const filePath of filesToSecure) {
    try {
      if (fs.existsSync(filePath)) {
        fs.chmodSync(filePath, 0o600);
      }
    } catch {
      // Non-fatal: Windows doesn't support chmod, skip silently
    }
  }
}

async function main(): Promise<void> {
  // Ensure uploads directory exists
  fs.mkdirSync(path.join(process.cwd(), 'uploads'), { recursive: true });

  // Secure sensitive files on startup
  secureSensitiveFiles();

  // Initialize database
  getDb();
  console.log('[DB] SQLite initialized');

  // Create Express app with local auth token
  const app = createApp(LOCAL_TOKEN);
  app.set('beaconId', BEACON_ID);
  app.set('startTime', Date.now());
  setBeaconId(BEACON_ID);

  // Initialize network publisher (always — no API key needed)
  const webappUrl = process.env.REFFO_WEBAPP_URL || process.env.REFFO_API_URL || 'https://reffo.ai';
  const networkPublisher = new NetworkPublisher(BEACON_ID, webappUrl);
  app.set('networkPublisher', networkPublisher);
  networkPublisher.startReconciliation();
  networkPublisher.startHeartbeat();
  console.log('[Network] Publisher initialized — public items will be mirrored to', webappUrl);

  // Poll for conversation messages from webapp (no API key needed)
  const conversationPoller = new ConversationPoller(BEACON_ID, webappUrl);
  conversationPoller.start();
  app.set('conversationPoller', conversationPoller);

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

  // Wire DHT conversation sync: when a chat message is received via DHT, also push to webapp
  const syncMgr = app.get('syncManager') as SyncManager | undefined;
  if (syncMgr) {
    dht.setOnChatMessageReceived((data) => {
      syncMgr.pushConversationMessage({
        conversationId: data.conversationId,
        messageId: data.messageId,
        refId: data.refId,
        refName: data.refName,
        buyerBeaconId: data.senderBeaconId,
        messageType: data.messageType,
        content: data.content,
        amount: data.amount,
        currency: data.currency,
      }).catch(() => {});
    });
  }

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

  // Expose bound-host flag so the UI can show a warning banner
  app.set('nonLocalhost', isNonLocalhost(HOST));

  // Security status endpoint for UI
  app.get('/api/security-status', (_req, res) => {
    res.json({ nonLocalhost: isNonLocalhost(HOST) });
  });

  // Start HTTP server
  const server = app.listen(PORT, HOST, () => {
    console.log(`[Pelagora] Running on http://${HOST}:${PORT}`);

    if (isNonLocalhost(HOST)) {
      console.log('');
      console.log('\x1b[41m\x1b[97m !! SECURITY WARNING !! \x1b[0m');
      console.log('\x1b[91m   This beacon is listening on %s\x1b[0m', HOST);
      console.log('\x1b[91m   Anyone who can reach this port can access your data.\x1b[0m');
      console.log('\x1b[91m   Consider running behind a firewall or VPN.\x1b[0m');
      console.log('');
    }

    console.log(`[Pelagora] Node ID: ${BEACON_ID.slice(0, 16)}...`);
    console.log(`[Pelagora] Endpoints:`);
    console.log(`            GET  /              - Web UI`);
    console.log(`            GET  /health        - Node status`);
    console.log(`            GET  /taxonomy      - Category taxonomy`);
    console.log(`            GET  /refs          - List refs`);
    console.log(`            POST /refs          - Create ref`);
    console.log(`            POST /refs/:id/media - Upload media`);
    console.log(`            GET  /offers        - List offers`);
    console.log(`            POST /offers        - Create offer`);
    console.log(`            GET  /conversations  - List conversations`);
    console.log(`            POST /conversations  - Start conversation`);
    console.log(`            GET  /search?q=...  - Search peer network`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[Pelagora] Shutting down...');
    server.close();
    networkPublisher.stop();
    conversationPoller.stop();
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
  console.error('[Pelagora] Fatal error:', err);
  process.exit(1);
});
