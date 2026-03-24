import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import { SettingsQueries } from '../db';
import type { SellingScope } from '@pelagora/pim-protocol';
import { sanitizeObject } from '@pelagora/pim-protocol';
import { getVersion } from '../version';
import { getDb } from '../db/schema';
import { getAttributeKeys } from '../ref-schemas';
import { callProductLookup, type AiProvider } from '../ai/product-lookup';

const PROFILE_DIR = path.join(process.cwd(), 'uploads', 'profile');

const profileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
    cb(null, PROFILE_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${uuid()}${ext}`);
  },
});

const profileUpload = multer({
  storage: profileStorage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

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
      const { RefQueries } = require('../db/queries');
      const refs = new RefQueries();
      return refs.listSynced().length;
    } catch {
      return 0;
    }
  })() : 0;

  const settingsQ = new SettingsQueries();
  const locationSettings = settingsQ.get();

  const aiProvider = process.env.AI_PROVIDER || envVars['AI_PROVIDER'] || 'reffo';
  const aiApiKey = process.env.AI_API_KEY || envVars['AI_API_KEY'] || '';

  res.json({
    apiKey: apiKey ? `${apiKey.slice(0, 12)}...` : '',
    hasApiKey: !!apiKey,
    connected: !!(syncManager && syncManager.registered),
    syncError: syncManager && !syncManager.registered ? (syncManager.lastError || null) : null,
    syncedItemCount: syncedCount,
    beaconId: _req.app.get('beaconId') || '',
    version: getVersion(),
    uptime: Math.floor((Date.now() - (_req.app.get('startTime') || Date.now())) / 1000),
    location: locationSettings || null,
    profilePicturePath: locationSettings?.profilePicturePath || null,
    aiProvider,
    aiApiKeySet: !!aiApiKey,
    reffoApiUrl: process.env.REFFO_API_URL || 'https://reffo.ai',
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
  const { locationLat, locationLng, locationAddress, locationCity, locationState, locationZip, locationCountry, defaultSellingScope, defaultSellingRadiusMiles, acceptedPaymentMethods } = sanitizeObject(req.body);

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
    acceptedPaymentMethods: Array.isArray(acceptedPaymentMethods) ? acceptedPaymentMethods : undefined,
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
  const regResult = await manager.registerBeacon('Beacon', getVersion(), beaconUrl);

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

  const regResult = await manager.registerBeacon('Beacon', getVersion(), beaconUrl);

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

// POST /settings/price-estimate — Proxy price estimate to webapp
router.post('/price-estimate', async (req: Request, res: Response) => {
  const apiKey = process.env.REFFO_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'Not connected to Reffo.ai. Set an API key first.' });
  }

  const reffoUrl = process.env.REFFO_API_URL || 'https://reffo.ai';

  try {
    const upstream = await fetch(`${reffoUrl}/api/price-estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json(data);
    }

    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Reffo.ai price estimate service' });
  }
});

