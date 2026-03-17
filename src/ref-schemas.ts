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

// ─── Vehicles | Motorcycles ────────────────────────────────────────
const motorcycleSchema: CategorySchema = {
  schemaOrgType: 'MotorizedBicycle',
  traits: ['Priceable', 'Conditional', 'Valueable', 'Serialized', 'LocationBound'],
  conditionOptions: ['excellent', 'good', 'fair', 'poor', 'parts_only'],
  attributes: [
    { key: 'year', label: 'Year', type: 'number', placeholder: '2021', schemaOrg: 'vehicleModelDate', summary: true },
    { key: 'make', label: 'Make', type: 'text', placeholder: 'Harley-Davidson', schemaOrg: 'brand', summary: true },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'Street Glide', schemaOrg: 'model', summary: true },
    { key: 'mileage', label: 'Mileage', type: 'number', placeholder: '12000', schemaOrg: 'mileageFromOdometer', unit: 'mi', summary: true },
    { key: 'engine_cc', label: 'Engine (cc)', type: 'number', placeholder: '1868' },
    { key: 'type', label: 'Type', type: 'select', options: ['cruiser', 'sport', 'touring', 'dual_sport', 'dirt', 'scooter', 'standard', 'other'] },
    { key: 'title_status', label: 'Title Status', type: 'select', options: ['clean', 'salvage', 'rebuilt', 'lemon'], summary: true },
    { key: 'vin', label: 'VIN', type: 'text', placeholder: '1HD1KTP19KB123456', schemaOrg: 'vehicleIdentificationNumber' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'MotorizedBicycle' };
    if (attrs.year) ld.vehicleModelDate = String(attrs.year);
    if (attrs.make) ld.brand = { '@type': 'Brand', name: attrs.make };
    if (attrs.model) ld.model = attrs.model;
    if (attrs.mileage) ld.mileageFromOdometer = { '@type': 'QuantitativeValue', value: attrs.mileage, unitCode: 'SMI' };
    if (attrs.vin) ld.vehicleIdentificationNumber = attrs.vin;
    return ld;
  },
};

// ─── Vehicles | Bicycles ──────────────────────────────────────────
const bicycleSchema: CategorySchema = {
  schemaOrgType: 'Product',
  additionalType: 'Bicycle',
  traits: ['Priceable', 'Conditional'],
  conditionOptions: ['new', 'like_new', 'excellent', 'good', 'fair', 'poor'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Trek', schemaOrg: 'brand', summary: true },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'Domane SL 5', schemaOrg: 'model', summary: true },
    { key: 'type', label: 'Type', type: 'select', options: ['road', 'mountain', 'hybrid', 'gravel', 'bmx', 'cruiser', 'electric', 'folding', 'other'], summary: true },
    { key: 'frame_size', label: 'Frame Size', type: 'text', placeholder: '56cm' },
    { key: 'wheel_size', label: 'Wheel Size', type: 'text', placeholder: '700c' },
    { key: 'speeds', label: 'Speeds', type: 'number', placeholder: '22' },
    { key: 'frame_material', label: 'Frame Material', type: 'select', options: ['carbon', 'aluminum', 'steel', 'titanium'] },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Product', additionalType: 'Bicycle' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.model) ld.model = attrs.model;
    return ld;
  },
};

// ─── Vehicles | Parts & Accessories ────────────────────────────────
const vehiclePartsSchema: CategorySchema = {
  schemaOrgType: 'Product',
  additionalType: 'VehiclePart',
  traits: ['Priceable', 'Conditional'],
  conditionOptions: ['new', 'like_new', 'good', 'fair', 'for_parts'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Bosch', schemaOrg: 'brand', summary: true },
    { key: 'part_number', label: 'Part Number', type: 'text', placeholder: 'OEM part #', summary: true },
    { key: 'fits_make', label: 'Fits Make', type: 'text', placeholder: 'Toyota' },
    { key: 'fits_model', label: 'Fits Model', type: 'text', placeholder: 'Camry' },
    { key: 'fits_years', label: 'Fits Years', type: 'text', placeholder: '2018-2023' },
    { key: 'oem_aftermarket', label: 'OEM/Aftermarket', type: 'select', options: ['oem', 'aftermarket', 'remanufactured'], summary: true },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Product', additionalType: 'VehiclePart' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.part_number) ld.mpn = attrs.part_number;
    return ld;
  },
};

// ─── Real Estate ──────────────────────────────────────────────────
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

