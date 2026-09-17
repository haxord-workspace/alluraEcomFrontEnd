export type ProductCategory = 'Ethnic Wear' | 'Modest Wear' | 'Party Wear' | 'Curated Sets';
export type OccasionType = 'Bridal' | 'Festive' | 'Party Wear' | 'Modest Wear' | 'Ethnic';

export interface ProductColor {
  name: string;
  hex: string;
  image?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: ProductCategory;
  occasion: OccasionType;
  rating: number;
  reviewsCount: number;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isFeatured?: boolean;
  colors: ProductColor[];
  sizes: string[];
  inStock: boolean;
  stockCount?: number;
  images: {
    primary: string;
    secondary: string;
    gallery?: string[];
  };
  description: string;
  fabricDetails: string;
  careInstructions: string;
  stylingTips: string;
  sku: string;
}

export interface OccasionItem {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  image: string;
}

export interface CollectionItem {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  image: string;
  itemCount: number;
}

export interface CartItem {
  product: Product;
  selectedSize: string;
  selectedColor: ProductColor;
  quantity: number;
}

export interface FilterState {
  category: string;
  occasion: string;
  colors: string[];
  sizes: string[];
  priceRange: [number, number];
  inStockOnly: boolean;
  sortBy: 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating';
}

export interface LookbookItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  category: string;
  hotspots: {
    x: number; // percentage 0 - 100
    y: number; // percentage 0 - 100
    product: Product;
  }[];
}