// POST /settings/ai-provider — Save AI provider settings
router.post('/ai-provider', (req: Request, res: Response) => {
  const { provider, apiKey } = req.body;

  const validProviders = ['reffo', 'anthropic', 'openai', 'google', 'xai'];
  if (!provider || !validProviders.includes(provider)) {
    return res.status(400).json({ error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` });
  }

  if (provider !== 'reffo' && (!apiKey || typeof apiKey !== 'string')) {
    return res.status(400).json({ error: 'API key is required for non-Reffo providers' });
  }

  writeEnvVar('AI_PROVIDER', provider);
  process.env.AI_PROVIDER = provider;

  if (provider !== 'reffo' && apiKey) {
    writeEnvVar('AI_API_KEY', apiKey);
    process.env.AI_API_KEY = apiKey;
  } else {
    removeEnvVar('AI_API_KEY');
    delete process.env.AI_API_KEY;
  }

  res.json({ ok: true, provider });
});

// DELETE /settings/ai-provider — Remove AI provider settings (revert to reffo)
router.delete('/ai-provider', (_req: Request, res: Response) => {
  removeEnvVar('AI_PROVIDER');
  removeEnvVar('AI_API_KEY');
  delete process.env.AI_PROVIDER;
  delete process.env.AI_API_KEY;
  res.json({ ok: true, provider: 'reffo' });
});

// POST /settings/product-lookup — AI product lookup with multi-provider support
router.post('/product-lookup', async (req: Request, res: Response) => {
  const { name, category, subcategory } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const nameNormalized = name.toLowerCase().trim();
  const cat = (category || '').trim();
  const subcat = (subcategory || '').trim();

  // Check local SQLite cache
  const db = getDb();
  const cached = db.prepare(
    `SELECT * FROM product_catalog
     WHERE name_normalized = ? AND category = ? AND subcategory = ?
     AND expires_at > datetime('now')`
  ).get(nameNormalized, cat, subcat) as Record<string, unknown> | undefined;

  if (cached) {
    db.prepare(
      `UPDATE product_catalog SET lookup_count = lookup_count + 1 WHERE id = ?`
    ).run(cached.id);

    return res.json({
      description: cached.description,
      sku: cached.sku,
      product_url: cached.product_url,
      image_url: cached.image_url,
      subcategory: subcat || undefined,
      attributes: JSON.parse((cached.attributes as string) || '{}'),
      price_estimate: {
        low: cached.price_low,
        high: cached.price_high,
        typical: cached.price_typical,
        confidence: cached.price_confidence || 'low',
      },
      cached: true,
    });
  }

  // Determine provider
  const provider = (process.env.AI_PROVIDER || 'reffo').toLowerCase();
  const attributeKeys = getAttributeKeys(cat || undefined, subcat || undefined);

  try {
    let result: Record<string, unknown>;

    if (provider === 'reffo') {
      // Proxy to Reffo.ai
      const apiKey = process.env.REFFO_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'No AI provider configured. Either connect to Reffo.ai (Settings → API Key) or set up a direct AI provider (Settings → AI Provider).',
        });
      }

      const reffoUrl = process.env.REFFO_API_URL || 'https://reffo.ai';
      const upstream = await fetch(`${reffoUrl}/api/product-lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ name: name.trim(), category: cat, subcategory: subcat }),
      });

      if (!upstream.ok) {
        const errData = await upstream.json().catch(() => ({}));
        return res.status(upstream.status).json(errData);
      }

      result = await upstream.json() as Record<string, unknown>;
    } else {
      // Direct provider call
      const aiApiKey = process.env.AI_API_KEY;
      if (!aiApiKey) {
        return res.status(400).json({
          error: `AI provider "${provider}" is selected but no API key is configured. Go to Settings → AI Provider to add your key.`,
        });
      }

      const lookupResult = await callProductLookup(
        provider as AiProvider,
        aiApiKey,
        { name: name.trim(), category: cat, subcategory: subcat, attributeKeys },
      );
      result = lookupResult as unknown as Record<string, unknown>;
    }

    // Store in local cache
    const { v4: uuid } = require('uuid');
    const pe = (result.price_estimate || {}) as Record<string, unknown>;
    db.prepare(
      `INSERT INTO product_catalog (id, name_normalized, category, subcategory, description, sku, product_url, image_url, attributes, price_low, price_high, price_typical, price_confidence, ai_model, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+30 days'))
       ON CONFLICT(name_normalized, category, subcategory) DO UPDATE SET
         description = excluded.description, sku = excluded.sku, product_url = excluded.product_url,
         image_url = excluded.image_url, attributes = excluded.attributes,
         price_low = excluded.price_low, price_high = excluded.price_high,
         price_typical = excluded.price_typical, price_confidence = excluded.price_confidence,
         ai_model = excluded.ai_model, lookup_count = product_catalog.lookup_count + 1,
         updated_at = datetime('now'), expires_at = datetime('now', '+30 days')`
    ).run(
      uuid(), nameNormalized, cat, subcat,
      result.description ?? null, result.sku ?? null,
      result.product_url ?? null, result.image_url ?? null,
      JSON.stringify(result.attributes || {}),
      pe.low ?? null, pe.high ?? null, pe.typical ?? null, pe.confidence ?? 'low',
      provider,
    );

    res.json({ ...result, subcategory: result.subcategory || subcat || undefined, cached: false });
  } catch (err) {
    console.error('Product lookup error:', err);
    res.status(502).json({ error: 'Product lookup failed. Check your AI provider configuration.' });
  }
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

// POST /settings/profile-picture — Upload profile picture
router.post('/profile-picture', profileUpload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  const profilePicturePath = `/uploads/profile/${req.file.filename}`;
  const settingsQ = new SettingsQueries();

  // Delete old file if replacing
  const existing = settingsQ.get();
  if (existing?.profilePicturePath) {
    const oldPath = path.join(process.cwd(), existing.profilePicturePath);
    try { fs.unlinkSync(oldPath); } catch {}
  }

  settingsQ.upsert({ profilePicturePath });
  res.json({ ok: true, profilePicturePath });
});

