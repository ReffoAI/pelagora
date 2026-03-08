import Hyperswarm from 'hyperswarm';
import b4a from 'b4a';
import crypto from 'crypto';
import { RefQueries, OfferQueries, MediaQueries, NegotiationQueries } from '../db';
import type { PeerMessage, QueryPayload, AnnouncePayload, ProposalPayload, ProposalResponsePayload } from '@reffo/protocol';
import { blurLocation, haversineDistanceMiles } from '@reffo/protocol';

// All Reffo beacons join this topic to find each other
const REFFO_TOPIC = crypto.createHash('sha256').update('reffo-beacon-v1').digest();

export class DhtDiscovery {
  private swarm: Hyperswarm;
  private beaconId: string;
  private peers: Map<string, { stream: any; beaconId: string }> = new Map();
  private beaconIdMap: Map<string, string> = new Map(); // reffoBeaconId -> hyperswarm peerId
  private messageHandlers = new Map<string, (fromBeaconId: string, payload: unknown) => void>();
  private onPeerConnect?: (count: number) => void;
  httpPort = 0;

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
    const refs = new RefQueries();
    const offers = new OfferQueries();

    const discoverableRefs = refs.listDiscoverable();
    const discoverableRefIds = new Set(discoverableRefs.map(i => i.id));

