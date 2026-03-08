# How to Build a Reffo Skill

A skill is a modular capability that any Reffo beacon can install. It adds database tables, API routes, DHT message handlers, and MCP tools in one package. Skills are the building blocks of the Reffo ecosystem — they extend what your beacon can do.

## What is a Skill?

A skill is an npm package (e.g., `@reffo/skill-reverse-auction`) that exports a standard `Skill` interface. When installed, the beacon's skill loader auto-discovers it and registers its capabilities.

Think of skills as plugins:
- **Database**: each skill creates its own tables
- **API**: each skill gets its own route namespace (`/skills/{skill-id}/`)
- **DHT**: each skill can send/receive custom P2P messages
- **MCP**: each skill exposes AI agent tools and guided prompts
- **Distribution**: each skill ships with cross-platform export artifacts

## The Skill Interface

Every skill must export an object implementing this interface:

```typescript
interface Skill {
  manifest: SkillManifest;     // metadata: id, name, version, description
  migrate(db): void;           // create/update database tables
  createRouter(ctx): Router;   // Express routes for HTTP API
  registerDht?(ctx): void;     // optional: DHT message handlers
  getMcpTools?(): McpToolDef[];       // optional: MCP tool definitions
  getMcpPrompts?(): McpPromptDef[];   // optional: MCP prompt definitions
  getDistribution?(): SkillDistribution;  // optional: cross-platform exports
}
```

### SkillManifest

```typescript
{
  id: 'reverse-auction',        // URL-safe identifier
  name: 'Reverse Auction',      // Human-readable name
  version: '1.0.0',             // semver
  description: 'Buyers post wants, sellers compete',
  author: 'reffo',
  icon: '🔄',                   // emoji or URL
  tags: ['commerce', 'auction']
}
```

### SkillContext

Every skill receives a context object with access to:
- `db` — the beacon's SQLite database instance
- `beaconId` — this beacon's unique ID
- `dht.sendMessage(targetBeaconId, message)` — send to a specific peer
- `dht.onMessage(type, handler)` — listen for incoming messages
- `dht.broadcastMessage(message)` — broadcast to all connected peers

## Anatomy of a Skill

### 1. Types (`src/types.ts`)

Define your data models and DHT payload types:

```typescript
export interface Want {
  id: string;
  name: string;
  maxPrice: number;
  status: 'active' | 'fulfilled' | 'cancelled';
  // ...
}
```

### 2. Database (`src/migrate.ts`)

Create your tables. This runs on every beacon startup (use `CREATE TABLE IF NOT EXISTS`):

```typescript
export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      max_price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      beacon_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
```

### 3. Queries (`src/queries.ts`)

SQLite query helpers following the same pattern as the core beacon:

```typescript
export class WantQueries {
  constructor(private db) {}
  list() { return this.db.prepare('SELECT * FROM wants').all(); }
  get(id: string) { return this.db.prepare('SELECT * FROM wants WHERE id = ?').get(id); }
  create(data, beaconId) { /* INSERT */ }
}
```

### 4. Routes (`src/router.ts`)

Express router — mounted at `/skills/{skill-id}/`:

```typescript
export function createRouter(ctx: SkillContext): Router {
  const router = Router();
  const wants = new WantQueries(ctx.db);

  router.get('/wants', (req, res) => res.json(wants.list()));
  router.post('/wants', (req, res) => {
    const want = wants.create(req.body, ctx.beaconId);
    ctx.dht.broadcastMessage({ type: 'want_announce', wants: [want] });
    res.status(201).json(want);
  });

  return router;
}
```

### 5. DHT Handlers (`src/dht.ts`)

Register handlers for custom P2P message types:

```typescript
export function registerDht(ctx: SkillContext) {
  ctx.dht.onMessage('bid', (fromBeaconId, payload) => {
    // Handle incoming bid from a seller
  });
}
```

### 6. MCP Tools (`src/mcp-tools.ts`)

Define tools that AI agents can use:

