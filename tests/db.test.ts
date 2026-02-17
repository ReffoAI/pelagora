import Database from 'better-sqlite3';
import { getTestDb } from '../src/db/schema';
import { ItemQueries, OfferQueries, MediaQueries, NegotiationQueries } from '../src/db/queries';
import { v4 as uuid } from 'uuid';

let db: Database.Database;
let items: ItemQueries;
let offers: OfferQueries;

beforeEach(() => {
  db = getTestDb();
  items = new ItemQueries(db);
  offers = new OfferQueries(db);
});

afterEach(() => {
  db.close();
});

describe('ItemQueries', () => {
  const BEACON = 'test-beacon-001';

  test('create and get item', () => {
    const item = items.create({ name: 'Vintage Guitar', description: 'A classic', category: 'Music', subcategory: 'Guitars' }, BEACON);

    expect(item.id).toBeDefined();
    expect(item.name).toBe('Vintage Guitar');
    expect(item.description).toBe('A classic');
    expect(item.category).toBe('Music');
    expect(item.subcategory).toBe('Guitars');
    expect(item.beaconId).toBe(BEACON);
  });

  test('list items', () => {
    items.create({ name: 'Guitar', description: '', category: 'Music', subcategory: 'Guitars' }, BEACON);
    items.create({ name: 'Drum Kit', description: '', category: 'Music', subcategory: 'Drums & Percussion' }, BEACON);
    items.create({ name: 'Laptop', description: '', category: 'Electronics', subcategory: 'Computers & Laptops' }, BEACON);

    expect(items.list()).toHaveLength(3);
    expect(items.list('Music')).toHaveLength(2);
    expect(items.list('Electronics')).toHaveLength(1);
    expect(items.list('nonexistent')).toHaveLength(0);
  });

  test('list items by subcategory', () => {
    items.create({ name: 'Guitar', description: '', category: 'Music', subcategory: 'Guitars' }, BEACON);
    items.create({ name: 'Bass', description: '', category: 'Music', subcategory: 'Bass' }, BEACON);
    items.create({ name: 'Drum Kit', description: '', category: 'Music', subcategory: 'Drums & Percussion' }, BEACON);

    expect(items.list('Music', 'Guitars')).toHaveLength(1);
    expect(items.list('Music', 'Bass')).toHaveLength(1);
    expect(items.list('Music', 'Drums & Percussion')).toHaveLength(1);
    expect(items.list(undefined, 'Guitars')).toHaveLength(1);
  });

  test('update item', () => {
    const item = items.create({ name: 'Old Name', description: '', category: '', subcategory: '' }, BEACON);
    const updated = items.update(item.id, { name: 'New Name', category: 'Other', subcategory: 'General' });

    expect(updated!.name).toBe('New Name');
    expect(updated!.category).toBe('Other');
    expect(updated!.subcategory).toBe('General');
  });

  test('update non-existent item returns undefined', () => {
    expect(items.update('nope', { name: 'X' })).toBeUndefined();
  });

  test('delete item', () => {
    const item = items.create({ name: 'To Delete', description: '', category: '', subcategory: '' }, BEACON);
    expect(items.delete(item.id)).toBe(true);
    expect(items.get(item.id)).toBeUndefined();
    expect(items.delete(item.id)).toBe(false);
  });

  test('search items', () => {
    items.create({ name: 'Red Bicycle', description: 'Great for commuting', category: 'Vehicles', subcategory: 'Bicycles' }, BEACON);
    items.create({ name: 'Blue Car', description: 'Sedan', category: 'Vehicles', subcategory: 'Cars' }, BEACON);

    expect(items.search('bicycle')).toHaveLength(1);
    expect(items.search('commut')).toHaveLength(1);
    expect(items.search('transport')).toHaveLength(0); // search doesn't match category
  });

  test('count items', () => {
    expect(items.count()).toBe(0);
    items.create({ name: 'A', description: '', category: '', subcategory: '' }, BEACON);
    items.create({ name: 'B', description: '', category: '', subcategory: '' }, BEACON);
    expect(items.count()).toBe(2);
  });

  test('default listingStatus is private', () => {
    const item = items.create({ name: 'Secret', description: '', category: '', subcategory: '' }, BEACON);
    expect(item.listingStatus).toBe('private');
  });

  test('create with explicit listingStatus', () => {
    const item = items.create({ name: 'Public', description: '', category: '', subcategory: '', listingStatus: 'for_sale' }, BEACON);
    expect(item.listingStatus).toBe('for_sale');
  });

  test('update listingStatus', () => {
    const item = items.create({ name: 'Item', description: '', category: '', subcategory: '' }, BEACON);
    expect(item.listingStatus).toBe('private');

    const updated = items.update(item.id, { listingStatus: 'willing_to_sell' });
    expect(updated!.listingStatus).toBe('willing_to_sell');
  });

  test('listDiscoverable excludes private items', () => {
    items.create({ name: 'Private', description: '', category: 'Music', subcategory: 'Guitars' }, BEACON);
    items.create({ name: 'For Sale', description: '', category: 'Music', subcategory: 'Guitars', listingStatus: 'for_sale' }, BEACON);
    items.create({ name: 'Willing', description: '', category: 'Music', subcategory: 'Guitars', listingStatus: 'willing_to_sell' }, BEACON);

    expect(items.list()).toHaveLength(3);
    expect(items.listDiscoverable()).toHaveLength(2);
    expect(items.listDiscoverable('Music')).toHaveLength(2);
    expect(items.listDiscoverable('Electronics')).toHaveLength(0);
  });

  test('listDiscoverable filters by category and subcategory', () => {
    items.create({ name: 'Guitar', description: '', category: 'Music', subcategory: 'Guitars', listingStatus: 'for_sale' }, BEACON);
    items.create({ name: 'Bass', description: '', category: 'Music', subcategory: 'Bass', listingStatus: 'for_sale' }, BEACON);
    items.create({ name: 'Laptop', description: '', category: 'Electronics', subcategory: 'Computers & Laptops', listingStatus: 'for_sale' }, BEACON);

    expect(items.listDiscoverable('Music', 'Guitars')).toHaveLength(1);
    expect(items.listDiscoverable('Music')).toHaveLength(2);
  });

  test('searchDiscoverable excludes private items', () => {
    items.create({ name: 'Private Bike', description: '', category: '', subcategory: '' }, BEACON);
    items.create({ name: 'Public Bike', description: '', category: '', subcategory: '', listingStatus: 'for_sale' }, BEACON);

    expect(items.search('Bike')).toHaveLength(2);
    expect(items.searchDiscoverable('Bike')).toHaveLength(1);
    expect(items.searchDiscoverable('Bike')[0].name).toBe('Public Bike');
  });

  test('list still returns all items regardless of status', () => {
    items.create({ name: 'A', description: '', category: '', subcategory: '' }, BEACON);
    items.create({ name: 'B', description: '', category: '', subcategory: '', listingStatus: 'for_sale' }, BEACON);
    items.create({ name: 'C', description: '', category: '', subcategory: '', listingStatus: 'willing_to_sell' }, BEACON);

    expect(items.list()).toHaveLength(3);
  });

  // Quantity tests
  test('default quantity is 1', () => {
    const item = items.create({ name: 'Widget', description: '', category: '', subcategory: '' }, BEACON);
    expect(item.quantity).toBe(1);
  });

  test('create with explicit quantity', () => {
    const item = items.create({ name: 'Bulk Widget', description: '', category: '', subcategory: '', quantity: 5 }, BEACON);
    expect(item.quantity).toBe(5);
  });

  test('update quantity', () => {
    const item = items.create({ name: 'Widget', description: '', category: '', subcategory: '' }, BEACON);
    const updated = items.update(item.id, { quantity: 10 });
    expect(updated!.quantity).toBe(10);
  });
});