    const payload: AnnouncePayload = {
      refs: discoverableRefs.map(i => {
        const blurred = (i.locationLat != null && i.locationLng != null)
          ? blurLocation(i.locationLat, i.locationLng) : null;
        return {
          id: i.id, name: i.name, category: i.category, subcategory: i.subcategory, listingStatus: i.listingStatus,
          locationLat: blurred?.lat, locationLng: blurred?.lng,
          locationCity: i.locationCity, locationState: i.locationState,
          locationZip: i.locationZip, locationCountry: i.locationCountry,
          sellingScope: i.sellingScope, sellingRadiusMiles: i.sellingRadiusMiles,
        };
      }),
      offers: offers.list().filter(o => discoverableRefIds.has(o.refId)).map(o => ({
        id: o.id, refId: o.refId, price: o.price,
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

  /** Register a custom message handler for skill-defined message types */
  registerMessageHandler(type: string, handler: (fromBeaconId: string, payload: unknown) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /** Broadcast a message to all connected peers */
  broadcastToPeers(msg: PeerMessage): void {
    const msgBuf = b4a.from(JSON.stringify(msg));
    for (const [, peer] of this.peers) {
      try {
        peer.stream.write(msgBuf);
      } catch {
        // Ignore write errors to individual peers
      }
    }
  }

  private handleMessage(msg: PeerMessage, stream: any): void {
    switch (msg.type) {
      case 'query':
        this.handleQuery(msg.payload as QueryPayload, stream, msg.beaconId);
        break;
      case 'announce':
        console.log(`[DHT] Received announcement from ${msg.beaconId.slice(0, 8)}...`);
        this.updatePeerBeaconId(stream, msg.beaconId);
        break;
      case 'response':
        // Responses are handled by the caller
        break;
      case 'proposal':
        this.handleProposal(msg.beaconId, msg.payload as ProposalPayload);
        break;
      case 'proposal_response':
        this.handleProposalResponse(msg.beaconId, msg.payload as ProposalResponsePayload);
        break;
      default: {
        // Check for skill-registered message handlers
        const handler = this.messageHandlers.get(msg.type);
        if (handler) {
          handler(msg.beaconId, msg.payload);
        }
        break;
      }
    }
  }

  private handleQuery(query: QueryPayload, stream: any, fromBeacon: string): void {
    console.log(`[DHT] Query from ${fromBeacon.slice(0, 8)}...:`, query);
    const refs = new RefQueries();
    const offers = new OfferQueries();
    const mediaQ = new MediaQueries();

    let results = query.search
      ? refs.searchDiscoverable(query.search)
      : refs.listDiscoverable(query.category, query.subcategory);

    // Build response with matching offers
    const matchingOffers = results.flatMap(ref => {
      const refOffers = offers.list(ref.id).filter(o => o.status === 'active');
      if (query.maxPrice !== undefined) {
        return refOffers.filter(o => o.price <= query.maxPrice!);
      }
      return refOffers;
    });

    // Geo-filter if query has lat/lng/radiusMiles
    if (query.lat != null && query.lng != null && query.radiusMiles != null) {
      results = results.filter(ref => {
        const scope = ref.sellingScope || 'global';
        if (scope === 'global') return true;
        if (scope === 'national') return true;
        if (ref.locationLat == null || ref.locationLng == null) return true; // no location = show everywhere
        const dist = haversineDistanceMiles(query.lat!, query.lng!, ref.locationLat, ref.locationLng);
        if (scope === 'range') return dist <= (ref.sellingRadiusMiles || Infinity);
        return dist <= query.radiusMiles!;
      });
    }

    // Include media metadata per item
    const mediaMap: Record<string, { id: string; filePath: string; mediaType: string }[]> = {};
    for (const ref of results) {
      const media = mediaQ.listForRef(ref.id);
      if (media.length > 0) {
        mediaMap[ref.id] = media.map(m => ({ id: m.id, filePath: m.filePath, mediaType: m.mediaType }));
      }
    }

    // Blur location in response — never send exact lat/lng or address
    const blurredResults = results.map(ref => {
      const blurred = (ref.locationLat != null && ref.locationLng != null)
        ? blurLocation(ref.locationLat, ref.locationLng) : null;
      return {
        ...ref,
        locationLat: blurred?.lat,
        locationLng: blurred?.lng,
        locationAddress: undefined, // never share street address
      };
    });

    const response: PeerMessage = {
      type: 'response',
      beaconId: this.beaconId,
      payload: { refs: blurredResults, offers: matchingOffers, media: mediaMap, httpPort: this.httpPort },
    };

    stream.write(b4a.from(JSON.stringify(response)));
  }

  /** Map a Hyperswarm peer stream to its Reffo beaconId */
  private updatePeerBeaconId(stream: any, reffoBeaconId: string): void {
    const peerId = b4a.toString(stream.remotePublicKey, 'hex');
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.beaconId = reffoBeaconId;
      this.beaconIdMap.set(reffoBeaconId, peerId);
    }
  }

  /** Send a message to a specific peer by their Reffo beaconId */
  sendToPeer(targetBeaconId: string, msg: PeerMessage): boolean {
    // Look up by beaconId map first
    const peerId = this.beaconIdMap.get(targetBeaconId);
    if (peerId) {
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.stream.write(b4a.from(JSON.stringify(msg)));
        return true;
      }
    }

    // Fallback: search all peers
    for (const [, peer] of this.peers) {
      if (peer.beaconId === targetBeaconId) {
        peer.stream.write(b4a.from(JSON.stringify(msg)));
        return true;
      }
    }

    return false;
  }

  /** Handle incoming proposal from a buyer */
  private handleProposal(fromBeaconId: string, payload: ProposalPayload): void {
    console.log(`[DHT] Received proposal from ${fromBeaconId.slice(0, 8)}... for ref ${payload.refId}`);
    const negotiations = new NegotiationQueries();

    negotiations.create({
      id: payload.negotiationId,
      refId: payload.refId,
      refName: payload.refName || '',
      buyerBeaconId: fromBeaconId,
      sellerBeaconId: this.beaconId,
      price: payload.price,
      priceCurrency: payload.priceCurrency || 'USD',
      message: payload.message || '',
      role: 'seller',
    });
  }

  /** Handle incoming proposal response from a seller */
  private handleProposalResponse(fromBeaconId: string, payload: ProposalResponsePayload): void {
    console.log(`[DHT] Received proposal response from ${fromBeaconId.slice(0, 8)}... for negotiation ${payload.negotiationId}`);
    const negotiations = new NegotiationQueries();

    const existing = negotiations.get(payload.negotiationId);
    if (!existing || existing.role !== 'buyer') {
      console.log(`[DHT] Unknown or invalid negotiation: ${payload.negotiationId}`);
      return;
    }

    negotiations.updateStatus(
      payload.negotiationId,
      payload.status,
      payload.counterPrice,
      payload.responseMessage,
    );
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
