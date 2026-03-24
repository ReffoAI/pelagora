import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDb } from './src/db';

// Get or create beacon ID (same logic as index.ts)
function getOrCreateBeaconId(): string {
  if (process.env.BEACON_ID) return process.env.BEACON_ID;
  const idFile = path.join(process.cwd(), 'data', 'beacon-id');
  try {
    return fs.readFileSync(idFile, 'utf-8').trim();
  } catch {
    const id = crypto.randomUUID();
    fs.mkdirSync(path.dirname(idFile), { recursive: true });
    fs.writeFileSync(idFile, id);
    return id;
  }
}

const beaconId = getOrCreateBeaconId();
const db = getDb();

interface TestItem {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  listing_status: string;
  price: number;
  condition: string;
  quantity: number;
  location_city: string;
  location_state: string;
  location_zip: string;
  location_country: string;
  location_lat: number;
  location_lng: number;
  selling_scope: string;
}

// Categories & subcategories match TAXONOMY exactly:
// Electronics: Phones & Tablets, Computers & Laptops, Audio & Headphones, Cameras & Photography, TV & Video, Gaming, Components & Parts, Accessories
// Music: Guitars, Bass, Drums & Percussion, Keyboards & Pianos, Amplifiers, Effects & Pedals, Pro Audio, Accessories
// Home & Garden: Furniture, Kitchen & Dining, Tools & Hardware, Appliances, Outdoor & Garden, Lighting, Decor, Storage & Organization
// Clothing & Accessories: Mens, Womens, Kids, Shoes, Bags & Wallets, Activewear, Vintage
// Sports: Cycling, Fitness & Gym, Water Sports, Winter Sports, Team Sports, Outdoor & Camping, Running, Racquet Sports
// Books & Media: Books, Vinyl & Records, CDs & DVDs, Video Games, Magazines, Textbooks, Comics & Graphic Novels, Audiobooks
// Vehicles: Cars, Motorcycles, Bicycles, Trucks & Vans, Boats, Parts & Accessories, Trailers, Electric Vehicles
// Collectibles: Antiques, Art, Coins & Currency, Trading Cards, Memorabilia, Stamps, Vintage Electronics

