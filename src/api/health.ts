import { Router, Request, Response } from 'express';
import { RefQueries, OfferQueries } from '../db';
import type { BeaconInfo } from '@reffo/protocol';
import { getVersion } from '../version';

const router = Router();
const startTime = Date.now();

let beaconId = '';
let dhtStatus = { connected: false, peers: 0 };
let updateInfo = { available: false, version: null as string | null };

export function setBeaconId(id: string): void {
  beaconId = id;
}

export function setDhtStatus(status: { connected: boolean; peers: number }): void {
  dhtStatus = status;
}

export function setUpdateInfo(info: { available: boolean; version: string | null }): void {
  updateInfo = info;
}

router.get('/', (_req: Request, res: Response) => {
  const refs = new RefQueries();
  const offers = new OfferQueries();

  const info: BeaconInfo & { updateAvailable: boolean; latestVersion: string | null } = {
    id: beaconId,
    version: getVersion(),
    refCount: refs.count(),
    offerCount: offers.countActive(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    dht: dhtStatus,
    updateAvailable: updateInfo.available,
    latestVersion: updateInfo.version,
  };

  res.json(info);
});

export default router;
