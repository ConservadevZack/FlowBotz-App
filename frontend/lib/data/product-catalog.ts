export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
  attributes: Record<string, any>;
}

export interface ProductSize {
  id: string;
  label: string;
  dimensions: {
    width: number;
    height: number;
    unit: 'inch' | 'cm';
  };
  priceModifier: number; // Multiplier for base price
}

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  textureUrl?: string;
}

export interface PrintArea {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  maxDPI: number;
  safeZone: number; // Margin in pixels
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  basePrice: number;
  currency: string;
  images: {
    thumbnail: string;
    main: string;
    gallery: string[];
    mockup: string;
    template: string;
  };
  sizes: ProductSize[];
  colors: ProductColor[];
  printAreas: PrintArea[];
  materials: string[];
  features: string[];
  tags: string[];
  popularity: number;
  rating: number;
  reviews: number;
  processingTime: number; // Days
  shippingTime: {
    standard: number;
    express: number;
  };
  eco: boolean;
  customizable: boolean;
  minimumOrder: number;
  bulkPricing: {
    quantity: number;
    discount: number;
  }[];
}

export const PRODUCT_CATALOG: Product[] = [
  // Apparel - T-Shirts
  {
    id: 'tshirt-classic',
    name: 'Classic Cotton T-Shirt',
    category: 'Apparel',
    subcategory: 'T-Shirts',
    description: 'Premium 100% cotton t-shirt with a comfortable fit',
    basePrice: 24.99,
    currency: 'USD',
    images: {
      thumbnail: '/products/tshirt-classic-thumb.jpg',
      main: '/products/tshirt-classic-main.jpg',
      gallery: ['/products/tshirt-classic-1.jpg', '/products/tshirt-classic-2.jpg'],
      mockup: '/products/tshirt-classic-mockup.jpg',
      template: '/products/tshirt-classic-template.png'
    },
    sizes: [
      { id: 'xs', label: 'XS', dimensions: { width: 18, height: 25, unit: 'inch' }, priceModifier: 1 },
      { id: 's', label: 'S', dimensions: { width: 19, height: 26, unit: 'inch' }, priceModifier: 1 },
      { id: 'm', label: 'M', dimensions: { width: 20, height: 27, unit: 'inch' }, priceModifier: 1 },
      { id: 'l', label: 'L', dimensions: { width: 21, height: 28, unit: 'inch' }, priceModifier: 1 },
      { id: 'xl', label: 'XL', dimensions: { width: 22, height: 29, unit: 'inch' }, priceModifier: 1.1 },
      { id: '2xl', label: '2XL', dimensions: { width: 23, height: 30, unit: 'inch' }, priceModifier: 1.2 },
      { id: '3xl', label: '3XL', dimensions: { width: 24, height: 31, unit: 'inch' }, priceModifier: 1.3 }
    ],
    colors: [
      { id: 'white', name: 'White', hex: '#FFFFFF' },
      { id: 'black', name: 'Black', hex: '#000000' },
      { id: 'navy', name: 'Navy', hex: '#1F2937' },
      { id: 'gray', name: 'Gray', hex: '#6B7280' },
      { id: 'red', name: 'Red', hex: '#EF4444' },
      { id: 'blue', name: 'Blue', hex: '#3B82F6' },
      { id: 'green', name: 'Green', hex: '#10B981' }
    ],
    printAreas: [
      { id: 'front', name: 'Front', width: 12, height: 16, x: 0, y: 0, maxDPI: 300, safeZone: 50 },
      { id: 'back', name: 'Back', width: 12, height: 16, x: 0, y: 0, maxDPI: 300, safeZone: 50 },
      { id: 'left-chest', name: 'Left Chest', width: 4, height: 4, x: -4, y: -8, maxDPI: 300, safeZone: 20 }
    ],
    materials: ['100% Cotton', 'Pre-shrunk', 'Ring-spun'],
    features: ['Breathable', 'Machine washable', 'Tagless comfort'],
    tags: ['bestseller', 'cotton', 'casual', 'unisex'],
    popularity: 95,
    rating: 4.7,
    reviews: 1284,
    processingTime: 2,
    shippingTime: { standard: 5, express: 2 },
    eco: true,
    customizable: true,
    minimumOrder: 1,
    bulkPricing: [
      { quantity: 10, discount: 0.1 },
      { quantity: 25, discount: 0.15 },
      { quantity: 50, discount: 0.2 },
      { quantity: 100, discount: 0.25 }
    ]
  },
  
  // Apparel - Hoodies
  {
    id: 'hoodie-premium',
    name: 'Premium Pullover Hoodie',
    category: 'Apparel',
    subcategory: 'Hoodies',
    description: 'Cozy fleece-lined hoodie with kangaroo pocket',
    basePrice: 44.99,
    currency: 'USD',
    images: {
      thumbnail: '/products/hoodie-premium-thumb.jpg',
      main: '/products/hoodie-premium-main.jpg',
      gallery: ['/products/hoodie-premium-1.jpg', '/products/hoodie-premium-2.jpg'],
      mockup: '/products/hoodie-premium-mockup.jpg',
      template: '/products/hoodie-premium-template.png'
    },
    sizes: [
      { id: 's', label: 'S', dimensions: { width: 20, height: 27, unit: 'inch' }, priceModifier: 1 },
      { id: 'm', label: 'M', dimensions: { width: 22, height: 28, unit: 'inch' }, priceModifier: 1 },
      { id: 'l', label: 'L', dimensions: { width: 24, height: 29, unit: 'inch' }, priceModifier: 1 },
      { id: 'xl', label: 'XL', dimensions: { width: 26, height: 30, unit: 'inch' }, priceModifier: 1.1 },
      { id: '2xl', label: '2XL', dimensions: { width: 28, height: 31, unit: 'inch' }, priceModifier: 1.2 }
    ],
    colors: [
      { id: 'black', name: 'Black', hex: '#000000' },
      { id: 'gray', name: 'Heather Gray', hex: '#9CA3AF' },
      { id: 'navy', name: 'Navy', hex: '#1E3A8A' },
      { id: 'maroon', name: 'Maroon', hex: '#7F1D1D' }
    ],
    printAreas: [
      { id: 'front', name: 'Front', width: 14, height: 16, x: 0, y: 0, maxDPI: 300, safeZone: 50 },
      { id: 'back', name: 'Back', width: 14, height: 16, x: 0, y: 0, maxDPI: 300, safeZone: 50 }
    ],
    materials: ['80% Cotton', '20% Polyester', 'Fleece-lined'],
    features: ['Double-lined hood', 'Kangaroo pocket', 'Ribbed cuffs'],
    tags: ['warm', 'comfortable', 'winter', 'streetwear'],
    popularity: 88,
    rating: 4.8,
    reviews: 892,
    processingTime: 3,
    shippingTime: { standard: 5, express: 2 },
    eco: false,
    customizable: true,
    minimumOrder: 1,
    bulkPricing: [
      { quantity: 10, discount: 0.1 },
      { quantity: 25, discount: 0.15 },
      { quantity: 50, discount: 0.2 }
    ]
  },
  
  // Accessories - Mugs
  {
    id: 'mug-ceramic-11oz',
    name: 'Ceramic Coffee Mug 11oz',
    category: 'Accessories',
    subcategory: 'Drinkware',
    description: 'Classic ceramic mug perfect for your morning coffee',
    basePrice: 14.99,
    currency: 'USD',
    images: {
      thumbnail: '/products/mug-11oz-thumb.jpg',
      main: '/products/mug-11oz-main.jpg',
      gallery: ['/products/mug-11oz-1.jpg', '/products/mug-11oz-2.jpg'],
      mockup: '/products/mug-11oz-mockup.jpg',
      template: '/products/mug-11oz-template.png'
    },
    sizes: [
      { id: '11oz', label: '11oz', dimensions: { width: 3.2, height: 3.7, unit: 'inch' }, priceModifier: 1 }
    ],
    colors: [
      { id: 'white', name: 'White', hex: '#FFFFFF' },
      { id: 'black', name: 'Black', hex: '#000000' },
      { id: 'blue', name: 'Blue', hex: '#3B82F6' },
      { id: 'red', name: 'Red', hex: '#EF4444' }
    ],
    printAreas: [
      { id: 'wrap', name: 'Full Wrap', width: 9.5, height: 3.5, x: 0, y: 0, maxDPI: 300, safeZone: 30 }
    ],
    materials: ['Ceramic', 'Lead-free', 'BPA-free'],
    features: ['Dishwasher safe', 'Microwave safe', 'C-handle'],
    tags: ['drinkware', 'gift', 'office', 'kitchen'],
    popularity: 92,
    rating: 4.9,
    reviews: 2156,
    processingTime: 2,
    shippingTime: { standard: 4, express: 2 },
    eco: true,
    customizable: true,
    minimumOrder: 1,
    bulkPricing: [
      { quantity: 12, discount: 0.15 },
      { quantity: 24, discount: 0.2 },
      { quantity: 48, discount: 0.25 }
    ]
  },
  
  // Home Decor - Canvas Prints
  {
    id: 'canvas-print-16x20',
    name: 'Gallery Canvas Print',
    category: 'Home Decor',
    subcategory: 'Wall Art',
    description: 'Museum-quality canvas print with wooden frame',
    basePrice: 39.99,
    currency: 'USD',
    images: {
      thumbnail: '/products/canvas-thumb.jpg',
      main: '/products/canvas-main.jpg',
      gallery: ['/products/canvas-1.jpg', '/products/canvas-2.jpg'],
      mockup: '/products/canvas-mockup.jpg',
      template: '/products/canvas-template.png'
    },
    sizes: [
      { id: '8x10', label: '8" × 10"', dimensions: { width: 8, height: 10, unit: 'inch' }, priceModifier: 0.7 },
      { id: '12x16', label: '12" × 16"', dimensions: { width: 12, height: 16, unit: 'inch' }, priceModifier: 0.85 },
      { id: '16x20', label: '16" × 20"', dimensions: { width: 16, height: 20, unit: 'inch' }, priceModifier: 1 },
      { id: '20x30', label: '20" × 30"', dimensions: { width: 20, height: 30, unit: 'inch' }, priceModifier: 1.5 },
      { id: '24x36', label: '24" × 36"', dimensions: { width: 24, height: 36, unit: 'inch' }, priceModifier: 2 }
    ],
    colors: [
      { id: 'natural', name: 'Natural Wood Frame', hex: '#8B7355' },
      { id: 'black', name: 'Black Frame', hex: '#000000' },
      { id: 'white', name: 'White Frame', hex: '#FFFFFF' }
    ],
    printAreas: [
      { id: 'full', name: 'Full Canvas', width: 16, height: 20, x: 0, y: 0, maxDPI: 300, safeZone: 0 }
    ],
    materials: ['Canvas', 'Pine wood frame', 'Archival inks'],
    features: ['Ready to hang', 'Gallery wrapped', 'UV resistant'],
    tags: ['wall-art', 'home-decor', 'gift', 'premium'],
    popularity: 85,
    rating: 4.8,
    reviews: 673,
    processingTime: 3,
    shippingTime: { standard: 6, express: 3 },
    eco: true,
    customizable: true,
    minimumOrder: 1,
    bulkPricing: [
      { quantity: 5, discount: 0.1 },
      { quantity: 10, discount: 0.15 }
    ]
  },
  
  // Stationery - Notebooks
  {
    id: 'notebook-spiral',
    name: 'Spiral Bound Notebook',
    category: 'Stationery',
    subcategory: 'Notebooks',
    description: 'High-quality spiral notebook with custom cover',
    basePrice: 12.99,
    currency: 'USD',
    images: {
      thumbnail: '/products/notebook-thumb.jpg',
      main: '/products/notebook-main.jpg',
      gallery: ['/products/notebook-1.jpg', '/products/notebook-2.jpg'],
      mockup: '/products/notebook-mockup.jpg',
      template: '/products/notebook-template.png'
    },
    sizes: [
      { id: 'a5', label: 'A5', dimensions: { width: 5.8, height: 8.3, unit: 'inch' }, priceModifier: 0.8 },
      { id: 'a4', label: 'A4', dimensions: { width: 8.3, height: 11.7, unit: 'inch' }, priceModifier: 1 }
    ],
    colors: [
      { id: 'white', name: 'White Pages', hex: '#FFFFFF' },
      { id: 'cream', name: 'Cream Pages', hex: '#FFF8DC' }
    ],
    printAreas: [
      { id: 'cover', name: 'Front Cover', width: 8.3, height: 11.7, x: 0, y: 0, maxDPI: 300, safeZone: 25 }
    ],
    materials: ['120gsm paper', 'Laminated cover', 'Metal spiral'],
    features: ['120 pages', 'Lined/Grid/Blank options', 'Perforated pages'],
    tags: ['stationery', 'office', 'school', 'journal'],
    popularity: 76,
    rating: 4.6,
    reviews: 421,
    processingTime: 3,
    shippingTime: { standard: 5, express: 2 },
    eco: true,
    customizable: true,
    minimumOrder: 1,
    bulkPricing: [
      { quantity: 10, discount: 0.12 },
      { quantity: 25, discount: 0.18 },
      { quantity: 50, discount: 0.22 }
    ]
  },
  
  // Tech Accessories - Phone Cases
  {
    id: 'phone-case-iphone',
    name: 'Premium Phone Case',
    category: 'Tech Accessories',
    subcategory: 'Phone Cases',
    description: 'Durable phone case with custom design',
    basePrice: 19.99,
    currency: 'USD',
    images: {
      thumbnail: '/products/phone-case-thumb.jpg',
      main: '/products/phone-case-main.jpg',
      gallery: ['/products/phone-case-1.jpg', '/products/phone-case-2.jpg'],
      mockup: '/products/phone-case-mockup.jpg',
      template: '/products/phone-case-template.png'
    },
    sizes: [
      { id: 'iphone-14', label: 'iPhone 14', dimensions: { width: 2.8, height: 5.8, unit: 'inch' }, priceModifier: 1 },
      { id: 'iphone-14-pro', label: 'iPhone 14 Pro', dimensions: { width: 2.8, height: 6.1, unit: 'inch' }, priceModifier: 1 },
      { id: 'iphone-14-pro-max', label: 'iPhone 14 Pro Max', dimensions: { width: 3.1, height: 6.7, unit: 'inch' }, priceModifier: 1 },
      { id: 'samsung-s23', label: 'Samsung S23', dimensions: { width: 2.8, height: 5.9, unit: 'inch' }, priceModifier: 1 }
    ],
    colors: [
      { id: 'clear', name: 'Clear', hex: 'transparent' },
      { id: 'black', name: 'Black', hex: '#000000' },
      { id: 'white', name: 'White', hex: '#FFFFFF' }
    ],
    printAreas: [
      { id: 'back', name: 'Back', width: 2.8, height: 5.8, x: 0, y: 0, maxDPI: 300, safeZone: 10 }
    ],
    materials: ['TPU', 'Polycarbonate', 'Shock-absorbing'],
    features: ['Wireless charging compatible', 'Raised edges', 'Anti-scratch'],
    tags: ['tech', 'phone', 'protection', 'accessory'],
    popularity: 89,
    rating: 4.7,
    reviews: 1543,
    processingTime: 2,
    shippingTime: { standard: 4, express: 2 },
    eco: false,
    customizable: true,
    minimumOrder: 1,
    bulkPricing: [
      { quantity: 10, discount: 0.15 },
      { quantity: 25, discount: 0.2 }
    ]
  },
  
  // Bags - Tote Bags
  {
    id: 'tote-bag-canvas',
    name: 'Canvas Tote Bag',
    category: 'Bags',
    subcategory: 'Tote Bags',
    description: 'Eco-friendly canvas tote bag for everyday use',
    basePrice: 18.99,
    currency: 'USD',
    images: {
      thumbnail: '/products/tote-thumb.jpg',
      main: '/products/tote-main.jpg',
      gallery: ['/products/tote-1.jpg', '/products/tote-2.jpg'],
      mockup: '/products/tote-mockup.jpg',
      template: '/products/tote-template.png'
    },
    sizes: [
      { id: 'standard', label: 'Standard', dimensions: { width: 15, height: 16, unit: 'inch' }, priceModifier: 1 },
      { id: 'large', label: 'Large', dimensions: { width: 18, height: 18, unit: 'inch' }, priceModifier: 1.2 }
    ],
    colors: [
      { id: 'natural', name: 'Natural', hex: '#F5E6D3' },
      { id: 'black', name: 'Black', hex: '#000000' },
      { id: 'navy', name: 'Navy', hex: '#1F2937' }
    ],
    printAreas: [
      { id: 'front', name: 'Front', width: 12, height: 12, x: 0, y: 0, maxDPI: 300, safeZone: 40 },
      { id: 'back', name: 'Back', width: 12, height: 12, x: 0, y: 0, maxDPI: 300, safeZone: 40 }
    ],
    materials: ['100% Cotton canvas', '12oz weight', 'Reinforced handles'],
    features: ['Machine washable', 'Large capacity', 'Inside pocket'],
    tags: ['eco-friendly', 'reusable', 'shopping', 'everyday'],
    popularity: 83,
    rating: 4.6,
    reviews: 892,
    processingTime: 2,
    shippingTime: { standard: 5, express: 2 },
    eco: true,
    customizable: true,
    minimumOrder: 1,
    bulkPricing: [
      { quantity: 20, discount: 0.15 },
      { quantity: 50, discount: 0.2 },
      { quantity: 100, discount: 0.25 }
    ]
  },
  
  // Posters
  {
    id: 'poster-matte',
    name: 'Matte Paper Poster',
    category: 'Home Decor',
    subcategory: 'Posters',
    description: 'High-quality matte poster perfect for any room',
    basePrice: 16.99,
    currency: 'USD',
    images: {
      thumbnail: '/products/poster-thumb.jpg',
      main: '/products/poster-main.jpg',
      gallery: ['/products/poster-1.jpg', '/products/poster-2.jpg'],
      mockup: '/products/poster-mockup.jpg',
      template: '/products/poster-template.png'
    },
    sizes: [
      { id: '11x17', label: '11" × 17"', dimensions: { width: 11, height: 17, unit: 'inch' }, priceModifier: 0.7 },
      { id: '18x24', label: '18" × 24"', dimensions: { width: 18, height: 24, unit: 'inch' }, priceModifier: 1 },
      { id: '24x36', label: '24" × 36"', dimensions: { width: 24, height: 36, unit: 'inch' }, priceModifier: 1.3 }
    ],
    colors: [
      { id: 'white', name: 'White Border', hex: '#FFFFFF' },
      { id: 'black', name: 'Black Border', hex: '#000000' },
      { id: 'none', name: 'No Border', hex: 'transparent' }
    ],
    printAreas: [
      { id: 'full', name: 'Full Poster', width: 18, height: 24, x: 0, y: 0, maxDPI: 300, safeZone: 0 }
    ],
    materials: ['190gsm paper', 'Matte finish', 'Archival quality'],
    features: ['Fade resistant', 'Museum quality', 'Ready to frame'],
    tags: ['poster', 'wall-art', 'decor', 'print'],
    popularity: 79,
    rating: 4.7,
    reviews: 534,
    processingTime: 2,
    shippingTime: { standard: 4, express: 2 },
    eco: true,
    customizable: true,
    minimumOrder: 1,
    bulkPricing: [
      { quantity: 5, discount: 0.1 },
      { quantity: 10, discount: 0.15 },
      { quantity: 25, discount: 0.2 }
    ]
  },
  
  // More products would continue here to reach 100+ items...
];

