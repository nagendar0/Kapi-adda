// Curated high-quality, high-resolution images for products
export const PRODUCT_IMAGES = {
  // Hot Beverages & Puffs
  'ragi malt': '/ragi_malt.png',
  'boost': '/boost_drink.png',
  'horlicks': '/horlicks.png',
  'badam milk': '/badam_milk.png',
  'badam pista': '/badam_pista.png',
  'veg puff': '/veg_puff.png',
  'egg puff': '/egg_puff.png',
  'chicken puff': '/chicken_puff.png',
  'lemon tea': '/lemon_tea.png',
  'green tea': '/green_tea.png',

  // Ice Creams
  'strawberry ice cream': '/strawberry_ice_cream.png',
  'chocolate ice cream': '/chocolate_ice_cream.png',
  'butter scotch ice cream': '/butter_scotch_ice_cream.png',
  'vanilla ice cream': '/vanilla_ice_cream.png',
  'black currant ice cream': '/black_currant_ice_cream.png',
  'pista ice cream': '/pista_ice_cream.png',
  'alphonso mango ice cream': '/mango_ice_cream.png',

  // Milk Shakes
  'strawberry milkshake': '/strawberry_milkshake.png',
  'chocolate milkshake': '/chocolate_milkshake.png',
  'butter scotch milkshake': '/butter_scotch_milkshake.png',
  'vanilla milkshake': '/vanilla_milkshake.png',
  'black currant milkshake': '/black_currant_milkshake.png',
  'kaju kishmiss milkshake': '/kaju_kishmiss_milkshake.png',
  'pista milkshake': '/pista_milkshake.png',

  // Fresh Juices
  'sapota juice': '/sapota_juice.png',
  'watermelon juice': '/watermelon_juice.png',
  'dragon fruit juice': '/dragon_fruit_juice.png',
  'muskmelon juice': '/muskmelon_juice.png',
  'apple juice': '/apple_juice.jpg',
  'carrot juice': '/carrot_juice_premium.png',
  'beetroot juice': '/beetroot_juice.png',
  'pomegranate juice': '/pomegranate_juice.png',

  // Coolers
  'green mojito': '/green_mojito.jpg',

  // Snacks
  'chicken lollipop': '/chicken_lollipop.png',
  'chicken nuggets': '/chicken_nuggets.jpg',
  'chicken roll': '/rolls_and_wraps.png',
  'chicken momos': '/momos.png',
  'prawns': '/prawns.png',
  'veg lollipop': '/veg_lollipop.png',
  'veg roll': '/veg_roll.png',
  'paneer momos': '/paneer_momos.png',
  'french fries': '/french_fries.jpg'
};

export const CATEGORY_IMAGES = {
  'Tea/Coffee': '/hot_beverage.png',
  'Tea & Coffee': '/hot_beverage.png',
  'Hot Beverages & Puffs': '/samosa_puff.png',
  'Milk Shakes': '/chocolate_dessert.png',
  'Coolers': '/fresh_fruit_juice.png',
  'Fresh Juices': '/fresh_fruit_juice.png',
  'Snacks': '/fried_snacks.png',
  'Ice Cream': '/vanilla_ice_cream.png',
  'Ice Creams': '/vanilla_ice_cream.png',
  'default': '/hot_beverage.png',
};

export function getImageForItem(item) {
  if (!item) return CATEGORY_IMAGES['default'];
  
  const name = (item.name || '').toLowerCase().trim();
  
  // 1. Direct name match in PRODUCT_IMAGES
  if (PRODUCT_IMAGES[name]) {
    return PRODUCT_IMAGES[name];
  }
  
  // 2. Partial name match in PRODUCT_IMAGES
  for (const key of Object.keys(PRODUCT_IMAGES)) {
    if (name.includes(key)) {
      return PRODUCT_IMAGES[key];
    }
  }

  // 3. Fallback to item's image/image_url if present and not None
  if (item.image_url && item.image_url !== 'None') {
    return item.image_url;
  }
  if (item.image && item.image !== 'None' && item.image.startsWith('http')) {
    return item.image;
  }
  if (item.image && item.image !== 'None' && item.image.startsWith('/')) {
    return item.image; // Local DB path like /blue_mojito_cooler.png
  }

  // 4. Return custom empty placeholder when no image was uploaded
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%231c1917"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2378716c">No Image Available</text></svg>`;
}