describe('OfferQueries', () => {
  const BEACON = 'test-beacon-001';
  const SELLER = 'test-seller-001';

  test('create offer for item', () => {
    const item = items.create({ name: 'Widget', description: '', category: '', subcategory: '' }, BEACON);
    const offer = offers.create({ itemId: item.id, price: 29.99, priceCurrency: 'USD' }, SELLER);

    expect(offer.id).toBeDefined();
    expect(offer.itemId).toBe(item.id);
    expect(offer.price).toBe(29.99);
    expect(offer.priceCurrency).toBe('USD');
    expect(offer.status).toBe('active');
    expect(offer.sellerId).toBe(SELLER);
  });

  test('list offers by item', () => {
    const item1 = items.create({ name: 'A', description: '', category: '', subcategory: '' }, BEACON);
    const item2 = items.create({ name: 'B', description: '', category: '', subcategory: '' }, BEACON);
    offers.create({ itemId: item1.id, price: 10, priceCurrency: 'USD' }, SELLER);
    offers.create({ itemId: item1.id, price: 15, priceCurrency: 'USD' }, SELLER);
    offers.create({ itemId: item2.id, price: 20, priceCurrency: 'USD' }, SELLER);

    expect(offers.list()).toHaveLength(3);
    expect(offers.list(item1.id)).toHaveLength(2);
    expect(offers.list(item2.id)).toHaveLength(1);
  });

  test('update offer status', () => {
    const item = items.create({ name: 'Thing', description: '', category: '', subcategory: '' }, BEACON);
    const offer = offers.create({ itemId: item.id, price: 50, priceCurrency: 'USD' }, SELLER);

    const updated = offers.update(offer.id, { status: 'sold' });
    expect(updated!.status).toBe('sold');
  });

  test('delete offer', () => {
    const item = items.create({ name: 'Thing', description: '', category: '', subcategory: '' }, BEACON);
    const offer = offers.create({ itemId: item.id, price: 50, priceCurrency: 'USD' }, SELLER);

    expect(offers.delete(offer.id)).toBe(true);
    expect(offers.get(offer.id)).toBeUndefined();
  });

  test('cascade delete: removing item removes its offers', () => {
    const item = items.create({ name: 'Parent', description: '', category: '', subcategory: '' }, BEACON);
    offers.create({ itemId: item.id, price: 10, priceCurrency: 'USD' }, SELLER);
    offers.create({ itemId: item.id, price: 20, priceCurrency: 'USD' }, SELLER);

    expect(offers.list(item.id)).toHaveLength(2);
    items.delete(item.id);
    expect(offers.list(item.id)).toHaveLength(0);
  });

  test('countActive', () => {
    const item = items.create({ name: 'X', description: '', category: '', subcategory: '' }, BEACON);
    offers.create({ itemId: item.id, price: 10, priceCurrency: 'USD' }, SELLER);
    offers.create({ itemId: item.id, price: 20, priceCurrency: 'USD', status: 'withdrawn' }, SELLER);

    expect(offers.countActive()).toBe(1);
  });

  test('foreign key constraint: cannot create offer for missing item', () => {
    expect(() => {
      offers.create({ itemId: 'nonexistent', price: 10, priceCurrency: 'USD' }, SELLER);
    }).toThrow();
  });
});

