import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { SettingsQueries } from '../db';
import type { SellingScope } from '../types';

const router = Router();

function getEnvPath(): string {
  return path.join(process.cwd(), '.env');
}

function readEnvFile(): Record<string, string> {
  const envPath = getEnvPath();
  const vars: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return vars;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    vars[key] = value;
  }
  return vars;
}

function writeEnvVar(key: string, value: string): void {
  const envPath = getEnvPath();
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  }

  const lines = content.split('\n');
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith(`${key}=`)) {
      lines[i] = `${key}=${value}`;
      found = true;
      break;
    }
  }
  if (!found) {
    lines.push(`${key}=${value}`);
  }

  fs.writeFileSync(envPath, lines.join('\n'));
}

function removeEnvVar(key: string): void {
  const envPath = getEnvPath();
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n').filter(line => !line.trim().startsWith(`${key}=`));
  fs.writeFileSync(envPath, lines.join('\n'));
}

// GET /settings — Return current settings
router.get('/', (_req: Request, res: Response) => {
  const envVars = readEnvFile();
  const apiKey = process.env.REFFO_API_KEY || envVars['REFFO_API_KEY'] || '';

  const syncManager = _req.app.get('syncManager');
  const syncedCount = syncManager ? (() => {
    try {
      const { ItemQueries } = require('../db/queries');
      const items = new ItemQueries();
      return items.listSynced().length;
    } catch {
      return 0;
    }
  })() : 0;

  const settingsQ = new SettingsQueries();
  const locationSettings = settingsQ.get();

  res.json({
    apiKey: apiKey ? `${apiKey.slice(0, 12)}...` : '',
    hasApiKey: !!apiKey,
    connected: !!(syncManager && syncManager.registered),
    syncError: syncManager && !syncManager.registered ? (syncManager.lastError || null) : null,
    syncedItemCount: syncedCount,
    beaconId: _req.app.get('beaconId') || '',
    version: '0.1.0',
    uptime: Math.floor((Date.now() - (_req.app.get('startTime') || Date.now())) / 1000),
    location: locationSettings || null,
  });
});

// GET /settings/location — Return default location settings
router.get('/location', (_req: Request, res: Response) => {
  const settingsQ = new SettingsQueries();
  const settings = settingsQ.get();
  if (!settings) {
    return res.json({
      locationLat: null, locationLng: null, locationAddress: null,
      locationCity: null, locationState: null, locationZip: null,
      locationCountry: 'US', defaultSellingScope: 'global', defaultSellingRadiusMiles: 250,
    });
  }
  res.json(settings);
});

// POST /settings/location — Save default location settings
router.post('/location', (req: Request, res: Response) => {
  const { locationLat, locationLng, locationAddress, locationCity, locationState, locationZip, locationCountry, defaultSellingScope, defaultSellingRadiusMiles } = req.body;

  const validScopes: SellingScope[] = ['global', 'national', 'range'];
  if (defaultSellingScope && !validScopes.includes(defaultSellingScope)) {
    return res.status(400).json({ error: `Invalid selling scope: ${defaultSellingScope}` });
  }

  if (defaultSellingRadiusMiles !== undefined && (typeof defaultSellingRadiusMiles !== 'number' || defaultSellingRadiusMiles < 1)) {
    return res.status(400).json({ error: 'Selling radius must be a positive number' });
  }

  const settingsQ = new SettingsQueries();
  const updated = settingsQ.upsert({
    locationLat: locationLat != null ? Number(locationLat) : undefined,
    locationLng: locationLng != null ? Number(locationLng) : undefined,
    locationAddress: locationAddress ?? undefined,
    locationCity: locationCity ?? undefined,
    locationState: locationState ?? undefined,
    locationZip: locationZip ?? undefined,
    locationCountry: locationCountry ?? undefined,
    defaultSellingScope: defaultSellingScope ?? undefined,
    defaultSellingRadiusMiles: defaultSellingRadiusMiles != null ? Number(defaultSellingRadiusMiles) : undefined,
  });

  res.json({ ok: true, settings: updated });
});