// DELETE /settings/profile-picture — Remove profile picture
router.delete('/profile-picture', (_req: Request, res: Response) => {
  const settingsQ = new SettingsQueries();
  const existing = settingsQ.get();
  if (existing?.profilePicturePath) {
    const oldPath = path.join(process.cwd(), existing.profilePicturePath);
    try { fs.unlinkSync(oldPath); } catch {}
    settingsQ.upsert({ profilePicturePath: null as unknown as string });
  }
  res.json({ ok: true });
});

// POST /settings/network-publish — Toggle network publishing
router.post('/network-publish', (req: Request, res: Response) => {
  const settingsQ = new SettingsQueries();
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' });
  }

  settingsQ.upsert({ networkPublishEnabled: enabled });

  // If disabling, unpublish all items via reconciliation
  if (!enabled) {
    const networkPublisher = req.app.get('networkPublisher');
    if (networkPublisher) {
      networkPublisher.reconcile().catch(() => {});
    }
  }

  res.json({ ok: true, networkPublishEnabled: enabled });
});

// GET /settings/network-messages — List received network messages
router.get('/network-messages', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM network_messages ORDER BY created_at DESC LIMIT 100').all();
  const messages = (rows as Record<string, unknown>[]).map(row => ({
    id: row.id as string,
    refId: row.ref_id as string,
    senderName: row.sender_name as string | null,
    senderEmail: row.sender_email as string | null,
    message: row.message as string,
    reply: (row.reply as string | null) || null,
    repliedAt: (row.replied_at as string | null) || null,
    read: !!(row.read as number),
    createdAt: row.created_at as string,
  }));
  res.json(messages);
});

// PATCH /settings/network-messages/:id/read — Mark message as read
router.patch('/network-messages/:id/read', (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare('UPDATE network_messages SET read = 1 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Message not found' });
  res.json({ ok: true });
});

// POST /settings/network-messages/:id/reply — Reply to a network message
router.post('/network-messages/:id/reply', async (req: Request, res: Response) => {
  const { reply } = req.body;
  if (!reply || typeof reply !== 'string' || !reply.trim()) {
    return res.status(400).json({ error: 'reply is required' });
  }
  if (reply.length > 2000) {
    return res.status(400).json({ error: 'Reply must be 2000 characters or less' });
  }

  const db = getDb();
  const msg = db.prepare('SELECT * FROM network_messages WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  const beaconId = req.app.get('beaconId');
  const reffoUrl = process.env.REFFO_API_URL || 'https://reffo.ai';

  // Post reply to webapp
  try {
    const upstream = await fetch(`${reffoUrl}/api/network/messages/${req.params.id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beaconId, reply: reply.trim() }),
    });

    if (!upstream.ok) {
      const data = await upstream.json().catch(() => ({})) as Record<string, unknown>;
      return res.status(upstream.status).json({ error: (data.error as string) || 'Failed to send reply' });
    }
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach webapp' });
  }

  // Store reply locally
  const now = new Date().toISOString();
  db.prepare('UPDATE network_messages SET reply = ?, replied_at = ?, read = 1 WHERE id = ?').run(reply.trim(), now, req.params.id);

  res.json({ ok: true });
});

// GET /settings/export — Export all beacon data as a JSON backup
router.get('/export', (_req: Request, res: Response) => {
  const db = getDb();
  const beaconId = _req.app.get('beaconId') || '';

  const refs = db.prepare('SELECT * FROM refs ORDER BY created_at DESC').all();
  const refMedia = db.prepare('SELECT * FROM ref_media ORDER BY sort_order ASC').all();
  const offers = db.prepare('SELECT * FROM offers ORDER BY created_at DESC').all();
  const negotiations = db.prepare('SELECT * FROM negotiations ORDER BY created_at DESC').all();
  const favorites = db.prepare('SELECT * FROM favorites ORDER BY created_at DESC').all();
  const collections = db.prepare('SELECT * FROM collections ORDER BY created_at DESC').all();
  const conversations = db.prepare('SELECT * FROM conversations ORDER BY created_at DESC').all();
  const networkMessages = db.prepare('SELECT * FROM network_messages ORDER BY created_at DESC').all();

  const settingsQ = new SettingsQueries();
  const locationSettings = settingsQ.get();

  const exportData = {
    exported_at: new Date().toISOString(),
    beacon_id: beaconId,
    version: getVersion(),
    settings: locationSettings || null,
    refs,
    ref_media: refMedia,
    offers,
    negotiations,
    favorites,
    collections,
    conversations,
    network_messages: networkMessages,
  };

  const json = JSON.stringify(exportData, null, 2);
  const date = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="pelagora-beacon-backup-${date}.json"`);
  res.send(json);
});

export default router;
