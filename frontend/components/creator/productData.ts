import { Product } from './types';

export const products: Product[] = [
  {
    id: 1,
    name: "Premium T-Shirt",
    category: "Apparel",
    variants: [
      { id: "ts-s", name: "Small", price: 24.99 },
      { id: "ts-m", name: "Medium", price: 24.99 },
      { id: "ts-l", name: "Large", price: 24.99 },
      { id: "ts-xl", name: "X-Large", price: 26.99 }
    ]
  },
  {
    id: 2,
    name: "Canvas Tote Bag",
    category: "Accessories",
    variants: [
      { id: "tb-reg", name: "Regular", price: 18.99 },
      { id: "tb-lg", name: "Large", price: 22.99 }
    ]
  },
  {
    id: 3,
    name: "Coffee Mug",
    category: "Drinkware",
    variants: [
      { id: "mug-11", name: "11oz", price: 16.99 },
      { id: "mug-15", name: "15oz", price: 18.99 }
    ]
  },
  {
    id: 4,
    name: "Poster Print",
    category: "Wall Art",
    variants: [
      { id: "poster-12x16", name: "12\" x 16\"", price: 15.99 },
      { id: "poster-18x24", name: "18\" x 24\"", price: 25.99 },
      { id: "poster-24x36", name: "24\" x 36\"", price: 35.99 }
    ]
  }
];