import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/api';
import { getTestDb } from '../src/db/schema';
import { ItemQueries, OfferQueries } from '../src/db/queries';

let db: Database.Database;
let app: ReturnType<typeof createApp>;

// Mock the getDb to return test db
jest.mock('../src/db/schema', () => {
  const actual = jest.requireActual('../src/db/schema');
  let testDb: Database.Database;
  return {
    ...actual,
    getDb: () => {
      if (!testDb) {
        testDb = actual.getTestDb();
      }
      return testDb;
    },
    getTestDb: () => {
      testDb = actual.getTestDb();
      return testDb;
    },
    __getTestDb: () => testDb,
  };
});

beforeEach(() => {
  db = getTestDb();
  app = createApp();
  app.set('beaconId', 'test-beacon-id');
});

afterEach(() => {
  db.close();
});

describe('GET /health', () => {
  test('returns beacon info', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version', '0.1.0');
    expect(res.body).toHaveProperty('itemCount');
    expect(res.body).toHaveProperty('offerCount');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('dht');
  });
});

describe('GET /', () => {
  test('returns HTML page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('Reffo Beacon');
    expect(res.text).toContain('List an Item');
    expect(res.text).toContain('My Items');
    expect(res.text).toContain('Search Network');
  });
});

describe('GET /taxonomy', () => {
  test('returns taxonomy object', async () => {
    const res = await request(app).get('/taxonomy');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('Electronics');
    expect(res.body).toHaveProperty('Music');
    expect(res.body).toHaveProperty('Other');
    expect(Array.isArray(res.body.Electronics)).toBe(true);
    expect(res.body.Music).toContain('Guitars');
  });
});