// ─── Electronics | Computers & Laptops ─────────────────────────────
const computerSchema: CategorySchema = {
  schemaOrgType: 'IndividualProduct',
  additionalType: 'Computer',
  traits: ['Priceable', 'Conditional', 'Valueable', 'Serialized'],
  conditionOptions: ['new_sealed', 'like_new', 'excellent', 'good', 'fair', 'poor', 'for_parts'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Apple', schemaOrg: 'brand', summary: true },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'MacBook Pro 14"', schemaOrg: 'model', summary: true },
    { key: 'processor', label: 'Processor', type: 'text', placeholder: 'M3 Pro', summary: true },
    { key: 'ram_gb', label: 'RAM (GB)', type: 'number', placeholder: '18' },
    { key: 'storage_gb', label: 'Storage (GB)', type: 'number', placeholder: '512', summary: true },
    { key: 'storage_type', label: 'Storage Type', type: 'select', options: ['ssd', 'hdd', 'hybrid', 'emmc'] },
    { key: 'screen_size_in', label: 'Screen Size (in)', type: 'number', placeholder: '14' },
    { key: 'form_factor', label: 'Form Factor', type: 'select', options: ['laptop', 'desktop', 'all_in_one', 'mini_pc', 'tablet_2in1'] },
    { key: 'os', label: 'OS', type: 'select', options: ['macOS', 'Windows', 'ChromeOS', 'Linux', 'other'] },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'IndividualProduct', additionalType: 'Computer' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.model) ld.model = attrs.model;
    const addlProps: Record<string, unknown>[] = [];
    if (attrs.processor) addlProps.push({ '@type': 'PropertyValue', name: 'processor', value: attrs.processor });
    if (attrs.ram_gb) addlProps.push({ '@type': 'PropertyValue', name: 'ramGB', value: attrs.ram_gb });
    if (attrs.storage_gb) addlProps.push({ '@type': 'PropertyValue', name: 'storageGB', value: attrs.storage_gb });
    if (addlProps.length) ld.additionalProperty = addlProps;
    return ld;
  },
};

// ─── Electronics | General (Audio, Cameras, TV, Gaming, Components, Accessories)
const electronicsGeneralSchema: CategorySchema = {
  schemaOrgType: 'IndividualProduct',
  traits: ['Priceable', 'Conditional', 'Valueable'],
  conditionOptions: ['new_sealed', 'like_new', 'excellent', 'good', 'fair', 'poor', 'for_parts'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Sony', schemaOrg: 'brand', summary: true },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'WH-1000XM5', schemaOrg: 'model', summary: true },
    { key: 'connectivity', label: 'Connectivity', type: 'select', options: ['wired', 'wireless', 'bluetooth', 'wifi', 'usb', 'hdmi', 'other'] },
    { key: 'color', label: 'Color', type: 'text', placeholder: 'Black', schemaOrg: 'color' },
    { key: 'original_box', label: 'Original Box', type: 'boolean' },
    { key: 'compatible_with', label: 'Compatible With', type: 'text', placeholder: 'PS5, Xbox, PC' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'IndividualProduct' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.model) ld.model = attrs.model;
    if (attrs.color) ld.color = attrs.color;
    return ld;
  },
};