describe('MediaQueries', () => {
  const BEACON = 'test-beacon-001';
  let media: MediaQueries;

  beforeEach(() => {
    media = new MediaQueries(db);
  });

  test('create and list media for item', () => {
    const item = items.create({ name: 'Widget', description: '', category: '', subcategory: '' }, BEACON);
    const m = media.create({
      id: uuid(),
      itemId: item.id,
      mediaType: 'photo',
      filePath: 'uploads/test/photo1.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024,
    });

    expect(m.id).toBeDefined();
    expect(m.itemId).toBe(item.id);
    expect(m.mediaType).toBe('photo');
    expect(m.filePath).toBe('uploads/test/photo1.jpg');
    expect(m.mimeType).toBe('image/jpeg');
    expect(m.fileSize).toBe(1024);

    const list = media.listForItem(item.id);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(m.id);
  });

  test('countPhotos and hasVideo', () => {
    const item = items.create({ name: 'Widget', description: '', category: '', subcategory: '' }, BEACON);

    expect(media.countPhotos(item.id)).toBe(0);
    expect(media.hasVideo(item.id)).toBe(false);

    media.create({ id: uuid(), itemId: item.id, mediaType: 'photo', filePath: 'p1.jpg', mimeType: 'image/jpeg', fileSize: 100 });
    media.create({ id: uuid(), itemId: item.id, mediaType: 'photo', filePath: 'p2.jpg', mimeType: 'image/jpeg', fileSize: 100 });
    media.create({ id: uuid(), itemId: item.id, mediaType: 'video', filePath: 'v1.mp4', mimeType: 'video/mp4', fileSize: 5000 });

    expect(media.countPhotos(item.id)).toBe(2);
    expect(media.hasVideo(item.id)).toBe(true);
  });

  test('delete media', () => {
    const item = items.create({ name: 'Widget', description: '', category: '', subcategory: '' }, BEACON);
    const m = media.create({ id: uuid(), itemId: item.id, mediaType: 'photo', filePath: 'p1.jpg', mimeType: 'image/jpeg', fileSize: 100 });

    const deleted = media.delete(m.id);
    expect(deleted).toBeDefined();
    expect(deleted!.id).toBe(m.id);
    expect(media.listForItem(item.id)).toHaveLength(0);
  });

  test('delete returns undefined for missing media', () => {
    expect(media.delete('nonexistent')).toBeUndefined();
  });

  test('deleteAllForItem returns file paths', () => {
    const item = items.create({ name: 'Widget', description: '', category: '', subcategory: '' }, BEACON);
    media.create({ id: uuid(), itemId: item.id, mediaType: 'photo', filePath: 'p1.jpg', mimeType: 'image/jpeg', fileSize: 100 });
    media.create({ id: uuid(), itemId: item.id, mediaType: 'photo', filePath: 'p2.jpg', mimeType: 'image/jpeg', fileSize: 100 });

    const paths = media.deleteAllForItem(item.id);
    expect(paths).toHaveLength(2);
    expect(paths).toContain('p1.jpg');
    expect(paths).toContain('p2.jpg');
    expect(media.listForItem(item.id)).toHaveLength(0);
  });

  test('cascade delete: removing item removes its media', () => {
    const item = items.create({ name: 'Widget', description: '', category: '', subcategory: '' }, BEACON);
    media.create({ id: uuid(), itemId: item.id, mediaType: 'photo', filePath: 'p1.jpg', mimeType: 'image/jpeg', fileSize: 100 });

    items.delete(item.id);
    expect(media.listForItem(item.id)).toHaveLength(0);
  });
});

