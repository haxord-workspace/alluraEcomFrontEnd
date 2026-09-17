import type { LookbookItem } from '../types';
import { productsData } from './products';

export const lookbookData: LookbookItem[] = [
  {
    id: 'look-1',
    title: 'The Royal Sovereign Edit',
    subtitle: 'Perinthalmanna Manor Collection',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85',
    category: 'Festive & Bridal',
    hotspots: [
      {
        x: 48,
        y: 42,
        product: productsData[0]
      }
    ]
  },
  {
    id: 'look-2',
    title: 'Modern Minimalist Co-ords',
    subtitle: 'Urban Resort Silhouettes',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
    category: 'Western Luxury',
    hotspots: [
      {
        x: 52,
        y: 38,
        product: productsData[1]
      }
    ]
  },
  {
    id: 'look-3',
    title: 'Nocturne Velvet Drama',
    subtitle: 'Cocktail & Black-Tie Statement',
    image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1200&q=85',
    category: 'Party Wear',
    hotspots: [
      {
        x: 50,
        y: 45,
        product: productsData[3]
      }
    ]
  },
  {
    id: 'look-4',
    title: 'Botanical Chanderi Serenity',
    subtitle: 'Subtle Daywear Luxury',
    image: 'https://images.unsplash.com/photo-1583391733975-088dd9fa7182?auto=format&fit=crop&w=1200&q=85',
    category: 'Curated Ethnic',
    hotspots: [
      {
        x: 46,
        y: 35,
        product: productsData[2]
      }
    ]
  }
];