// ─── Music | All subcategories ─────────────────────────────────────
const musicInstrumentSchema: CategorySchema = {
  schemaOrgType: 'IndividualProduct',
  additionalType: 'MusicalInstrument',
  traits: ['Priceable', 'Conditional', 'Valueable'],
  conditionOptions: ['mint', 'excellent', 'good', 'fair', 'poor', 'needs_repair'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Fender', schemaOrg: 'brand', summary: true },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'Stratocaster', schemaOrg: 'model', summary: true },
    { key: 'year', label: 'Year', type: 'number', placeholder: '2019' },
    { key: 'color_finish', label: 'Color/Finish', type: 'text', placeholder: 'Sunburst', schemaOrg: 'color' },
    { key: 'type', label: 'Type', type: 'text', placeholder: 'Electric guitar', summary: true },
    { key: 'includes', label: 'Includes', type: 'text', placeholder: 'Case, strap, cable' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'IndividualProduct', additionalType: 'MusicalInstrument' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.model) ld.model = attrs.model;
    if (attrs.color_finish) ld.color = attrs.color_finish;
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

// ─── Home & Garden | General (Kitchen, Lighting, Decor, Storage) ───
const homeGeneralSchema: CategorySchema = {
  schemaOrgType: 'Product',
  traits: ['Priceable', 'Conditional'],
  conditionOptions: ['new', 'like_new', 'good', 'fair', 'poor'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'KitchenAid', schemaOrg: 'brand', summary: true },
    { key: 'material', label: 'Material', type: 'text', placeholder: 'Stainless steel', schemaOrg: 'material' },
    { key: 'color', label: 'Color', type: 'text', placeholder: 'Silver', schemaOrg: 'color' },
    { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: '12" x 8" x 6"' },
    { key: 'quantity', label: 'Quantity/Set Size', type: 'number', placeholder: '1' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Product' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.material) ld.material = attrs.material;
    if (attrs.color) ld.color = attrs.color;
    return ld;
  },
};

// ─── Home & Garden | Tools & Hardware ──────────────────────────────
const toolSchema: CategorySchema = {
  schemaOrgType: 'Product',
  additionalType: 'Tool',
  traits: ['Priceable', 'Conditional'],
  conditionOptions: ['new', 'like_new', 'good', 'fair', 'poor'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'DeWalt', schemaOrg: 'brand', summary: true },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'DCD771C2', schemaOrg: 'model', summary: true },
    { key: 'tool_type', label: 'Tool Type', type: 'text', placeholder: 'Drill/Driver', summary: true },
    { key: 'power_source', label: 'Power Source', type: 'select', options: ['cordless', 'corded', 'gas', 'pneumatic', 'manual'] },
    { key: 'battery_included', label: 'Battery Included', type: 'boolean' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Product', additionalType: 'Tool' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.model) ld.model = attrs.model;
    return ld;
  },
};

// ─── Home & Garden | Appliances ────────────────────────────────────
const applianceSchema: CategorySchema = {
  schemaOrgType: 'Product',
  additionalType: 'HomeAppliance',
  traits: ['Priceable', 'Conditional', 'LocationBound'],
  conditionOptions: ['new', 'like_new', 'good', 'fair', 'needs_repair'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Samsung', schemaOrg: 'brand', summary: true },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'RF28R7351SR', schemaOrg: 'model', summary: true },
    { key: 'appliance_type', label: 'Appliance Type', type: 'text', placeholder: 'Refrigerator', summary: true },
    { key: 'color', label: 'Color', type: 'text', placeholder: 'Stainless Steel', schemaOrg: 'color' },
    { key: 'energy_rating', label: 'Energy Rating', type: 'select', options: ['energy_star', 'standard', 'unknown'] },
    { key: 'working', label: 'Working', type: 'boolean' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Product', additionalType: 'HomeAppliance' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.model) ld.model = attrs.model;
    if (attrs.color) ld.color = attrs.color;
    return ld;
  },
};

// ─── Home & Garden | Outdoor & Garden ──────────────────────────────
const outdoorGardenSchema: CategorySchema = {
  schemaOrgType: 'Product',
  traits: ['Priceable', 'Conditional'],
  conditionOptions: ['new', 'like_new', 'good', 'fair', 'weathered'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Weber', schemaOrg: 'brand', summary: true },
    { key: 'material', label: 'Material', type: 'text', placeholder: 'Teak', schemaOrg: 'material', summary: true },
    { key: 'indoor_outdoor', label: 'Indoor/Outdoor', type: 'select', options: ['indoor', 'outdoor', 'both'] },
    { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: '48" x 24" x 36"' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Product' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.material) ld.material = attrs.material;
    return ld;
  },
};

// ─── Clothing & Accessories | General ──────────────────────────────
const clothingSchema: CategorySchema = {
  schemaOrgType: 'IndividualProduct',
  additionalType: 'ClothingItem',
  traits: ['Priceable', 'Conditional'],
  conditionOptions: ['new_with_tags', 'new_without_tags', 'like_new', 'good', 'fair', 'worn'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Nike', schemaOrg: 'brand', summary: true },
    { key: 'size', label: 'Size', type: 'text', placeholder: 'M', summary: true },
    { key: 'color', label: 'Color', type: 'text', placeholder: 'Black', schemaOrg: 'color', summary: true },
    { key: 'material', label: 'Material', type: 'text', placeholder: 'Cotton', schemaOrg: 'material' },
    { key: 'style', label: 'Style', type: 'text', placeholder: 'Casual' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['mens', 'womens', 'unisex', 'boys', 'girls'] },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'IndividualProduct', additionalType: 'ClothingItem' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.color) ld.color = attrs.color;
    if (attrs.material) ld.material = attrs.material;
    return ld;
  },
};

// ─── Clothing & Accessories | Shoes ────────────────────────────────
const shoeSchema: CategorySchema = {
  schemaOrgType: 'IndividualProduct',
  additionalType: 'Shoe',
  traits: ['Priceable', 'Conditional'],
  conditionOptions: ['new_with_tags', 'new_without_tags', 'like_new', 'good', 'fair', 'worn'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Nike', schemaOrg: 'brand', summary: true },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'Air Max 90', schemaOrg: 'model', summary: true },
    { key: 'size', label: 'Size', type: 'text', placeholder: '10', summary: true },
    { key: 'color', label: 'Color', type: 'text', placeholder: 'White/Black', schemaOrg: 'color' },
    { key: 'style', label: 'Style', type: 'select', options: ['athletic', 'casual', 'dress', 'boots', 'sandals', 'heels', 'other'] },
    { key: 'gender', label: 'Gender', type: 'select', options: ['mens', 'womens', 'unisex', 'boys', 'girls'] },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'IndividualProduct', additionalType: 'Shoe' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.model) ld.model = attrs.model;
    if (attrs.color) ld.color = attrs.color;
    return ld;
  },
};

// ─── Clothing & Accessories | Bags & Wallets ───────────────────────
const bagSchema: CategorySchema = {
  schemaOrgType: 'IndividualProduct',
  additionalType: 'Bag',
  traits: ['Priceable', 'Conditional', 'Valueable'],
  conditionOptions: ['new_with_tags', 'new_without_tags', 'like_new', 'good', 'fair', 'worn'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Coach', schemaOrg: 'brand', summary: true },
    { key: 'style', label: 'Style', type: 'select', options: ['handbag', 'backpack', 'crossbody', 'tote', 'wallet', 'clutch', 'briefcase', 'other'], summary: true },
    { key: 'material', label: 'Material', type: 'select', options: ['leather', 'canvas', 'nylon', 'synthetic', 'fabric', 'other'], schemaOrg: 'material' },
    { key: 'color', label: 'Color', type: 'text', placeholder: 'Brown', schemaOrg: 'color' },
    { key: 'authenticity_verified', label: 'Authenticity Verified', type: 'boolean' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'IndividualProduct', additionalType: 'Bag' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.color) ld.color = attrs.color;
    if (attrs.material) ld.material = attrs.material;
    return ld;
  },
};

// ─── Jewelry & Watches | Jewelry ───────────────────────────────────
const jewelrySchema: CategorySchema = {
  schemaOrgType: 'IndividualProduct',
  additionalType: 'Jewelry',
  traits: ['Priceable', 'Conditional', 'Valueable'],
  conditionOptions: ['new', 'like_new', 'excellent', 'good', 'fair', 'needs_repair'],
  attributes: [
    { key: 'brand_designer', label: 'Brand/Designer', type: 'text', placeholder: 'Tiffany & Co.', schemaOrg: 'brand', summary: true },
    { key: 'type', label: 'Type', type: 'select', options: ['ring', 'necklace', 'bracelet', 'earrings', 'brooch', 'pendant', 'other'], summary: true },
    { key: 'material', label: 'Material', type: 'select', options: ['gold_24k', 'gold_18k', 'gold_14k', 'gold_10k', 'silver_sterling', 'platinum', 'rose_gold', 'stainless_steel', 'fashion'], schemaOrg: 'material', summary: true },
    { key: 'gemstone', label: 'Gemstone', type: 'text', placeholder: 'Diamond, Ruby, etc.' },
    { key: 'certificate', label: 'Certificate/Appraisal', type: 'boolean' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'IndividualProduct', additionalType: 'Jewelry' };
    if (attrs.brand_designer) ld.brand = { '@type': 'Brand', name: attrs.brand_designer };
    if (attrs.material) ld.material = attrs.material;
    return ld;
  },
};

// ─── Jewelry & Watches | Watches ───────────────────────────────────
const watchSchema: CategorySchema = {
  schemaOrgType: 'IndividualProduct',
  additionalType: 'Watch',
  traits: ['Priceable', 'Conditional', 'Valueable', 'Serialized'],
  conditionOptions: ['new_with_tags', 'like_new', 'excellent', 'good', 'fair', 'needs_service'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Rolex', schemaOrg: 'brand', summary: true },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'Submariner', schemaOrg: 'model', summary: true },
    { key: 'movement', label: 'Movement', type: 'select', options: ['automatic', 'quartz', 'manual_wind', 'solar', 'smart'], summary: true },
    { key: 'case_size_mm', label: 'Case Size (mm)', type: 'number', placeholder: '41' },
    { key: 'case_material', label: 'Case Material', type: 'select', options: ['stainless_steel', 'gold', 'titanium', 'ceramic', 'plastic', 'carbon'] },
    { key: 'band_material', label: 'Band Material', type: 'select', options: ['metal', 'leather', 'rubber', 'nylon', 'silicone'] },
    { key: 'water_resistant', label: 'Water Resistant', type: 'boolean' },
    { key: 'box_papers', label: 'Box & Papers', type: 'boolean' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'IndividualProduct', additionalType: 'Watch' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.model) ld.model = attrs.model;
    return ld;
  },
};

// ─── Sports | All subcategories ────────────────────────────────────
const sportsSchema: CategorySchema = {
  schemaOrgType: 'Product',
  additionalType: 'SportsEquipment',
  traits: ['Priceable', 'Conditional'],
  conditionOptions: ['new', 'like_new', 'good', 'fair', 'well_used'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Wilson', schemaOrg: 'brand', summary: true },
    { key: 'sport', label: 'Sport', type: 'text', placeholder: 'Tennis', summary: true },
    { key: 'size', label: 'Size', type: 'text', placeholder: 'Standard' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['mens', 'womens', 'unisex', 'youth'] },
    { key: 'color', label: 'Color', type: 'text', placeholder: 'Blue', schemaOrg: 'color' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Product', additionalType: 'SportsEquipment' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.color) ld.color = attrs.color;
    return ld;
  },
};

// ─── Books & Media | Books ─────────────────────────────────────────
const bookSchema: CategorySchema = {
  schemaOrgType: 'Book',
  traits: ['Priceable', 'Conditional'],
  conditionOptions: ['new', 'like_new', 'very_good', 'good', 'acceptable', 'poor'],
  attributes: [
    { key: 'author', label: 'Author', type: 'text', placeholder: 'Author name', schemaOrg: 'author', summary: true },
    { key: 'title', label: 'Title', type: 'text', placeholder: 'Book title', schemaOrg: 'name', summary: true },
    { key: 'isbn', label: 'ISBN', type: 'text', placeholder: '978-0-123456-78-9', schemaOrg: 'isbn' },
    { key: 'format', label: 'Format', type: 'select', options: ['hardcover', 'paperback', 'board_book', 'spiral'], schemaOrg: 'bookFormat', summary: true },
    { key: 'edition', label: 'Edition', type: 'text', placeholder: '1st Edition', schemaOrg: 'bookEdition' },
    { key: 'language', label: 'Language', type: 'text', placeholder: 'English', schemaOrg: 'inLanguage' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Book' };
    if (attrs.author) ld.author = { '@type': 'Person', name: attrs.author };
    if (attrs.title) ld.name = attrs.title;
    if (attrs.isbn) ld.isbn = attrs.isbn;
    if (attrs.format) ld.bookFormat = attrs.format;
    if (attrs.edition) ld.bookEdition = attrs.edition;
    if (attrs.language) ld.inLanguage = attrs.language;
    return ld;
  },
};

// ─── Books & Media | Vinyl, CDs, Audiobooks ────────────────────────
const mediaSchema: CategorySchema = {
  schemaOrgType: 'MusicRecording',
  traits: ['Priceable', 'Conditional'],
  conditionOptions: ['sealed', 'mint', 'near_mint', 'very_good_plus', 'very_good', 'good', 'fair'],
  attributes: [
    { key: 'artist_author', label: 'Artist/Author', type: 'text', placeholder: 'Artist name', schemaOrg: 'byArtist', summary: true },
    { key: 'title', label: 'Title', type: 'text', placeholder: 'Album/title', schemaOrg: 'name', summary: true },
    { key: 'format', label: 'Format', type: 'select', options: ['vinyl_lp', 'vinyl_45', 'cd', 'cassette', 'dvd', 'blu_ray', 'audiobook'], summary: true },
    { key: 'genre', label: 'Genre', type: 'text', placeholder: 'Rock' },
    { key: 'year', label: 'Year', type: 'number', placeholder: '1975' },
    { key: 'special_edition', label: 'Special Edition', type: 'boolean' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'MusicRecording' };
    if (attrs.artist_author) ld.byArtist = { '@type': 'Person', name: attrs.artist_author };
    if (attrs.title) ld.name = attrs.title;
    return ld;
  },
};

// ─── Books & Media | Video Games ───────────────────────────────────
const videoGameSchema: CategorySchema = {
  schemaOrgType: 'VideoGame',
  traits: ['Priceable', 'Conditional'],
  conditionOptions: ['new_sealed', 'like_new', 'good', 'fair', 'disc_only'],
  attributes: [
    { key: 'title', label: 'Title', type: 'text', placeholder: 'Game title', schemaOrg: 'name', summary: true },
    { key: 'platform', label: 'Platform', type: 'select', options: ['ps5', 'ps4', 'xbox_series', 'xbox_one', 'switch', 'pc', 'retro', 'other'], schemaOrg: 'gamePlatform', summary: true },
    { key: 'genre', label: 'Genre', type: 'text', placeholder: 'Action RPG', schemaOrg: 'genre' },
    { key: 'complete_in_box', label: 'Complete in Box', type: 'boolean', summary: true },
    { key: 'region', label: 'Region', type: 'select', options: ['ntsc', 'pal', 'ntsc_j', 'region_free'] },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'VideoGame' };
    if (attrs.title) ld.name = attrs.title;
    if (attrs.platform) ld.gamePlatform = attrs.platform;
    if (attrs.genre) ld.genre = attrs.genre;
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

// ─── Collectibles | General (Antiques, Coins, Cards, Memorabilia, Stamps, Vintage Electronics)
const collectibleSchema: CategorySchema = {
  schemaOrgType: 'Product',
  additionalType: 'CollectibleItem',
  traits: ['Priceable', 'Conditional', 'Valueable'],
  conditionOptions: ['mint', 'near_mint', 'excellent', 'very_good', 'good', 'fair', 'poor'],
  attributes: [
    { key: 'era_year', label: 'Era/Year', type: 'text', placeholder: '1960s', summary: true },
    { key: 'brand_maker', label: 'Brand/Maker', type: 'text', placeholder: 'Manufacturer', schemaOrg: 'brand', summary: true },
    { key: 'type', label: 'Type', type: 'text', placeholder: 'Coin, card, figure, etc.', summary: true },
    { key: 'authenticity', label: 'Authenticity', type: 'select', options: ['authenticated', 'believed_authentic', 'reproduction', 'unknown'] },
    { key: 'graded', label: 'Professionally Graded', type: 'boolean' },
    { key: 'grade', label: 'Grade', type: 'text', placeholder: 'PSA 9, NGC MS65, etc.' },
    { key: 'original_packaging', label: 'Original Packaging', type: 'boolean' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Product', additionalType: 'CollectibleItem' };
    if (attrs.brand_maker) ld.brand = { '@type': 'Brand', name: attrs.brand_maker };
    return ld;
  },
};

// ─── Health & Beauty ───────────────────────────────────────────────
const healthBeautySchema: CategorySchema = {
  schemaOrgType: 'Product',
  additionalType: 'HealthAndBeautyProduct',
  traits: ['Priceable'],
  conditionOptions: ['new_sealed', 'new_opened', 'lightly_used', 'partially_used'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Estee Lauder', schemaOrg: 'brand', summary: true },
    { key: 'product_name', label: 'Product Name', type: 'text', placeholder: 'Advanced Night Repair', summary: true },
    { key: 'size_volume', label: 'Size/Volume', type: 'text', placeholder: '1.7 oz', summary: true },
    { key: 'shade_scent', label: 'Shade/Scent', type: 'text', placeholder: 'Rose' },
    { key: 'expiration', label: 'Expiration', type: 'text', placeholder: '2025-12' },
    { key: 'sealed', label: 'Factory Sealed', type: 'boolean' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Product', additionalType: 'HealthAndBeautyProduct' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.product_name) ld.name = attrs.product_name;
    return ld;
  },
};

// ─── Toys & Hobbies ────────────────────────────────────────────────
const toysSchema: CategorySchema = {
  schemaOrgType: 'Product',
  additionalType: 'Toy',
  traits: ['Priceable', 'Conditional'],
  conditionOptions: ['new_sealed', 'new_opened', 'like_new', 'good', 'fair', 'played_with'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'LEGO', schemaOrg: 'brand', summary: true },
    { key: 'product_name', label: 'Product Name', type: 'text', placeholder: 'Star Wars Millennium Falcon', summary: true },
    { key: 'age_range', label: 'Age Range', type: 'text', placeholder: '8+', summary: true },
    { key: 'complete', label: 'Complete Set', type: 'boolean' },
    { key: 'original_box', label: 'Original Box', type: 'boolean' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Product', additionalType: 'Toy' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.product_name) ld.name = attrs.product_name;
    return ld;
  },
};

// ─── Baby & Kids ───────────────────────────────────────────────────
const babySchema: CategorySchema = {
  schemaOrgType: 'Product',
  additionalType: 'BabyProduct',
  traits: ['Priceable', 'Conditional'],
  conditionOptions: ['new_with_tags', 'new_without_tags', 'like_new', 'good', 'fair'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Graco', schemaOrg: 'brand', summary: true },
    { key: 'age_range', label: 'Age Range', type: 'text', placeholder: '0-12 months', summary: true },
    { key: 'gender', label: 'Gender', type: 'select', options: ['boy', 'girl', 'neutral'] },
    { key: 'color', label: 'Color', type: 'text', placeholder: 'Gray', schemaOrg: 'color' },
    { key: 'safety_recall_checked', label: 'Safety Recall Checked', type: 'boolean' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Product', additionalType: 'BabyProduct' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.color) ld.color = attrs.color;
    return ld;
  },
};

// ─── Pet Supplies ──────────────────────────────────────────────────
const petSchema: CategorySchema = {
  schemaOrgType: 'Product',
  additionalType: 'PetSupply',
  traits: ['Priceable'],
  conditionOptions: ['new', 'like_new', 'good', 'fair'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'PetSafe', schemaOrg: 'brand', summary: true },
    { key: 'pet_type', label: 'Pet Type', type: 'select', options: ['dog', 'cat', 'fish', 'bird', 'small_animal', 'reptile', 'other'], summary: true },
    { key: 'item_type', label: 'Item Type', type: 'text', placeholder: 'Crate, bed, tank, etc.', summary: true },
    { key: 'size', label: 'Size', type: 'select', options: ['xs', 'small', 'medium', 'large', 'xl', 'one_size'] },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Product', additionalType: 'PetSupply' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    return ld;
  },
};

// ─── Other | Services ──────────────────────────────────────────────
const serviceSchema: CategorySchema = {
  schemaOrgType: 'Offer',
  traits: ['Priceable', 'TimeBounded', 'LocationBound'],
  conditionOptions: [],
  attributes: [
    { key: 'service_type', label: 'Service Type', type: 'select', options: ['gift_card', 'coupon', 'voucher', 'discount', 'subscription', 'membership', 'lesson', 'other'], summary: true },
    { key: 'provider', label: 'Provider', type: 'text', placeholder: 'Company or person name', summary: true },
    { key: 'face_value', label: 'Face Value ($)', type: 'number', placeholder: '50', summary: true },
    { key: 'expires_at', label: 'Expiration Date', type: 'text', placeholder: 'YYYY-MM-DD', schemaOrg: 'validThrough' },
    { key: 'restrictions', label: 'Restrictions', type: 'text', placeholder: 'Any usage restrictions' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Offer' };
    if (attrs.provider) ld.offeredBy = { '@type': 'Organization', name: attrs.provider };
    if (attrs.expires_at) ld.validThrough = attrs.expires_at;
    return ld;
  },
};

// ─── Default (any unlisted category) ───────────────────────────────
const defaultGeneralSchema: CategorySchema = {
  schemaOrgType: 'Product',
  traits: ['Priceable'],
  conditionOptions: ['new', 'like_new', 'good', 'fair', 'poor'],
  attributes: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Brand name', schemaOrg: 'brand', summary: true },
    { key: 'color', label: 'Color', type: 'text', placeholder: 'Color', schemaOrg: 'color' },
    { key: 'material', label: 'Material', type: 'text', placeholder: 'Material', schemaOrg: 'material' },
    { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'L x W x H' },
  ],
  buildSchemaOrg(attrs) {
    const ld: Record<string, unknown> = { '@type': 'Product' };
    if (attrs.brand) ld.brand = { '@type': 'Brand', name: attrs.brand };
    if (attrs.color) ld.color = attrs.color;
    if (attrs.material) ld.material = attrs.material;
    return ld;
  },
};

// Keep backward-compatible alias
const defaultSchema = defaultGeneralSchema;

// ─── Registry ──────────────────────────────────────────────────────

/**
 * Map of "Category|Subcategory" → CategorySchema.
 * Use getCategorySchema(category, subcategory) for lookup.
 */
const CATEGORY_SCHEMAS: Record<string, CategorySchema> = {
  // Electronics
  'Electronics|Phones & Tablets': phoneSchema,
  'Electronics|Computers & Laptops': computerSchema,
  'Electronics|Audio & Headphones': electronicsGeneralSchema,
  'Electronics|Cameras & Photography': electronicsGeneralSchema,
  'Electronics|TV & Video': electronicsGeneralSchema,
  'Electronics|Gaming': electronicsGeneralSchema,
  'Electronics|Components & Parts': electronicsGeneralSchema,
  'Electronics|Accessories': electronicsGeneralSchema,

  // Music
  'Music|Guitars': musicInstrumentSchema,
  'Music|Bass': musicInstrumentSchema,
  'Music|Drums & Percussion': musicInstrumentSchema,
  'Music|Keyboards & Pianos': musicInstrumentSchema,
  'Music|Amplifiers': musicInstrumentSchema,
  'Music|Effects & Pedals': musicInstrumentSchema,
  'Music|Pro Audio': musicInstrumentSchema,
  'Music|Accessories': musicInstrumentSchema,

  // Home & Garden
  'Home & Garden|Furniture': furnitureSchema,
  'Home & Garden|Kitchen & Dining': homeGeneralSchema,
  'Home & Garden|Tools & Hardware': toolSchema,
  'Home & Garden|Appliances': applianceSchema,
  'Home & Garden|Outdoor & Garden': outdoorGardenSchema,
  'Home & Garden|Lighting': homeGeneralSchema,
  'Home & Garden|Decor': homeGeneralSchema,
  'Home & Garden|Storage & Organization': homeGeneralSchema,

  // Clothing & Accessories
  'Clothing & Accessories|Mens': clothingSchema,
  'Clothing & Accessories|Womens': clothingSchema,
  'Clothing & Accessories|Kids': clothingSchema,
  'Clothing & Accessories|Shoes': shoeSchema,
  'Clothing & Accessories|Bags & Wallets': bagSchema,
  'Clothing & Accessories|Activewear': clothingSchema,
  'Clothing & Accessories|Vintage': clothingSchema,

  // Jewelry & Watches
  'Jewelry & Watches|Fine Jewelry': jewelrySchema,
  'Jewelry & Watches|Fashion Jewelry': jewelrySchema,
  'Jewelry & Watches|Watches': watchSchema,
  'Jewelry & Watches|Loose Stones & Beads': jewelrySchema,

  // Sports
  'Sports|Cycling': sportsSchema,
  'Sports|Fitness & Gym': sportsSchema,
  'Sports|Water Sports': sportsSchema,
  'Sports|Winter Sports': sportsSchema,
  'Sports|Team Sports': sportsSchema,
  'Sports|Outdoor & Camping': sportsSchema,
  'Sports|Running': sportsSchema,
  'Sports|Racquet Sports': sportsSchema,

  // Books & Media
  'Books & Media|Books': bookSchema,
  'Books & Media|Vinyl & Records': mediaSchema,
  'Books & Media|CDs & DVDs': mediaSchema,
  'Books & Media|Video Games': videoGameSchema,
  'Books & Media|Magazines': bookSchema,
  'Books & Media|Textbooks': bookSchema,
  'Books & Media|Comics & Graphic Novels': bookSchema,
  'Books & Media|Audiobooks': mediaSchema,

  // Vehicles
  'Vehicles|Cars': carSchema,
  'Vehicles|Motorcycles': motorcycleSchema,
  'Vehicles|Bicycles': bicycleSchema,
  'Vehicles|Trucks & Vans': carSchema,
  'Vehicles|Boats': boatSchema,
  'Vehicles|Parts & Accessories': vehiclePartsSchema,
  'Vehicles|Trailers': vehiclePartsSchema,
  'Vehicles|Electric Vehicles': carSchema,

  // Real Estate
  'Real Estate|Apartment': housingSchema,
  'Real Estate|Condo': housingSchema,
  'Real Estate|Townhome': housingSchema,
  'Real Estate|Manufactured': housingSchema,
  'Real Estate|Single Family': housingSchema,
  'Real Estate|Multi-Family': housingSchema,

  // Collectibles
  'Collectibles|Antiques': collectibleSchema,
  'Collectibles|Art': artSchema,
  'Collectibles|Coins & Currency': collectibleSchema,
  'Collectibles|Trading Cards': collectibleSchema,
  'Collectibles|Memorabilia': collectibleSchema,
  'Collectibles|Stamps': collectibleSchema,
  'Collectibles|Vintage Electronics': collectibleSchema,

  // Health & Beauty
  'Health & Beauty|Skincare': healthBeautySchema,
  'Health & Beauty|Makeup': healthBeautySchema,
  'Health & Beauty|Hair Care': healthBeautySchema,
  'Health & Beauty|Fragrances': healthBeautySchema,
  'Health & Beauty|Wellness & Supplements': healthBeautySchema,

  // Toys & Hobbies
  'Toys & Hobbies|Action Figures & Dolls': toysSchema,
  'Toys & Hobbies|Building Sets': toysSchema,
  'Toys & Hobbies|Board Games & Puzzles': toysSchema,
  'Toys & Hobbies|RC & Models': toysSchema,
  'Toys & Hobbies|Craft Supplies': toysSchema,

  // Baby & Kids
  'Baby & Kids|Strollers & Car Seats': babySchema,
  'Baby & Kids|Clothing': babySchema,
  'Baby & Kids|Toys': babySchema,
  'Baby & Kids|Furniture & Gear': babySchema,
  'Baby & Kids|Feeding & Nursing': babySchema,

  // Pet Supplies
  'Pet Supplies|Dogs': petSchema,
  'Pet Supplies|Cats': petSchema,
  'Pet Supplies|Fish & Aquariums': petSchema,
  'Pet Supplies|Small Animals & Birds': petSchema,

  // Other
  'Other|General': defaultGeneralSchema,
  'Other|Services': serviceSchema,
  'Other|Free Stuff': defaultGeneralSchema,
  'Other|Wanted': defaultGeneralSchema,
};

/**
 * Look up the CategorySchema for a given category + subcategory.
 * Returns defaultSchema when no exact match found.
 */
export function getCategorySchema(category?: string, subcategory?: string): CategorySchema {
  if (category && subcategory) {
    const exact = CATEGORY_SCHEMAS[`${category}|${subcategory}`];
    if (exact) return exact;
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
