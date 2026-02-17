import Hyperswarm from 'hyperswarm';
import b4a from 'b4a';
import crypto from 'crypto';
import { ItemQueries, OfferQueries } from '../db';
import type { PeerMessage, QueryPayload, AnnouncePayload } from '../types';

// All Reffo beacons join this topic to find each other
const REFFO_TOPIC = crypto.createHash('sha256').update('reffo-beacon-v1').digest();

export class DhtDiscovery {
  private swarm: Hyperswarm;
  private beaconId: string;
  private peers: Map<string, { stream: any; beaconId: string }> = new Map();
  private onPeerConnect?: (count: number) => void;

  constructor(beaconId: string) {
    this.swarm = new Hyperswarm();
    this.beaconId = beaconId;
  }

  async start(onPeerConnect?: (count: number) => void): Promise<void> {
    this.onPeerConnect = onPeerConnect;

    this.swarm.on('connection', (stream: any, info: any) => {
      const peerId = b4a.toString(stream.remotePublicKey, 'hex');
      console.log(`[DHT] Peer connected: ${peerId.slice(0, 8)}...`);

      this.peers.set(peerId, { stream, beaconId: peerId });
      this.onPeerConnect?.(this.peers.size);

      // Send our announcement on connect
      this.sendAnnouncement(stream);

      stream.on('data', (data: Buffer) => {
        try {
          const msg: PeerMessage = JSON.parse(b4a.toString(data));
          this.handleMessage(msg, stream);
        } catch {
          // Ignore malformed messages
        }
      });

      stream.on('close', () => {
        this.peers.delete(peerId);
        console.log(`[DHT] Peer disconnected: ${peerId.slice(0, 8)}...`);
        this.onPeerConnect?.(this.peers.size);
      });

      stream.on('error', () => {
        this.peers.delete(peerId);
        this.onPeerConnect?.(this.peers.size);
      });
    });

    // Join the Reffo topic so all beacons can discover each other
    const discovery = this.swarm.join(REFFO_TOPIC, { server: true, client: true });
    await discovery.flushed();
    console.log(`[DHT] Joined Reffo network. Topic: ${b4a.toString(REFFO_TOPIC, 'hex').slice(0, 16)}...`);
  }

  private sendAnnouncement(stream: any): void {
    const items = new ItemQueries();
    const offers = new OfferQueries();

    const discoverableItems = items.listDiscoverable();
    const discoverableItemIds = new Set(discoverableItems.map(i => i.id));

    const payload: AnnouncePayload = {
      items: discoverableItems.map(i => ({ id: i.id, name: i.name, category: i.category, subcategory: i.subcategory, listingStatus: i.listingStatus })),
      offers: offers.list().filter(o => discoverableItemIds.has(o.itemId)).map(o => ({
        id: o.id, itemId: o.itemId, price: o.price,
        priceCurrency: o.priceCurrency, status: o.status,
      })),
    };

    const msg: PeerMessage = {
      type: 'announce',
      beaconId: this.beaconId,
      payload,
    };

    stream.write(b4a.from(JSON.stringify(msg)));
  }

  private handleMessage(msg: PeerMessage, stream: any): void {
    switch (msg.type) {
      case 'query':
        this.handleQuery(msg.payload as QueryPayload, stream, msg.beaconId);
        break;
      case 'announce':
        console.log(`[DHT] Received announcement from ${msg.beaconId.slice(0, 8)}...`);
        break;
      case 'response':
        // Responses are handled by the caller
        break;
    }
  }

  private handleQuery(query: QueryPayload, stream: any, fromBeacon: string): void {
    console.log(`[DHT] Query from ${fromBeacon.slice(0, 8)}...:`, query);
    const items = new ItemQueries();
    const offers = new OfferQueries();

    let results = query.search
      ? items.searchDiscoverable(query.search)
      : items.listDiscoverable(query.category, query.subcategory);

    // Build response with matching offers
    const matchingOffers = results.flatMap(item => {
      const itemOffers = offers.list(item.id).filter(o => o.status === 'active');
      if (query.maxPrice !== undefined) {
        return itemOffers.filter(o => o.price <= query.maxPrice!);
      }
      return itemOffers;
    });

    const response: PeerMessage = {
      type: 'response',
      beaconId: this.beaconId,
      payload: { items: results, offers: matchingOffers },
    };

    stream.write(b4a.from(JSON.stringify(response)));
  }

  /** Query all connected peers and collect responses */
  queryPeers(query: QueryPayload, timeoutMs = 5000): Promise<PeerMessage[]> {
    return new Promise((resolve) => {
      const responses: PeerMessage[] = [];
      const msg: PeerMessage = {
        type: 'query',
        beaconId: this.beaconId,
        payload: query,
      };

      const msgBuf = b4a.from(JSON.stringify(msg));

      for (const [, peer] of this.peers) {
        const handler = (data: Buffer) => {
          try {
            const resp: PeerMessage = JSON.parse(b4a.toString(data));
            if (resp.type === 'response') {
              responses.push(resp);
              peer.stream.off('data', handler);
            }
          } catch {
            // Ignore
          }
        };
        peer.stream.on('data', handler);
        peer.stream.write(msgBuf);
      }

      setTimeout(() => resolve(responses), timeoutMs);
    });
  }

  get peerCount(): number {
    return this.peers.size;
  }

  get isConnected(): boolean {
    return true; // Swarm is always "connected" once started
  }

  async stop(): Promise<void> {
    await this.swarm.destroy();
    this.peers.clear();
    console.log('[DHT] Disconnected from Reffo network');
  }
}
