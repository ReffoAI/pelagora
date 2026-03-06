import { readFileSync } from 'fs';
import { join } from 'path';

let cached: string | null = null;

export function getVersion(): string {
  if (cached) return cached;
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
  cached = pkg.version;
  return cached!;
}