// Product categories for filtering
export const PRODUCT_CATEGORIES = [
  {
    id: 'apparel',
    name: 'Apparel',
    subcategories: ['T-Shirts', 'Hoodies', 'Tank Tops', 'Long Sleeves', 'Sweatshirts', 'Jackets']
  },
  {
    id: 'accessories',
    name: 'Accessories',
    subcategories: ['Drinkware', 'Hats', 'Jewelry', 'Watches', 'Sunglasses']
  },
  {
    id: 'home-decor',
    name: 'Home Decor',
    subcategories: ['Wall Art', 'Posters', 'Pillows', 'Blankets', 'Tapestries', 'Clocks']
  },
  {
    id: 'stationery',
    name: 'Stationery',
    subcategories: ['Notebooks', 'Cards', 'Stickers', 'Calendars', 'Planners']
  },
  {
    id: 'tech-accessories',
    name: 'Tech Accessories',
    subcategories: ['Phone Cases', 'Laptop Sleeves', 'Mouse Pads', 'USB Drives']
  },
  {
    id: 'bags',
    name: 'Bags',
    subcategories: ['Tote Bags', 'Backpacks', 'Drawstring Bags', 'Fanny Packs']
  },
  {
    id: 'pet-products',
    name: 'Pet Products',
    subcategories: ['Pet Bowls', 'Pet Bandanas', 'Pet Tags', 'Pet Beds']
  },
  {
    id: 'sports',
    name: 'Sports & Outdoors',
    subcategories: ['Water Bottles', 'Yoga Mats', 'Sports Towels', 'Gym Bags']
  }
];

