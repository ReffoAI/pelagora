/**
 * Category Schema Definitions for Reffo Refs
 *
 * Each category schema defines:
 * - schemaOrgType: The Schema.org type (e.g., "Car", "SingleFamilyResidence")
 * - traits: Array of trait names this category composes
 * - conditionOptions: Category-appropriate condition values
 * - attributes: Form field definitions with Schema.org property mappings
 * - buildSchemaOrg(): Transforms flat attributes into Schema.org JSON-LD
 */

export interface AttributeField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  placeholder?: string;
  options?: string[];
  schemaOrg?: string;
  summary?: boolean;
  unit?: string;
}

export interface CategorySchema {
  schemaOrgType: string;
  additionalType?: string;
  traits: string[];
  conditionOptions: string[];
  attributes: AttributeField[];
  buildSchemaOrg(attrs: Record<string, unknown>): Record<string, unknown>;
}

// ─── Vehicles | Cars ───────────────────────────────────────────────
const carSchema: CategorySchema = {
  schemaOrgType: 'Car',
  traits: ['Priceable', 'Conditional', 'Valueable', 'Serialized', 'LocationBound'],
  conditionOptions: ['excellent', 'good', 'fair', 'poor', 'parts_only'],
  attributes: [
    { key: 'year', label: 'Year', type: 'number', placeholder: '2020', schemaOrg: 'vehicleModelDate', summary: true },
    { key: 'make', label: 'Make', type: 'text', placeholder: 'Toyota', schemaOrg: 'brand', summary: true },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'Camry', schemaOrg: 'model', summary: true },
    { key: 'trim', label: 'Trim', type: 'text', placeholder: 'XLE' },
    { key: 'mileage', label: 'Mileage', type: 'number', placeholder: '45000', schemaOrg: 'mileageFromOdometer', unit: 'mi', summary: true },
    { key: 'transmission', label: 'Transmission', type: 'select', options: ['automatic', 'manual', 'cvt'], schemaOrg: 'vehicleTransmission' },
    { key: 'body_type', label: 'Body Type', type: 'select', options: ['sedan', 'suv', 'truck', 'coupe', 'convertible', 'van', 'wagon', 'hatchback'], schemaOrg: 'bodyType' },
    { key: 'title_status', label: 'Title Status', type: 'select', options: ['clean', 'salvage', 'rebuilt', 'lemon'], summary: true },
    { key: 'vin', label: 'VIN', type: 'text', placeholder: '1HGCM82633A004352', schemaOrg: 'vehicleIdentificationNumber' },
    { key: 'accidents', label: 'Known Accidents', type: 'number', placeholder: '0', schemaOrg: 'knownVehicleDamages' },
    { key: 'service_history', label: 'Service History', type: 'select', options: ['full', 'partial', 'none', 'unknown'] },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Car' };
    if (attrs.year) ld.vehicleModelDate = String(attrs.year);
    if (attrs.make) ld.brand = { '@type': 'Brand', name: attrs.make };
    if (attrs.model) ld.model = attrs.model;
    if (attrs.mileage) ld.mileageFromOdometer = { '@type': 'QuantitativeValue', value: attrs.mileage, unitCode: 'SMI' };
    if (attrs.transmission) ld.vehicleTransmission = attrs.transmission;
    if (attrs.body_type) ld.bodyType = attrs.body_type;
    if (attrs.vin) ld.vehicleIdentificationNumber = attrs.vin;
    if (attrs.accidents) ld.knownVehicleDamages = String(attrs.accidents);
    return ld;
  },
};