```typescript
export function getMcpTools(): McpToolDef[] {
  return [{
    name: 'create_want',
    description: 'Post what you want to buy with a budget',
    schema: { /* JSON Schema */ },
    handler: async (params, beaconUrl) => {
      const res = await fetch(`${beaconUrl}/skills/reverse-auction/wants`, {
        method: 'POST', body: JSON.stringify(params)
      });
      return res.json();
    },
  }];
}
```

### 7. MCP Prompts (`src/mcp-prompts.ts`)

Guided workflows for AI agents:

```typescript
export function getMcpPrompts(): McpPromptDef[] {
  return [{
    name: 'post-a-want',
    description: 'Guided workflow to post a want and review bids',
    arguments: [{ name: 'itemDescription', description: 'What you want', required: true }],
    template: (args) => `Help me post a want for: ${args.itemDescription}...`,
  }];
}
```

### 8. Distribution (`src/distribution.ts`)

Generate cross-platform export artifacts so your skill works on ClawHub, OpenAI GPT Store, and Claude Marketplace:

```typescript
export function getDistribution(manifest): SkillDistribution {
  return {
    clawHubSkillMd: '...',          // SKILL.md for ClawHub/LobeHub
    openApiSpec: { /* OpenAPI */ },  // For OpenAI GPT Actions
    claudePluginManifest: { /* */ }, // For Anthropic marketplace
  };
}
```

## Package Structure

```
reffo-skill-your-skill/
  package.json              # name: @reffo/skill-your-skill
  tsconfig.json
  src/
    index.ts                # exports Skill implementation
    types.ts                # data models
    migrate.ts              # database table creation
    queries.ts              # SQLite query helpers
    router.ts               # Express routes
    dht.ts                  # DHT message handlers
    mcp-tools.ts            # MCP tool definitions
    mcp-prompts.ts          # MCP prompt definitions
    distribution.ts         # cross-platform export generators
  dist/                     # generated distribution artifacts
    SKILL.md                # ClawHub/LobeHub
    openapi.json            # OpenAI GPT Store
    claude-plugin.json      # Anthropic Claude
```

## Reference Implementation

The **Reverse Auction** skill (`@reffo/skill-reverse-auction`) is the reference implementation. Study it to understand the full pattern:

- Types: `Want`, `Bid`, DHT payloads
- Two tables: `wants` (buyer side), `bids` (seller side)
- Full CRUD routes for wants and bids
- Three DHT message types: `want_announce`, `bid`, `bid_response`
- 12 MCP tools covering buyer and seller workflows
- 2 MCP prompts for guided agent workflows
- Cross-platform distribution for ClawHub, GPT Store, and Claude

## Testing Your Skill

1. Link your skill locally: `npm install file:../reffo-skill-your-skill`
2. Start the beacon: `npm run dev`
3. Check discovery: `curl localhost:3000/skills`
4. Test routes: `curl localhost:3000/skills/your-skill/...`
5. Two-beacon test: start two beacons on different ports, verify DHT messages
6. MCP test: start the MCP server, verify tools are registered

## Publishing

1. Build: `npm run build`
2. Test: verify all routes and DHT handlers work
3. Generate distribution artifacts: `npm run export`
4. Publish to npm: `npm publish --access public`
5. Users install with: `npm install @reffo/skill-your-skill`

## Cross-Platform Distribution

Every skill can be published to multiple AI ecosystems from one codebase:

| Platform | Artifact | How |
|----------|----------|-----|
| Reffo Marketplace | npm package | `npm install` + beacon auto-discovers |
| ClawHub / LobeHub | `SKILL.md` | YAML frontmatter + tool instructions |
| OpenAI GPT Store | `openapi.json` | OpenAPI 3.0 spec for GPT Actions |
| Anthropic Claude | `claude-plugin.json` | MCP server reference + tool list |
| xAI | tool definitions | Same schema as MCP tools |

Export artifacts via the beacon API:
- `GET /skills/{id}/export/clawhub` — SKILL.md
- `GET /skills/{id}/export/openapi` — OpenAPI JSON
- `GET /skills/{id}/export/claude-plugin` — Claude plugin manifest

## Proposing a New Skill

See `SKILL_PROPOSAL.md` for the community proposal template.