// Helper functions
export function getProductById(id: string): Product | undefined {
  return PRODUCT_CATALOG.find(product => product.id === id);
}

export function getProductsByCategory(category: string): Product[] {
  return PRODUCT_CATALOG.filter(product => 
    product.category.toLowerCase() === category.toLowerCase()
  );
}

export function getProductsBySubcategory(subcategory: string): Product[] {
  return PRODUCT_CATALOG.filter(product => 
    product.subcategory?.toLowerCase() === subcategory.toLowerCase()
  );
}

export function searchProducts(query: string): Product[] {
  const lowerQuery = query.toLowerCase();
  return PRODUCT_CATALOG.filter(product =>
    product.name.toLowerCase().includes(lowerQuery) ||
    product.description.toLowerCase().includes(lowerQuery) ||
    product.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export function getPopularProducts(limit: number = 10): Product[] {
  return [...PRODUCT_CATALOG]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

export function getTopRatedProducts(limit: number = 10): Product[] {
  return [...PRODUCT_CATALOG]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export function calculatePrice(
  product: Product,
  sizeId: string,
  quantity: number
): number {
  const size = product.sizes.find(s => s.id === sizeId);
  if (!size) return product.basePrice;
  
  let price = product.basePrice * size.priceModifier;
  
  // Apply bulk pricing
  for (const bulk of product.bulkPricing) {
    if (quantity >= bulk.quantity) {
      price *= (1 - bulk.discount);
    }
  }
  
  return price * quantity;
}