// ─── Vehicles | Boats ──────────────────────────────────────────────
const boatSchema: CategorySchema = {
  schemaOrgType: 'Vehicle',
  additionalType: 'Boat',
  traits: ['Priceable', 'Conditional', 'Valueable', 'Serialized', 'LocationBound'],
  conditionOptions: ['excellent', 'good', 'fair', 'project', 'parts'],
  attributes: [
    { key: 'year', label: 'Year', type: 'number', placeholder: '2018', schemaOrg: 'productionDate', summary: true },
    { key: 'manufacturer', label: 'Manufacturer', type: 'text', placeholder: 'Boston Whaler', schemaOrg: 'brand', summary: true },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'Montauk 170', schemaOrg: 'model', summary: true },
    { key: 'length_feet', label: 'Length (ft)', type: 'number', placeholder: '17', schemaOrg: 'length' },
    { key: 'boat_type', label: 'Boat Type', type: 'select', options: ['center_console', 'bowrider', 'pontoon', 'sailboat', 'cabin_cruiser', 'fishing', 'kayak', 'jet_ski', 'other'], schemaOrg: 'bodyType' },
    { key: 'hull_material', label: 'Hull Material', type: 'select', options: ['fiberglass', 'aluminum', 'wood', 'inflatable', 'composite'] },
    { key: 'engine_hours', label: 'Engine Hours', type: 'number', placeholder: '350', schemaOrg: 'mileageFromOdometer', summary: true },
    { key: 'engine_make', label: 'Engine Make', type: 'text', placeholder: 'Mercury' },
    { key: 'fuel_type', label: 'Fuel Type', type: 'select', options: ['gasoline', 'diesel', 'electric', 'none'], schemaOrg: 'fuelType' },
    { key: 'hin', label: 'HIN', type: 'text', placeholder: 'Hull ID Number', schemaOrg: 'vehicleIdentificationNumber' },
    { key: 'trailer_included', label: 'Trailer Included', type: 'boolean' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Vehicle', additionalType: 'Boat' };
    if (attrs.year) ld.productionDate = String(attrs.year);
    if (attrs.manufacturer) ld.brand = { '@type': 'Brand', name: attrs.manufacturer };
    if (attrs.model) ld.model = attrs.model;
    if (attrs.boat_type) ld.bodyType = attrs.boat_type;
    if (attrs.engine_hours) ld.mileageFromOdometer = { '@type': 'QuantitativeValue', value: attrs.engine_hours, unitText: 'hours' };
    if (attrs.fuel_type) ld.fuelType = attrs.fuel_type;
    if (attrs.hin) ld.vehicleIdentificationNumber = attrs.hin;
    return ld;
  },
};

// ─── Housing ───────────────────────────────────────────────────────
const housingSchema: CategorySchema = {
  schemaOrgType: 'SingleFamilyResidence',
  traits: ['Priceable', 'Conditional', 'Valueable', 'Serialized', 'LocationBound'],
  conditionOptions: ['move_in_ready', 'needs_cosmetic', 'needs_repair', 'teardown'],
  attributes: [
    { key: 'property_type', label: 'Property Type', type: 'select', options: ['single_family', 'condo', 'townhouse', 'multi_family', 'land', 'mobile_home'], schemaOrg: 'accommodationCategory', summary: true },
    { key: 'beds', label: 'Bedrooms', type: 'number', placeholder: '3', schemaOrg: 'numberOfBedrooms', summary: true },
    { key: 'baths', label: 'Bathrooms', type: 'number', placeholder: '2', schemaOrg: 'numberOfBathroomsTotal', summary: true },
    { key: 'sqft', label: 'Sq. Ft.', type: 'number', placeholder: '1800', schemaOrg: 'floorSize', unit: 'sqft', summary: true },
    { key: 'lot_size_acres', label: 'Lot Size (acres)', type: 'number', placeholder: '0.25' },
    { key: 'year_built', label: 'Year Built', type: 'number', placeholder: '1995', schemaOrg: 'yearBuilt' },
    { key: 'stories', label: 'Stories', type: 'number', placeholder: '2' },
    { key: 'hoa_monthly', label: 'HOA Monthly ($)', type: 'number', placeholder: '250' },
    { key: 'property_tax_annual', label: 'Annual Property Tax ($)', type: 'number', placeholder: '3500' },
    { key: 'parcel_id', label: 'Parcel ID', type: 'text', placeholder: 'Tax parcel number' },
  ],
  buildSchemaOrg(attrs) {
    const type = attrs.property_type === 'condo' ? 'Apartment' : 'SingleFamilyResidence';
    const ld: Record<string, unknown> = { '@type': type };
    if (attrs.property_type) ld.accommodationCategory = attrs.property_type;
    if (attrs.beds) ld.numberOfBedrooms = attrs.beds;
    if (attrs.baths) ld.numberOfBathroomsTotal = attrs.baths;
    if (attrs.sqft) ld.floorSize = { '@type': 'QuantitativeValue', value: attrs.sqft, unitCode: 'FTK' };
    if (attrs.year_built) ld.yearBuilt = String(attrs.year_built);
    return ld;
  },
};

