import type { AIKnowledgeArticle } from '../types';

export const mockAIKnowledgeData: AIKnowledgeArticle[] = [
  {
    id: 'kb-1',
    title: 'Sizing & Custom Fit Assistance',
    category: 'Product Sizing',
    content: 'Allura designs follow standard Indian and international modest cuts with ease of movement. Each piece has a 2-inch margin inside for custom tailoring.',
    status: 'Active',
    lastUpdated: '14 Sep 2026',
  },
  {
    id: 'kb-2',
    title: 'Fabric Care & Preservation',
    category: 'Care & Craft',
    content: 'All handcrafted Georgette, Chanderi, and Silk garments must be dry cleaned only to maintain zari sheen and delicate sequin integrity.',
    status: 'Active',
    lastUpdated: '10 Sep 2026',
  },
  {
    id: 'kb-3',
    title: 'Kerala & All-India Shipping Policy',
    category: 'Shipping Policy',
    content: 'Complimentary luxury courier delivery on all orders above ₹2,999 across India. Express Kerala delivery takes 24–48 hours via Delhivery.',
    status: 'Active',
    lastUpdated: '12 Sep 2026',
  },
  {
    id: 'kb-4',
    title: 'Hassle-Free 7-Day Returns & Exchanges',
    category: 'Return Policy',
    content: 'We offer doorstep pickup for size exchanges and returns within 7 days of delivery. Tags must be intact with unwashed garments.',
    status: 'Active',
    lastUpdated: '01 Sep 2026',
  },
  {
    id: 'kb-5',
    title: 'Boutique Atelier Visit & Personal Stylist',
    category: 'FAQ',
    content: 'Our flagship studio is located at Jubilee Road, Perinthalmanna, Kerala. Virtual WhatsApp styling sessions are available 10 AM to 8 PM.',
    status: 'Active',
    lastUpdated: '08 Sep 2026',
  },
];

export const mockAISuggestedPrompts = [
  "Show me elegant outfits for a wedding reception",
  "I need modest wear sets under ₹6000",
  "Where is my order ALR-ORD-849201?",
  "What size should I choose if I wear Size 36?",
  "Show me best-selling festive anarkalis",
  "How do I request an exchange for my order?",
];