describe('POST /items', () => {
  test('creates an item', async () => {
    const res = await request(app)
      .post('/items')
      .send({ name: 'Test Item', description: 'A test', category: 'Electronics', subcategory: 'Phones & Tablets' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Item');
    expect(res.body.description).toBe('A test');
    expect(res.body.category).toBe('Electronics');
    expect(res.body.subcategory).toBe('Phones & Tablets');
    expect(res.body.id).toBeDefined();
  });

  test('rejects item without name', async () => {
    const res = await request(app).post('/items').send({ description: 'no name' });
    expect(res.status).toBe(400);
  });

  test('rejects invalid category', async () => {
    const res = await request(app)
      .post('/items')
      .send({ name: 'Bad Cat', category: 'NotACategory' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid category');
  });

  test('rejects invalid subcategory', async () => {
    const res = await request(app)
      .post('/items')
      .send({ name: 'Bad Subcat', category: 'Electronics', subcategory: 'NotASubcat' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid subcategory');
  });

  test('allows empty category', async () => {
    const res = await request(app)
      .post('/items')
      .send({ name: 'No Category' });
    expect(res.status).toBe(201);
  });

  test('defaults listingStatus to private', async () => {
    const res = await request(app)
      .post('/items')
      .send({ name: 'Private Item' });
    expect(res.status).toBe(201);
    expect(res.body.listingStatus).toBe('private');
  });

  test('accepts valid listingStatus values', async () => {
    const res1 = await request(app)
      .post('/items')
      .send({ name: 'Sale Item', listingStatus: 'for_sale' });
    expect(res1.status).toBe(201);
    expect(res1.body.listingStatus).toBe('for_sale');

    const res2 = await request(app)
      .post('/items')
      .send({ name: 'Willing Item', listingStatus: 'willing_to_sell' });
    expect(res2.status).toBe(201);
    expect(res2.body.listingStatus).toBe('willing_to_sell');
  });

  test('rejects invalid listingStatus', async () => {
    const res = await request(app)
      .post('/items')
      .send({ name: 'Bad Status', listingStatus: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid listingStatus');
  });
});

describe('GET /items', () => {
  test('lists items', async () => {
    await request(app).post('/items').send({ name: 'A', category: 'Electronics', subcategory: 'Gaming' });
    await request(app).post('/items').send({ name: 'B', category: 'Music', subcategory: 'Guitars' });

    const res = await request(app).get('/items');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('filters by category', async () => {
    await request(app).post('/items').send({ name: 'A', category: 'Electronics', subcategory: 'Gaming' });
    await request(app).post('/items').send({ name: 'B', category: 'Music', subcategory: 'Guitars' });

    const res = await request(app).get('/items?category=Electronics');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('A');
  });

  test('filters by subcategory', async () => {
    await request(app).post('/items').send({ name: 'A', category: 'Music', subcategory: 'Guitars' });
    await request(app).post('/items').send({ name: 'B', category: 'Music', subcategory: 'Bass' });

    const res = await request(app).get('/items?category=Music&subcategory=Guitars');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('A');
  });

  test('searches items', async () => {
    await request(app).post('/items').send({ name: 'Red Bicycle', description: 'Fast' });
    await request(app).post('/items').send({ name: 'Blue Car', description: 'Slow' });

    const res = await request(app).get('/items?search=bicycle');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('returns items of all listing statuses', async () => {
    await request(app).post('/items').send({ name: 'Private', listingStatus: 'private' });
    await request(app).post('/items').send({ name: 'For Sale', listingStatus: 'for_sale' });
    await request(app).post('/items').send({ name: 'Willing', listingStatus: 'willing_to_sell' });

    const res = await request(app).get('/items');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    const statuses = res.body.map((i: any) => i.listingStatus).sort();
    expect(statuses).toEqual(['for_sale', 'private', 'willing_to_sell']);
  });
});

describe('PATCH /items/:id', () => {
  test('updates an item', async () => {
    const created = await request(app).post('/items').send({ name: 'Old', category: 'Electronics', subcategory: 'Gaming' });
    const res = await request(app).patch(`/items/${created.body.id}`).send({ name: 'New' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New');
  });

  test('updates listingStatus', async () => {
    const created = await request(app).post('/items').send({ name: 'Test' });
    expect(created.body.listingStatus).toBe('private');

    const res = await request(app).patch(`/items/${created.body.id}`).send({ listingStatus: 'for_sale' });
    expect(res.status).toBe(200);
    expect(res.body.listingStatus).toBe('for_sale');
  });

  test('rejects invalid listingStatus on update', async () => {
    const created = await request(app).post('/items').send({ name: 'Test' });
    const res = await request(app).patch(`/items/${created.body.id}`).send({ listingStatus: 'bogus' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid listingStatus');
  });

  test('404 for missing item', async () => {
    const res = await request(app).patch('/items/nope').send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /items/:id', () => {
  test('deletes an item', async () => {
    const created = await request(app).post('/items').send({ name: 'Bye' });
    const res = await request(app).delete(`/items/${created.body.id}`);
    expect(res.status).toBe(204);
  });
});

describe('Offers API', () => {
  let itemId: string;

  beforeEach(async () => {
    const res = await request(app).post('/items').send({ name: 'Widget', category: 'Other', subcategory: 'General' });
    itemId = res.body.id;
  });

  test('creates an offer', async () => {
    const res = await request(app)
      .post('/offers')
      .send({ itemId, price: 25.50, priceCurrency: 'USD' });

    expect(res.status).toBe(201);
    expect(res.body.price).toBe(25.5);
    expect(res.body.status).toBe('active');
  });

  test('rejects offer without itemId', async () => {
    const res = await request(app).post('/offers').send({ price: 10 });
    expect(res.status).toBe(400);
  });

  test('rejects offer for nonexistent item', async () => {
    const res = await request(app)
      .post('/offers')
      .send({ itemId: 'nope', price: 10, priceCurrency: 'USD' });
    expect(res.status).toBe(404);
  });

  test('updates offer status', async () => {
    const created = await request(app)
      .post('/offers')
      .send({ itemId, price: 30, priceCurrency: 'USD' });

    const res = await request(app)
      .patch(`/offers/${created.body.id}`)
      .send({ status: 'sold' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('sold');
  });

  test('lists offers', async () => {
    await request(app).post('/offers').send({ itemId, price: 10, priceCurrency: 'USD' });
    await request(app).post('/offers').send({ itemId, price: 20, priceCurrency: 'USD' });

    const res = await request(app).get('/offers');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('deletes offer', async () => {
    const created = await request(app)
      .post('/offers')
      .send({ itemId, price: 10, priceCurrency: 'USD' });

    const res = await request(app).delete(`/offers/${created.body.id}`);
    expect(res.status).toBe(204);
  });
});