// ─── Electronics | Phones & Tablets ────────────────────────────────
const phoneSchema: CategorySchema = {
  schemaOrgType: 'IndividualProduct',
  additionalType: 'Smartphone',
  traits: ['Priceable', 'Conditional', 'Valueable', 'Serialized'],
  conditionOptions: ['new_sealed', 'like_new', 'excellent', 'good', 'fair', 'poor', 'for_parts'],
  attributes: [
    { key: 'manufacturer', label: 'Brand', type: 'text', placeholder: 'Apple', schemaOrg: 'brand', summary: true },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'iPhone 15 Pro', schemaOrg: 'model', summary: true },
    { key: 'storage_gb', label: 'Storage (GB)', type: 'number', placeholder: '256', summary: true },
    { key: 'network', label: 'Network', type: 'select', options: ['5G', '4G LTE', '3G', 'WiFi only'] },
    { key: 'carrier_locked', label: 'Carrier Locked', type: 'select', options: ['unlocked', 'AT&T', 'T-Mobile', 'Verizon', 'other'] },
    { key: 'battery_health_percent', label: 'Battery Health (%)', type: 'number', placeholder: '92' },
    { key: 'imei', label: 'IMEI', type: 'text', placeholder: 'Serial number', schemaOrg: 'serialNumber' },
    { key: 'color', label: 'Color', type: 'text', placeholder: 'Space Black', schemaOrg: 'color' },
    { key: 'original_box', label: 'Original Box', type: 'boolean' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'IndividualProduct', additionalType: 'Smartphone' };
    if (attrs.manufacturer) ld.brand = { '@type': 'Brand', name: attrs.manufacturer };
    if (attrs.model) ld.model = attrs.model;
    if (attrs.color) ld.color = attrs.color;
    if (attrs.imei) ld.serialNumber = attrs.imei;
    const addlProps: Record<string, unknown>[] = [];
    if (attrs.storage_gb) addlProps.push({ '@type': 'PropertyValue', name: 'storageGB', value: attrs.storage_gb });
    if (attrs.network) addlProps.push({ '@type': 'PropertyValue', name: 'network', value: attrs.network });
    if (attrs.carrier_locked) addlProps.push({ '@type': 'PropertyValue', name: 'carrierLocked', value: attrs.carrier_locked });
    if (attrs.battery_health_percent) addlProps.push({ '@type': 'PropertyValue', name: 'batteryHealth', value: attrs.battery_health_percent, unitText: '%' });
    if (addlProps.length) ld.additionalProperty = addlProps;
    return ld;
  },
};

