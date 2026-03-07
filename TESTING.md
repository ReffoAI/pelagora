# Reffo Testing Guide

How to test changes and run multiple users locally.

---

## The Two Ways to Run a Beacon

| Method | Command | When to use |
|--------|---------|-------------|
| **Dev mode** | `cd reffo-beacon && npm run dev` | You're making code changes and want instant reload |
| **Packaged mode** | Scaffold with `create-reffo-beacon`, then `npm start` | Testing the real user experience (separate DB, uploads, identity) |

---

## After a Code Change

### If using dev mode

Just save the file. `tsx watch` auto-reloads.

### If using packaged mode

You must rebuild the beacon so the packaged installs pick up changes:

```bash
cd /Users/dougkinnison/apps/reffo/reffo-beacon
npm run build
```

Then restart each packaged beacon (`npm start` in their folders). No need to re-scaffold or reinstall — they link to the same built files.

---

## Setting Up 4 Test Users (2 Beacons + 2 Webapps)

### Step 1: Build the beacon

```bash
cd /Users/dougkinnison/apps/reffo/reffo-beacon
npm run build
```

### Step 2: Scaffold two beacons

```bash
cd /Users/dougkinnison/apps/reffo
npx ./create-reffo-beacon
```

When prompted:
- **Beacon A**: directory = `test-beacon-a`, port = `3001`
- **Beacon B**: directory = `test-beacon-b`, port = `3002`

Skip the API key prompt for now (press Enter).

### Step 3: Start both beacons

Terminal 1:
```bash
cd test-beacon-a && npm start
```

Terminal 2:
```bash
cd test-beacon-b && npm start
```

They'll discover each other automatically over DHT.

### Step 4: Start two webapps

Terminal 3:
```bash
cd /Users/dougkinnison/apps/reffo/reffo-webapp
PORT=3000 npm run dev
```

Terminal 4 (second webapp instance — same code, different port):
```bash
cd /Users/dougkinnison/apps/reffo/reffo-webapp
PORT=4000 npm run dev
```

### What you end up with

| User | Type | URL | Identity |
|------|------|-----|----------|
| Seller A | Beacon | http://localhost:3001 | Own DB, own beacon ID |
| Seller B | Beacon | http://localhost:3002 | Own DB, own beacon ID |
| Buyer 1 | Webapp | http://localhost:3000 | Supabase auth |
| Buyer 2 | Webapp | http://localhost:4000 | Supabase auth (different account) |

---

## Quick Reference

| Task | Command |
|------|---------|
| Rebuild after code change | `cd reffo-beacon && npm run build` |
| Dev mode (auto-reload) | `cd reffo-beacon && PORT=3001 npm run dev` |
| Scaffold a new test beacon | `cd /Users/dougkinnison/apps/reffo && npx ./create-reffo-beacon` |
| Start a packaged beacon | `cd test-beacon-x && npm start` |
| Wipe a beacon's data | Delete the `.db` files and `uploads/` folder in its directory |

---

## Tips

- Each scaffolded beacon gets its own database, uploads folder, and auto-generated beacon ID — they are fully independent users.
- Beacons find each other via DHT automatically. Create a ref on Beacon A, search from Beacon B.
- To connect a beacon to the webapp (sync items to reffo.ai), add an API key in the beacon's Settings tab.
- The webapp needs two different browser profiles (or one regular + one incognito) to log in as two different Supabase users.