describe('NegotiationQueries', () => {
  let negotiations: NegotiationQueries;

  beforeEach(() => {
    negotiations = new NegotiationQueries(db);
  });

  test('create and get negotiation', () => {
    const negId = uuid();
    const neg = negotiations.create({
      id: negId,
      itemId: 'item-1',
      itemName: 'Test Item',
      buyerBeaconId: 'buyer-beacon',
      sellerBeaconId: 'seller-beacon',
      price: 50,
      priceCurrency: 'USD',
      message: 'Interested!',
      role: 'buyer',
    });

    expect(neg.id).toBe(negId);
    expect(neg.itemId).toBe('item-1');
    expect(neg.itemName).toBe('Test Item');
    expect(neg.price).toBe(50);
    expect(neg.status).toBe('pending');
    expect(neg.role).toBe('buyer');

    const fetched = negotiations.get(negId);
    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe(negId);
  });

  test('listIncoming returns seller negotiations', () => {
    negotiations.create({ id: uuid(), itemId: 'i1', itemName: '', buyerBeaconId: 'b', sellerBeaconId: 's', price: 10, priceCurrency: 'USD', message: '', role: 'seller' });
    negotiations.create({ id: uuid(), itemId: 'i2', itemName: '', buyerBeaconId: 'b', sellerBeaconId: 's', price: 20, priceCurrency: 'USD', message: '', role: 'buyer' });

    expect(negotiations.listIncoming()).toHaveLength(1);
    expect(negotiations.listIncoming()[0].role).toBe('seller');
  });

  test('listOutgoing returns buyer negotiations', () => {
    negotiations.create({ id: uuid(), itemId: 'i1', itemName: '', buyerBeaconId: 'b', sellerBeaconId: 's', price: 10, priceCurrency: 'USD', message: '', role: 'seller' });
    negotiations.create({ id: uuid(), itemId: 'i2', itemName: '', buyerBeaconId: 'b', sellerBeaconId: 's', price: 20, priceCurrency: 'USD', message: '', role: 'buyer' });

    expect(negotiations.listOutgoing()).toHaveLength(1);
    expect(negotiations.listOutgoing()[0].role).toBe('buyer');
  });

  test('listForItem', () => {
    negotiations.create({ id: uuid(), itemId: 'item-x', itemName: '', buyerBeaconId: 'b', sellerBeaconId: 's', price: 10, priceCurrency: 'USD', message: '', role: 'seller' });
    negotiations.create({ id: uuid(), itemId: 'item-y', itemName: '', buyerBeaconId: 'b', sellerBeaconId: 's', price: 20, priceCurrency: 'USD', message: '', role: 'buyer' });

    expect(negotiations.listForItem('item-x')).toHaveLength(1);
    expect(negotiations.listForItem('item-y')).toHaveLength(1);
    expect(negotiations.listForItem('item-z')).toHaveLength(0);
  });

  test('updateStatus', () => {
    const negId = uuid();
    negotiations.create({ id: negId, itemId: 'i1', itemName: '', buyerBeaconId: 'b', sellerBeaconId: 's', price: 100, priceCurrency: 'USD', message: '', role: 'seller' });

    const updated = negotiations.updateStatus(negId, 'accepted');
    expect(updated!.status).toBe('accepted');
  });

  test('updateStatus with counter price', () => {
    const negId = uuid();
    negotiations.create({ id: negId, itemId: 'i1', itemName: '', buyerBeaconId: 'b', sellerBeaconId: 's', price: 100, priceCurrency: 'USD', message: '', role: 'seller' });

    const updated = negotiations.updateStatus(negId, 'countered', 75, 'How about this?');
    expect(updated!.status).toBe('countered');
    expect(updated!.counterPrice).toBe(75);
    expect(updated!.responseMessage).toBe('How about this?');
  });

  test('updateStatus returns undefined for missing negotiation', () => {
    expect(negotiations.updateStatus('nonexistent', 'accepted')).toBeUndefined();
  });

  test('countPending counts seller pending negotiations', () => {
    negotiations.create({ id: uuid(), itemId: 'i1', itemName: '', buyerBeaconId: 'b', sellerBeaconId: 's', price: 10, priceCurrency: 'USD', message: '', role: 'seller' });
    negotiations.create({ id: uuid(), itemId: 'i2', itemName: '', buyerBeaconId: 'b', sellerBeaconId: 's', price: 20, priceCurrency: 'USD', message: '', role: 'seller', status: 'accepted' });
    negotiations.create({ id: uuid(), itemId: 'i3', itemName: '', buyerBeaconId: 'b', sellerBeaconId: 's', price: 30, priceCurrency: 'USD', message: '', role: 'buyer' });

    expect(negotiations.countPending()).toBe(1);
  });
});