// ─── Home & Garden | Furniture ─────────────────────────────────────
const furnitureSchema: CategorySchema = {
  schemaOrgType: 'Product',
  additionalType: 'Furniture',
  traits: ['Priceable', 'Conditional', 'LocationBound'],
  conditionOptions: ['like_new', 'good', 'fair', 'well_loved', 'needs_reupholstery'],
  attributes: [
    { key: 'furniture_type', label: 'Type', type: 'select', options: ['sofa', 'chair', 'table', 'desk', 'bed', 'dresser', 'bookshelf', 'cabinet', 'outdoor', 'other'], summary: true },
    { key: 'material', label: 'Material', type: 'select', options: ['wood', 'metal', 'fabric', 'leather', 'glass', 'plastic', 'mixed'], schemaOrg: 'material', summary: true },
    { key: 'seating_capacity', label: 'Seating Capacity', type: 'number', placeholder: '3' },
    { key: 'color', label: 'Color', type: 'text', placeholder: 'Charcoal', schemaOrg: 'color' },
    { key: 'width', label: 'Width (in)', type: 'number', placeholder: '84', schemaOrg: 'width' },
    { key: 'depth', label: 'Depth (in)', type: 'number', placeholder: '38', schemaOrg: 'depth' },
    { key: 'height', label: 'Height (in)', type: 'number', placeholder: '34', schemaOrg: 'height' },
    { key: 'pet_free_home', label: 'Pet-Free Home', type: 'boolean' },
    { key: 'smoke_free_home', label: 'Smoke-Free Home', type: 'boolean' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Product', additionalType: 'Furniture' };
    if (attrs.material) ld.material = attrs.material;
    if (attrs.color) ld.color = attrs.color;
    if (attrs.width) ld.width = { '@type': 'QuantitativeValue', value: attrs.width, unitCode: 'INH' };
    if (attrs.depth) ld.depth = { '@type': 'QuantitativeValue', value: attrs.depth, unitCode: 'INH' };
    if (attrs.height) ld.height = { '@type': 'QuantitativeValue', value: attrs.height, unitCode: 'INH' };
    return ld;
  },
};

// ─── Collectibles | Art ────────────────────────────────────────────
const artSchema: CategorySchema = {
  schemaOrgType: 'VisualArtwork',
  traits: ['Priceable', 'Conditional', 'Valueable'],
  conditionOptions: ['mint', 'excellent', 'good', 'fair', 'damaged', 'needs_restoration'],
  attributes: [
    { key: 'artist', label: 'Artist', type: 'text', placeholder: 'Artist name', schemaOrg: 'artist', summary: true },
    { key: 'title', label: 'Title', type: 'text', placeholder: 'Artwork title', schemaOrg: 'name', summary: true },
    { key: 'medium', label: 'Medium', type: 'select', options: ['oil', 'acrylic', 'watercolor', 'pastel', 'charcoal', 'ink', 'mixed_media', 'digital', 'photography', 'sculpture', 'print', 'other'], schemaOrg: 'artMedium', summary: true },
    { key: 'year_created', label: 'Year Created', type: 'number', placeholder: '2023', schemaOrg: 'dateCreated' },
    { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: '24" x 36"' },
    { key: 'edition_number', label: 'Edition', type: 'text', placeholder: '3/50', schemaOrg: 'artEdition' },
    { key: 'certificate_of_authenticity', label: 'Certificate of Authenticity', type: 'boolean' },
    { key: 'framed', label: 'Framed', type: 'boolean' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'VisualArtwork' };
    if (attrs.artist) ld.artist = { '@type': 'Person', name: attrs.artist };
    if (attrs.title) ld.name = attrs.title;
    if (attrs.medium) ld.artMedium = attrs.medium;
    if (attrs.year_created) ld.dateCreated = String(attrs.year_created);
    if (attrs.edition_number) ld.artEdition = attrs.edition_number;
    return ld;
  },
};

// ─── Other | Services (Dining) ─────────────────────────────────────
const diningServiceSchema: CategorySchema = {
  schemaOrgType: 'Offer',
  additionalType: 'FoodEstablishment',
  traits: ['Priceable', 'Consumable', 'TimeBounded', 'LocationBound'],
  conditionOptions: [],
  attributes: [
    { key: 'restaurant_name', label: 'Restaurant Name', type: 'text', placeholder: "Joe's Bistro", summary: true },
    { key: 'cuisine_type', label: 'Cuisine', type: 'text', placeholder: 'Italian', schemaOrg: 'servesCuisine', summary: true },
    { key: 'offer_type', label: 'Offer Type', type: 'select', options: ['gift_card', 'coupon', 'voucher', 'discount'], summary: true },
    { key: 'offer_value', label: 'Face Value ($)', type: 'number', placeholder: '50' },
    { key: 'min_purchase', label: 'Min. Purchase ($)', type: 'number', placeholder: '0' },
    { key: 'valid_days', label: 'Valid Days', type: 'text', placeholder: 'Mon-Fri' },
    { key: 'valid_hours', label: 'Valid Hours', type: 'text', placeholder: '11am-3pm' },
    { key: 'expires_at', label: 'Expiration Date', type: 'text', placeholder: 'YYYY-MM-DD', schemaOrg: 'validThrough' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Offer' };
    if (attrs.restaurant_name) {
      ld.offeredBy = { '@type': 'FoodEstablishment', name: attrs.restaurant_name };
      if (attrs.cuisine_type) (ld.offeredBy as Record<string, unknown>).servesCuisine = attrs.cuisine_type;
    }
    if (attrs.expires_at) ld.validThrough = attrs.expires_at;
    return ld;
  },
};

// ─── Default (any unlisted category) ───────────────────────────────
const defaultSchema: CategorySchema = {
  schemaOrgType: 'Product',
  traits: ['Priceable'],
  conditionOptions: ['new', 'like_new', 'good', 'fair', 'poor'],
  attributes: [],
  buildSchemaOrg(_attrs) {
    return { '@type': 'Product' };
  },
};

// ─── Registry ──────────────────────────────────────────────────────

/**
 * Map of "Category|Subcategory" → CategorySchema.
 * Use getCategorySchema(category, subcategory) for lookup.
 */
const CATEGORY_SCHEMAS: Record<string, CategorySchema> = {
  'Vehicles|Cars': carSchema,
  'Vehicles|Boats': boatSchema,
  'Housing|Single Family Homes': housingSchema,
  'Housing|Condos': housingSchema,
  'Housing|Townhouses': housingSchema,
  'Housing|Multi-Family': housingSchema,
  'Housing|Land': housingSchema,
  'Electronics|Phones & Tablets': phoneSchema,
  'Home & Garden|Furniture': furnitureSchema,
  'Collectibles|Art': artSchema,
  'Other|Services': diningServiceSchema,
};

/**
 * Look up the CategorySchema for a given category + subcategory.
 * Falls back to category-only match, then default.
 */
export function getCategorySchema(category?: string, subcategory?: string): CategorySchema {
  if (category && subcategory) {
    const exact = CATEGORY_SCHEMAS[`${category}|${subcategory}`];
    if (exact) return exact;
  }
  if (category) {
    // Try category-only: match first key that starts with category
    for (const key of Object.keys(CATEGORY_SCHEMAS)) {
      if (key.startsWith(category + '|')) {
        return CATEGORY_SCHEMAS[key];
      }
    }
  }
  return defaultSchema;
}

/**
 * Build a Schema.org JSON-LD object from a ref's attributes and category schema.
 */
export function buildSchemaOrgLD(
  category: string | undefined,
  subcategory: string | undefined,
  attrs: Record<string, unknown>,
  baseFields: {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    condition?: string;
    image?: string;
    sku?: string;
    createdAt?: string;
    updatedAt?: string;
    offerStatus?: string;
    sellerId?: string;
    offerLocation?: string;
  },
): Record<string, unknown> {
  const schema = getCategorySchema(category, subcategory);
  const ld = schema.buildSchemaOrg(attrs);

  // JSON-LD @context with reffo namespace
  ld['@context'] = {
    '@vocab': 'https://schema.org/',
    'reffo': 'https://reffo.ai/ns/',
  };

  // Add base Schema.org fields
  if (baseFields.name) ld.name = baseFields.name;
  if (baseFields.description) ld.description = baseFields.description;
  if (baseFields.image) ld.image = baseFields.image;
  if (baseFields.sku) ld.sku = baseFields.sku;
  if (baseFields.createdAt) ld.dateCreated = baseFields.createdAt;
  if (baseFields.updatedAt) ld.dateModified = baseFields.updatedAt;
  if (baseFields.condition) {
    ld['reffo:condition'] = baseFields.condition;
  }
  if (baseFields.price != null) {
    const offer: Record<string, unknown> = {
      '@type': 'Offer',
      price: baseFields.price,
      priceCurrency: baseFields.currency || 'USD',
    };
    if (baseFields.offerStatus) offer.availability = baseFields.offerStatus;
    if (baseFields.sellerId) offer.seller = { '@type': 'Organization', '@id': baseFields.sellerId };
    if (baseFields.offerLocation) offer.availableAtOrFrom = baseFields.offerLocation;
    ld.offers = offer;
  }

  return ld;
}

/**
 * Get the attribute keys for a given category + subcategory.
 * Used by the product-lookup AI prompt to constrain which fields Claude fills.
 */
// Keys that are unique per device/unit — AI should never fill these
const DEVICE_UNIQUE_KEYS = new Set(['vin', 'hin', 'imei', 'parcel_id']);

export function getAttributeKeys(category?: string, subcategory?: string): string[] {
  const schema = getCategorySchema(category, subcategory);
  return schema.attributes
    .map((a) => a.key)
    .filter((k) => !DEVICE_UNIQUE_KEYS.has(k));
}

export { CATEGORY_SCHEMAS, defaultSchema };
