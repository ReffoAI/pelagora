import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createApp } from './api';
import { setBeaconId, setDhtStatus } from './api/health';
import { DhtDiscovery } from './dht';
import { getDb } from './db';

const PORT = parseInt(process.env.PORT || '3000', 10);
const BEACON_ID = process.env.BEACON_ID || crypto.randomBytes(32).toString('hex');

async function main(): Promise<void> {
  // Ensure uploads directory exists
  fs.mkdirSync(path.join(process.cwd(), 'uploads'), { recursive: true });

  // Initialize database
  getDb();
  console.log('[DB] SQLite initialized');

  // Create Express app
  const app = createApp();
  app.set('beaconId', BEACON_ID);
  setBeaconId(BEACON_ID);

  // Start DHT discovery
  const dht = new DhtDiscovery(BEACON_ID);
  dht.httpPort = PORT;
  app.set('dht', dht);

  // Expose DHT search endpoint
  app.get('/search', async (req, res) => {
    const { q, c, sc, maxPrice } = req.query;
    const query = {
      search: typeof q === 'string' ? q : undefined,
      category: typeof c === 'string' ? c : undefined,
      subcategory: typeof sc === 'string' ? sc : undefined,
      maxPrice: typeof maxPrice === 'string' ? parseFloat(maxPrice) : undefined,
    };
    const responses = await dht.queryPeers(query);
    res.json({
      peers: responses.length,
      results: responses.map(r => ({
        beaconId: r.beaconId,
        ...(r.payload as object),
      })),
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
    console.log(`         GET  /items         - List items`);
    console.log(`         POST /items         - Create item`);
    console.log(`         POST /items/:id/media - Upload media`);
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
    await dht.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[Beacon] Fatal error:', err);
  process.exit(1);
});
