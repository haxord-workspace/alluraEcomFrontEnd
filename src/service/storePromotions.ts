import api from './api';
import type { StorePromotion, StorePromotionRef } from '../types/storePromotion';

const unwrap = (response: any): unknown => {
  const data = response?.data;
  return data?.data?.promotions || data?.promotions || data?.data || data || [];
};

const toRefArray = (value: unknown): StorePromotionRef[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({ id: String(item.id ?? ''), name: typeof item.name === 'string' ? item.name : '' }))
    .filter((item) => item.id);
};

const mapPromotion = (raw: any): StorePromotion => ({
  id: String(raw?.id ?? ''),
  name: typeof raw?.name === 'string' ? raw.name : '',
  description: typeof raw?.description === 'string' ? raw.description : '',
  discount: {
    type: typeof raw?.discount?.type === 'string' ? raw.discount.type : '',
    value: Number(raw?.discount?.value) || 0,
    maxDiscountAmount: Number(raw?.discount?.maxDiscountAmount) || 0,
  },
  applicableTo: {
    type: typeof raw?.applicableTo?.type === 'string' ? raw.applicableTo.type : 'ALL',
    products: toRefArray(raw?.applicableTo?.products),
    categories: toRefArray(raw?.applicableTo?.categories),
    collections: toRefArray(raw?.applicableTo?.collections),
  },
  minimumOrderValue: Number(raw?.minimumOrderValue) || 0,
  startsAt: typeof raw?.startsAt === 'string' ? raw.startsAt : '',
  expiresAt: typeof raw?.expiresAt === 'string' ? raw.expiresAt : '',
});

/** Storefront-facing promotions list. Degrades to [] on any failure — never throws. */
export async function getPublicPromotions(): Promise<StorePromotion[]> {
  try {
    const response = await api.get('/promotions');
    const list = unwrap(response);
    if (!Array.isArray(list)) return [];
    return list
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && item.id != null)
      .map(mapPromotion);
  } catch (error) {
    console.warn('getPublicPromotions failed:', error);
    return [];
  }
}
