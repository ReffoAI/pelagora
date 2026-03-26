/**
 * Polls the npm registry for newer versions of pelagora.
 * Runs independently of Reffo.ai sync so all users get update notifications.
 */

import { getVersion } from './version';
import { setUpdateInfo } from './api/health';

const NPM_REGISTRY_URL = 'https://registry.npmjs.org/pelagora/latest';
const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

function semverNewer(remote: string, local: string): boolean {
  const r = remote.split('.').map(Number);
  const l = local.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}

async function checkNpmRegistry(): Promise<void> {
  try {
    const res = await fetch(NPM_REGISTRY_URL, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return;

    const data = await res.json() as { version?: string };
    const latest = data.version;
    if (!latest) return;

    const local = getVersion();
    const newer = semverNewer(latest, local);
    if (newer) {
      setUpdateInfo({ available: true, version: latest });
      console.log(`[Update] New version available: ${latest} (current: ${local})`);
    }
  } catch {
    // Silent fail — network may be unavailable
  }
}

let interval: ReturnType<typeof setInterval> | null = null;

export function startUpdateChecker(intervalMs = DEFAULT_INTERVAL_MS): void {
  if (interval) return;

  // Check on startup (slight delay to not block init)
  setTimeout(checkNpmRegistry, 5_000);

  interval = setInterval(checkNpmRegistry, intervalMs);
}

export function stopUpdateChecker(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
