═══════════════════════════════════════════════════════════
  Reffo Beacon — Quick Start
═══════════════════════════════════════════════════════════

  Your own personal inventory node on the Reffo network.
  No fees, no middlemen — just you and the open network.

───────────────────────────────────────────────────────────
  Getting Started
───────────────────────────────────────────────────────────

  1. EXTRACT this zip to any folder on your computer.

  2. LAUNCH the beacon:
     • macOS:   Double-click  start-beacon.command
     • Windows: Double-click  start-beacon.bat

  3. OPEN your browser to http://localhost:3000
     (The launcher will open it automatically.)

  That's it! Your beacon is running.

───────────────────────────────────────────────────────────
  What Gets Created
───────────────────────────────────────────────────────────

  On first launch, the beacon creates:

    data/        Your database and beacon ID
    uploads/     Photos you upload for your listings
    .env         Configuration (beacon ID, port number)

  These are all stored in this folder — nothing is
  installed system-wide.

───────────────────────────────────────────────────────────
  Configuration
───────────────────────────────────────────────────────────

  Edit the .env file to change settings:

    PORT=3000            HTTP port (default 3000)
    BEACON_ID=...        Your unique beacon identifier
    REFFO_API_KEY=...    Optional: sync with Reffo.ai

───────────────────────────────────────────────────────────
  Stopping the Beacon
───────────────────────────────────────────────────────────

  Press Ctrl+C in the terminal window, or simply close it.
  Your data is saved automatically.

───────────────────────────────────────────────────────────
  Troubleshooting
───────────────────────────────────────────────────────────

  macOS "unidentified developer" warning:
    Right-click start-beacon.command → Open → Open

  Port already in use:
    Edit .env and change PORT to another number (e.g. 3001)

  Need help?
    https://github.com/reffo/reffo-beacon/issues

═══════════════════════════════════════════════════════════
