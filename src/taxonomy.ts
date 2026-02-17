export const TAXONOMY: Record<string, string[]> = {
  'Electronics': [
    'Phones & Tablets',
    'Computers & Laptops',
    'Audio & Headphones',
    'Cameras & Photography',
    'TV & Video',
    'Gaming',
    'Components & Parts',
    'Accessories',
  ],
  'Music': [
    'Guitars',
    'Bass',
    'Drums & Percussion',
    'Keyboards & Pianos',
    'Amplifiers',
    'Effects & Pedals',
    'Pro Audio',
    'Accessories',
  ],
  'Home & Garden': [
    'Furniture',
    'Kitchen & Dining',
    'Tools & Hardware',
    'Appliances',
    'Outdoor & Garden',
    'Lighting',
    'Decor',
    'Storage & Organization',
  ],
  'Clothing': [
    'Mens',
    'Womens',
    'Kids',
    'Shoes',
    'Bags & Wallets',
    'Jewelry & Watches',
    'Activewear',
    'Vintage',
  ],
  'Sports': [
    'Cycling',
    'Fitness & Gym',
    'Water Sports',
    'Winter Sports',
    'Team Sports',
    'Outdoor & Camping',
    'Running',
    'Racquet Sports',
  ],
  'Books & Media': [
    'Books',
    'Vinyl & Records',
    'CDs & DVDs',
    'Video Games',
    'Magazines',
    'Textbooks',
    'Comics & Graphic Novels',
    'Audiobooks',
  ],
  'Vehicles': [
    'Cars',
    'Motorcycles',
    'Bicycles',
    'Trucks & Vans',
    'Boats',
    'Parts & Accessories',
    'Trailers',
    'Electric Vehicles',
  ],
  'Housing': [
    'Apartment',
    'Condo',
    'Townhome',
    'Manufactured',
    'Single Family',
    'Multi-Family',
  ],
  'Collectibles': [
    'Antiques',
    'Art',
    'Coins & Currency',
    'Trading Cards',
    'Memorabilia',
    'Toys & Figures',
    'Stamps',
    'Vintage Electronics',
  ],
  'Other': [
    'General',
    'Services',
    'Free Stuff',
    'Wanted',
  ],
};

export function isValidCategory(category: string): boolean {
  return category in TAXONOMY;
}

export function isValidSubcategory(category: string, subcategory: string): boolean {
  if (!isValidCategory(category)) return false;
  return TAXONOMY[category].includes(subcategory);
}
