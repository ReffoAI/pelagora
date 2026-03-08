# Reffo Video Script Outlines

## Video 1: "What is a Reffo Skill?" (2 min)

**Audience:** Potential users, developers, investors
**Goal:** Explain the concept and show why skills > SaaS

### Outline

1. **Hook** (15s)
   - "What if your marketplace could learn new tricks — and every user gets them for free?"

2. **The Problem** (20s)
   - Traditional marketplaces: one company controls all features
   - SaaS model: you pay monthly for capabilities
   - Locked-in: if they don't build it, you don't get it

3. **The Solution: Skills** (30s)
   - A skill is a modular capability any beacon can install
   - Open source: anyone can build one
   - One click to install — adds new features to YOUR beacon
   - Show the skills list on a beacon

4. **Demo: Reverse Auction** (40s)
   - Buyer posts: "I want a Tesla for under $42k"
   - Three sellers see it, send competing bids
   - Buyer picks the best deal
   - All peer-to-peer, no middleman

5. **Why It Matters** (15s)
   - Skills, not subscriptions
   - The more skills, the more valuable every beacon becomes
   - Open source = trust, no hidden fees

---

## Video 2: "Building Your First Skill" (10 min)

**Audience:** Developers who want to contribute
**Goal:** Walk through building the reverse auction skill from scratch

### Outline

1. **Setup** (1 min)
   - Create package: `@reffo/skill-my-skill`
   - Show the `Skill` interface contract
   - Explain: types → DB → routes → DHT → MCP

2. **Types** (1 min)
   - Define `Want` and `Bid` interfaces
   - Define DHT payload types
   - Keep it simple: start with the data model

3. **Database** (1.5 min)
   - Write the `migrate()` function
   - CREATE TABLE IF NOT EXISTS pattern
   - Explain: runs on every startup, idempotent

4. **Queries** (1.5 min)
   - Write `WantQueries` class
   - CRUD operations with parameterized SQL
   - Same pattern as core beacon queries

5. **Routes** (2 min)
   - Create the Express router
   - GET/POST/PATCH/DELETE for wants
   - Show how `ctx.dht.broadcastMessage()` works

6. **DHT Handlers** (1 min)
   - Register handlers with `ctx.dht.onMessage()`
   - Handle incoming bids
   - Three message types: announce, bid, response

7. **MCP Tools** (1 min)
   - Define tools for AI agents
   - JSON schema for inputs
   - Handler calls the skill's own API

8. **Wire It Up** (1 min)
   - Export from `index.ts`
   - Install in beacon
   - Show it auto-discovered on startup
   - Test: `curl localhost:3000/skills`

---

## Video 3: "Teaching Your Bot New Tricks" (5 min)

**Audience:** AI enthusiasts, Claude users
**Goal:** Show AI agents running a reverse auction end-to-end

### Outline

1. **Setup** (30s)
   - Two beacons running with reverse auction skill
   - Claude Code connected via MCP

2. **Buyer Flow** (2 min)
   - Use the `post-a-want` prompt
   - "I want a 2025 Tesla Model 3 for under $42k"
   - Claude creates the want, broadcasts to network
   - Show the want appearing on the seller's beacon

3. **Seller Flow** (1.5 min)
   - Use the `fulfill-a-want` prompt
   - Claude searches active wants, finds the Tesla want
   - Matches with inventory, sends a competitive bid
   - Show the bid arriving at the buyer's beacon

4. **Negotiation** (1 min)
   - Buyer reviews bids
   - Claude helps evaluate: price, condition, seller reputation
   - Accept the best bid, mark as sold
   - Transaction complete — peer-to-peer, AI-assisted

---

## Video 4: "Publish Your Skill Everywhere" (5 min)

**Audience:** Developers, ecosystem builders
**Goal:** Show how one skill publishes to 5 platforms

### Outline

1. **The Vision** (30s)
   - Write once, publish everywhere
   - Every AI ecosystem gets access to your skill
   - The portable layer: MCP tools + HTTP API routes

2. **Reffo Marketplace** (45s)
   - npm package: `npm install @reffo/skill-reverse-auction`
   - Beacon auto-discovers and loads
   - Show: `GET /skills` lists the installed skill
   - Future: 1-click install from the marketplace UI

3. **ClawHub / LobeHub** (1 min)
   - `GET /skills/reverse-auction/export/clawhub`
   - Show the SKILL.md: YAML frontmatter + tool instructions
   - Copy-paste into ClawHub — instant skill
   - Advantage over ClawHub native: code-reviewed, trusted

4. **OpenAI GPT Store** (1 min)
   - `GET /skills/reverse-auction/export/openapi`
   - Show the OpenAPI 3.0 spec
   - Create a custom GPT with Actions pointing to skill routes
   - Base URL = your beacon URL

5. **Anthropic Claude Marketplace** (1 min)
   - `GET /skills/reverse-auction/export/claude-plugin`
   - Show the plugin manifest
   - References the MCP server + lists tools and prompts
   - Already works with Claude Code today

6. **xAI and Beyond** (30s)
   - Tool definitions mirror MCP schemas
   - When xAI launches their marketplace, we're ready
   - The pattern: define once, export to every format
   - Community skills = network effects across all platforms
