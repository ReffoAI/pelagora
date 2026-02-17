import Database from 'better-sqlite3';
import { getTestDb } from '../src/db/schema';
import { ItemQueries, OfferQueries } from '../src/db/queries';

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

    const fetched = items.get(item.id);
    expect(fetched).toEqual(item);
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