const items: TestItem[] = [
  // Electronics
  { name: 'Sony WH-1000XM5 Headphones', description: 'Wireless noise-canceling headphones, excellent condition. Includes case and cable.', category: 'Electronics', subcategory: 'Audio & Headphones', listing_status: 'for_sale', price: 249.99, condition: 'Like New', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'national' },
  { name: 'iPad Air M2 64GB', description: '2024 iPad Air with M2 chip, Space Gray. Barely used, still under warranty.', category: 'Electronics', subcategory: 'Phones & Tablets', listing_status: 'for_sale', price: 499.00, condition: 'Like New', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'national' },
  { name: 'Mechanical Keyboard Keychron K8 Pro', description: 'Hot-swappable mechanical keyboard with Gateron Brown switches. RGB backlit.', category: 'Electronics', subcategory: 'Accessories', listing_status: 'for_sale', price: 89.00, condition: 'Good', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'range' },
  { name: 'DJI Mini 3 Pro Drone', description: 'Compact drone with 4K camera, 3 batteries, and carrying case. Under 250g.', category: 'Electronics', subcategory: 'Cameras & Photography', listing_status: 'for_sale', price: 629.00, condition: 'Good', quantity: 1, location_city: 'Neptune Beach', location_state: 'FL', location_zip: '32266', location_country: 'US', location_lat: 30.3127, location_lng: -81.3961, selling_scope: 'national' },
  { name: 'Nintendo Switch OLED', description: 'White model with 3 games (Zelda TOTK, Mario Odyssey, Smash Bros). Extra Pro controller.', category: 'Electronics', subcategory: 'Gaming', listing_status: 'for_sale', price: 299.00, condition: 'Good', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'range' },

  // Home & Garden (Furniture subcategory)
  { name: 'Herman Miller Aeron Chair Size B', description: 'Fully loaded Aeron with PostureFit SL, adjustable arms. Remastered model.', category: 'Home & Garden', subcategory: 'Furniture', listing_status: 'for_sale', price: 750.00, condition: 'Good', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'range' },
  { name: 'Mid-Century Modern Walnut Desk', description: '60" solid walnut desk with two drawers. Handmade by local woodworker.', category: 'Home & Garden', subcategory: 'Furniture', listing_status: 'willing_to_sell', price: 1200.00, condition: 'Like New', quantity: 1, location_city: 'Atlantic Beach', location_state: 'FL', location_zip: '32233', location_country: 'US', location_lat: 30.3341, location_lng: -81.3981, selling_scope: 'range' },
  { name: 'IKEA Kallax Shelf 4x4', description: 'White 4x4 Kallax shelving unit with 8 fabric inserts. Already disassembled.', category: 'Home & Garden', subcategory: 'Storage & Organization', listing_status: 'for_sale', price: 85.00, condition: 'Good', quantity: 1, location_city: 'Jacksonville', location_state: 'FL', location_zip: '32225', location_country: 'US', location_lat: 30.3260, location_lng: -81.4465, selling_scope: 'range' },

  // Sports
  { name: 'Trek Marlin 7 Mountain Bike', description: '2024 Trek Marlin 7, size Large. Shimano Deore 1x10 drivetrain. Ridden twice.', category: 'Sports', subcategory: 'Cycling', listing_status: 'for_sale', price: 750.00, condition: 'Like New', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'range' },
  { name: 'REI Half Dome 2 Plus Tent', description: 'Two-person backpacking tent. Used for 3 trips, excellent condition. Includes footprint.', category: 'Sports', subcategory: 'Outdoor & Camping', listing_status: 'for_sale', price: 175.00, condition: 'Good', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'national' },
  { name: 'Rogue Ohio Power Bar', description: '20kg powerlifting barbell, bare steel finish. 29mm shaft, aggressive knurl.', category: 'Sports', subcategory: 'Fitness & Gym', listing_status: 'for_sale', price: 225.00, condition: 'Good', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'range' },
  { name: 'Patagonia Nano Puff Jacket (M)', description: 'Men\'s medium, black. Lightweight insulated jacket, great for layering.', category: 'Clothing & Accessories', subcategory: 'Mens', listing_status: 'for_sale', price: 120.00, condition: 'Like New', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'national' },

  // Home & Garden (Tools)
  { name: 'DeWalt 20V Max Drill/Driver Kit', description: 'Brushless drill/driver with 2 batteries, charger, and bag. Barely used.', category: 'Home & Garden', subcategory: 'Tools & Hardware', listing_status: 'for_sale', price: 129.00, condition: 'Like New', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'range' },
  { name: 'Weber Genesis E-325s Gas Grill', description: 'Three-burner propane grill with side burner. Used one summer. Cover included.', category: 'Home & Garden', subcategory: 'Outdoor & Garden', listing_status: 'for_sale', price: 550.00, condition: 'Good', quantity: 1, location_city: 'Ponte Vedra Beach', location_state: 'FL', location_zip: '32082', location_country: 'US', location_lat: 30.2397, location_lng: -81.3856, selling_scope: 'range' },
  { name: 'Dyson V15 Detect Vacuum', description: 'Cordless stick vacuum with laser dust detection. All attachments included.', category: 'Home & Garden', subcategory: 'Appliances', listing_status: 'for_sale', price: 425.00, condition: 'Good', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'range' },

  // Music
  { name: 'Fender Player Telecaster', description: 'Butterscotch blonde, maple neck. Mexican-made. Comes with gig bag.', category: 'Music', subcategory: 'Guitars', listing_status: 'willing_to_sell', price: 650.00, condition: 'Good', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'national' },
  { name: 'Roland TD-17KVX Electronic Drum Kit', description: 'V-Drums with mesh heads. Includes throne, headphones, and extra kick pedal.', category: 'Music', subcategory: 'Drums & Percussion', listing_status: 'for_sale', price: 1100.00, condition: 'Good', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'range' },

  // Books & Media
  { name: 'The Bitcoin Standard (Hardcover)', description: 'First edition hardcover by Saifedean Ammous. No markings or highlights.', category: 'Books & Media', subcategory: 'Books', listing_status: 'for_sale', price: 25.00, condition: 'Like New', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'national' },
  { name: 'Mastering Bitcoin by Andreas Antonopoulos', description: 'Third edition. Essential technical reference for bitcoin developers.', category: 'Books & Media', subcategory: 'Books', listing_status: 'for_sale', price: 30.00, condition: 'Good', quantity: 2, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'national' },

  // Vehicles
  { name: 'Thule T2 Pro XT Bike Rack', description: 'Hitch-mount 2-bike rack for 2" receiver. Fits up to 60lb bikes. Folds flat.', category: 'Vehicles', subcategory: 'Parts & Accessories', listing_status: 'for_sale', price: 400.00, condition: 'Good', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'range' },

  // Collectibles
  { name: 'Pokemon Base Set Charizard (LP)', description: 'Lightly played 1st edition Charizard. Holo in good shape, minor edge wear.', category: 'Collectibles', subcategory: 'Trading Cards', listing_status: 'willing_to_sell', price: 450.00, condition: 'Good', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'national' },

  // Rentals
  { name: 'Pressure Washer 3100 PSI', description: 'Gas-powered pressure washer. Great for decks, driveways, siding. Pickup/return same day.', category: 'Home & Garden', subcategory: 'Tools & Hardware', listing_status: 'for_rent', price: 45.00, condition: 'Good', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'range' },
  { name: 'Canoe - 16ft Old Town Discovery', description: 'Stable recreational canoe, great for the Intracoastal. Life jackets and paddles included.', category: 'Sports', subcategory: 'Water Sports', listing_status: 'for_rent', price: 60.00, condition: 'Good', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'range' },
  { name: 'Projector - Epson Home Cinema 2350', description: '4K PRO-UHD projector with 100" screen. Perfect for backyard movie nights. Daily rental.', category: 'Electronics', subcategory: 'TV & Video', listing_status: 'for_rent', price: 35.00, condition: 'Good', quantity: 1, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'range' },
  { name: 'Ledger Nano X Hardware Wallet', description: 'Bluetooth-enabled hardware wallet for bitcoin and crypto. Factory sealed, never opened.', category: 'Electronics', subcategory: 'Accessories', listing_status: 'for_sale', price: 119.00, condition: 'New', quantity: 3, location_city: 'Jacksonville Beach', location_state: 'FL', location_zip: '32250', location_country: 'US', location_lat: 30.2844, location_lng: -81.3933, selling_scope: 'national' },
];

const insert = db.prepare(`
  INSERT INTO refs (
    id, name, description, category, subcategory, listing_status,
    quantity, condition, location_city, location_state, location_zip,
    location_country, location_lat, location_lng, selling_scope,
    beacon_id, created_at, updated_at,
    network_published, reffo_synced
  ) VALUES (
    @id, @name, @description, @category, @subcategory, @listing_status,
    @quantity, @condition, @location_city, @location_state, @location_zip,
    @location_country, @location_lat, @location_lng, @selling_scope,
    @beacon_id, @created_at, @updated_at,
    0, 0
  )
`);

const insertMany = db.transaction((rows: typeof items) => {
  for (const item of rows) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    insert.run({
      id: crypto.randomUUID(),
      ...item,
      beacon_id: beaconId,
      created_at: now,
      updated_at: now,
    });
  }
});

insertMany(items);
console.log(`Seeded ${items.length} test items for beacon ${beaconId}`);
