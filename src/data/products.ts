import type { Product } from '../types';

export const productsData: Product[] = [
  {
    id: 'prod-1',
    slug: 'classic-cream-anarkali-gown',
    name: 'Classic Cream Anarkali Gown with Maroon Border',
    price: 8999,
    originalPrice: 10499,
    category: 'Ethnic Wear',
    occasion: 'Festive',
    rating: 4.9,
    reviewsCount: 38,
    isBestSeller: true,
    isFeatured: true,
    colors: [
      { name: 'Cream & Maroon', hex: '#EBE3D5' },
      { name: 'Blush Gold', hex: '#E5BFB8' },
      { name: 'Deep Crimson', hex: '#7A1C28' }
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    inStock: true,
    stockCount: 6,
    images: {
      primary: '/images/best-sellers/classic-cream-anarkali.jpeg',
      secondary: '/images/best-sellers/aura-cream-embroidered.jpeg',
      gallery: [
        '/images/best-sellers/classic-cream-anarkali.jpeg',
        '/images/best-sellers/aura-cream-embroidered.jpeg',
        '/images/best-sellers/blush-modest-elegance.jpeg'
      ]
    },
    description: 'An ode to classic royal heritage, this handcrafted ivory Anarkali set features delicate golden threadwork, full modest sleeves with scalloped cuffs, and a flowing flared silhouette with an organza dupatta.',
    fabricDetails: 'Pure Georgette with Zari & Sequin embroidery. Full breathable Cotton Silk inner lining.',
    careInstructions: 'Dry clean only. Store in a muslin cloth away from direct sunlight.',
    stylingTips: 'Pair with statement chaandbaalis and antique gold heels for a graceful festive reception look.',
    sku: 'ALR-ETH-001'
  },
  {
    id: 'prod-2',
    slug: 'elegant-cream-embroidered-dress',
    name: 'Elegant Cream Embroidered Dress with Dupatta',
    price: 6499,
    originalPrice: 7499,
    category: 'Modest Wear',
    occasion: 'Party Wear',
    rating: 4.9,
    reviewsCount: 28,
    isBestSeller: true,
    isFeatured: true,
    colors: [
      { name: 'Ivory Cream', hex: '#F5EFE6' },
      { name: 'Dusty Rose', hex: '#D8A49B' },
      { name: 'Sage Green', hex: '#C2CBB8' }
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    inStock: true,
    stockCount: 12,
    images: {
      primary: '/images/best-sellers/aura-cream-embroidered.jpeg',
      secondary: '/images/best-sellers/classic-cream-anarkali.jpeg',
      gallery: [
        '/images/best-sellers/aura-cream-embroidered.jpeg',
        '/images/best-sellers/classic-cream-anarkali.jpeg'
      ]
    },
    description: 'A modest Islamic & ethnic couture classic. Handcrafted cream embroidered silhouette featuring artisan threadwork, scalloped neckline, full modest lining, and sheer embroidered organza dupatta for festive and boutique gatherings.',
    fabricDetails: 'Premium Chanderi Silk with pure mulmul inner lining.',
    careInstructions: 'Gentle hand wash in cold water or mild machine cycle. Do not iron directly on embroidery.',
    stylingTips: 'Style with minimalist nude pumps and sleek gold hoops for family dinners or boutique celebrations.',
    sku: 'ALR-MOD-002'
  },
  {
    id: 'prod-3',
    slug: 'blush-modest-pleated-elegance',
    name: 'Blush Parisian Modest Pleated Set',
    price: 5499,
    originalPrice: 6299,
    category: 'Modest Wear',
    occasion: 'Modest Wear',
    rating: 4.8,
    reviewsCount: 31,
    isBestSeller: true,
    colors: [
      { name: 'Blush Rose', hex: '#E5BFB8' },
      { name: 'Beige Cream', hex: '#EAE1D2' },
      { name: 'Espresso', hex: '#4A3B32' }
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    inStock: true,
    stockCount: 15,
    images: {
      primary: '/images/best-sellers/blush-modest-elegance.jpeg',
      secondary: '/images/best-sellers/aura-cream-embroidered.jpeg',
      gallery: [
        '/images/best-sellers/blush-modest-elegance.jpeg'
      ]
    },
    description: 'Effortlessly modest and modern, this micro-pleated set features tailored high-waist fluid trousers and an asymmetric modest tunic top with subtle golden detailing.',
    fabricDetails: 'Premium Pleated Satin Crepe. Wrinkle-resistant, non-see-through, and ultra-lightweight.',
    careInstructions: 'Dry clean recommended for initial wash. Gentle hand wash thereafter.',
    stylingTips: 'Perfect for daytime festivities, brunch gatherings, and high-society ease.',
    sku: 'ALR-MOD-003'
  },
  {
    id: 'prod-4',
    slug: 'emerald-festive-silk-kurta-set',
    name: 'Emerald Festive Silk Kurta Set',
    price: 7999,
    originalPrice: 8999,
    category: 'Ethnic Wear',
    occasion: 'Festive',
    rating: 4.9,
    reviewsCount: 22,
    isBestSeller: true,
    isNewArrival: true,
    colors: [
      { name: 'Emerald Green', hex: '#1C4A3A' },
      { name: 'Deep Olive', hex: '#4A5038' },
      { name: 'Royal Crimson', hex: '#7A1C28' }
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    inStock: true,
    stockCount: 8,
    images: {
      primary: '/images/best-sellers/emerald-festive-silk.jpeg',
      secondary: '/images/best-sellers/classic-cream-anarkali.jpeg',
      gallery: [
        '/images/best-sellers/emerald-festive-silk.jpeg'
      ]
    },
    description: 'Rich jewel-toned Banarasi silk kurta accompanied by matching straight trousers and a heavy brocade weave dupatta with modest full lining.',
    fabricDetails: 'Banarasi Katan Silk with gold brocade.',
    careInstructions: 'Professional dry clean.',
    stylingTips: 'Style with antique temple jewellery for weddings and Eid / festive celebrations.',
    sku: 'ALR-ETH-004'
  },
  {
    id: 'prod-5',
    slug: 'royal-crimson-bridal-couture',
    name: 'Royal Crimson Modest Bridal Lehenga',
    price: 18999,
    originalPrice: 22499,
    category: 'Ethnic Wear',
    occasion: 'Bridal',
    rating: 5.0,
    reviewsCount: 16,
    isFeatured: true,
    colors: [
      { name: 'Royal Crimson', hex: '#7A1C28' },
      { name: 'Heritage Maroon', hex: '#58111A' }
    ],
    sizes: ['S', 'M', 'L', 'Custom Stitch'],
    inStock: true,
    stockCount: 3,
    images: {
      primary: '/images/best-sellers/classic-cream-anarkali.jpeg',
      secondary: '/images/best-sellers/aura-cream-embroidered.jpeg',
      gallery: [
        '/images/best-sellers/classic-cream-anarkali.jpeg'
      ]
    },
    description: 'Exquisite bridal couture crafted with traditional dabka, zardozi, and micro-pearl embroidery on rich raw silk. Features modest full sleeve blouse and double dupatta styling.',
    fabricDetails: 'Heritage Raw Silk with heavy hand embroidery & double net dupatta.',
    careInstructions: 'Specialist bridal dry clean only. Preserve in acid-free tissue.',
    stylingTips: 'Enquire on WhatsApp for bespoke bridal measurements and dupatta customization.',
    sku: 'ALR-BRL-005'
  },
  {
    id: 'prod-6',
    slug: 'heritage-cream-silk-suit',
    name: 'Heritage Cream Silk Suit with Dupatta',
    price: 9499,
    originalPrice: 11200,
    category: 'Modest Wear',
    occasion: 'Ethnic',
    rating: 4.9,
    reviewsCount: 29,
    isNewArrival: true,
    colors: [
      { name: 'Cream Silk', hex: '#F7F1E7' },
      { name: 'Golden Taupe', hex: '#9C8E84' }
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    inStock: true,
    stockCount: 9,
    images: {
      primary: '/images/best-sellers/aura-cream-embroidered.jpeg',
      secondary: '/images/best-sellers/blush-modest-elegance.jpeg',
      gallery: [
        '/images/best-sellers/aura-cream-embroidered.jpeg'
      ]
    },
    description: 'Modest luxury crafted from pure silk with intricate zari and sequin motifs. Designed for women who appreciate timeless refinement.',
    fabricDetails: 'Pure Silk with breathable mulmul inner lining.',
    careInstructions: 'Dry clean only.',
    stylingTips: 'Style with antique pearls and structured clutch for boutique occasions.',
    sku: 'ALR-ETH-006'
  }
];