// POST /settings/api-key — Save API key and initialize sync
router.post('/api-key', async (req: Request, res: Response) => {
  const { apiKey } = req.body;

  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'API key is required' });
  }

  if (!apiKey.startsWith('rfk_')) {
    return res.status(400).json({ error: 'Invalid API key format. Keys start with rfk_' });
  }

  // Save to .env and set in process
  writeEnvVar('REFFO_API_KEY', apiKey);
  process.env.REFFO_API_KEY = apiKey;

  // Initialize sync manager
  const { SyncManager } = require('../sync');
  const beaconId = req.app.get('beaconId');
  const reffoUrl = process.env.REFFO_API_URL || 'https://reffo.ai';
  const manager = new SyncManager(apiKey, beaconId, reffoUrl);

  // Try to register beacon (non-blocking — key is saved regardless)
  const beaconUrl = process.env.BEACON_URL || `http://localhost:${process.env.PORT || 3000}`;
  const regResult = await manager.registerBeacon('Reffo Beacon', '0.1.0', beaconUrl);

  if (regResult.ok) {
    manager.registered = true;
    manager.lastError = null;
    manager.startHeartbeat();
    req.app.set('syncManager', manager);
    res.json({ ok: true, message: 'Connected!' });
  } else {
    // Key is saved but connection failed — user can still sync locally
    manager.registered = false;
    manager.lastError = regResult.error || 'Connection failed';
    req.app.set('syncManager', manager);
    res.json({ ok: true, message: `API key saved. Reffo.ai connection pending — items can still be marked for sync locally.` });
  }
});

// POST /settings/retry-connection — Retry Reffo.ai registration
router.post('/retry-connection', async (req: Request, res: Response) => {
  const apiKey = process.env.REFFO_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'No API key configured' });
  }

  const { SyncManager } = require('../sync');
  const beaconId = req.app.get('beaconId');
  const reffoUrl = process.env.REFFO_API_URL || 'https://reffo.ai';
  const beaconUrl = process.env.BEACON_URL || `http://localhost:${process.env.PORT || 3000}`;

  // Reuse existing manager or create new one
  let manager = req.app.get('syncManager');
  if (!manager) {
    manager = new SyncManager(apiKey, beaconId, reffoUrl);
    req.app.set('syncManager', manager);
  }

  const regResult = await manager.registerBeacon('Reffo Beacon', '0.1.0', beaconUrl);

  if (regResult.ok) {
    manager.registered = true;
    manager.lastError = null;
    manager.startHeartbeat();
    req.app.set('syncManager', manager);
    res.json({ ok: true, message: 'Connected!' });
  } else {
    manager.registered = false;
    manager.lastError = regResult.error || 'Connection failed';
    res.json({ ok: false, error: regResult.error || 'Connection failed' });
  }
});

// DELETE /settings/api-key — Remove API key
router.delete('/api-key', (_req: Request, res: Response) => {
  const syncManager = _req.app.get('syncManager');
  if (syncManager) {
    syncManager.stopHeartbeat();
    _req.app.set('syncManager', null);
  }

  removeEnvVar('REFFO_API_KEY');
  delete process.env.REFFO_API_KEY;

  res.json({ ok: true, message: 'API key removed' });
});

// POST /settings/sync-item/:id — Toggle sync for an item
router.post('/sync-item/:id', async (req: Request, res: Response) => {
  const syncManager = req.app.get('syncManager');
  if (!syncManager) {
    return res.status(400).json({ error: 'Reffo.ai is not connected. Set an API key first.' });
  }

  const { id } = req.params;
  const { sync } = req.body;

  if (sync) {
    const result = await syncManager.syncItem(id);
    if (!result.ok) {
      return res.status(500).json({ error: result.error });
    }
    res.json({ ok: true, synced: true, warning: result.warning });
  } else {
    const result = await syncManager.unsyncItem(id);
    if (!result.ok) {
      return res.status(500).json({ error: result.error });
    }
    res.json({ ok: true, synced: false, warning: result.warning });
  }
});

export default router;
