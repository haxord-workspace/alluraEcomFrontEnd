import { useEffect, useState } from 'react';
import { getPublicPromotions } from '../service/storePromotions';
import type { StorePromotion } from '../types/storePromotion';

const isPromotionNotExpired = (promotion: StorePromotion, now: number): boolean => {
  if (!promotion.expiresAt) return true;
  const expiresAt = new Date(promotion.expiresAt).getTime();
  if (Number.isNaN(expiresAt)) return true;
  return expiresAt > now;
};

export interface UsePromotionsResult {
  promotions: StorePromotion[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/** Fetches, normalizes (via the service) and filters out expired promotions, soonest-expiring first. */
export function usePromotions(): UsePromotionsResult {
  const [promotions, setPromotions] = useState<StorePromotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPromotions = async (isMounted = true) => {
    try {
      const list = await getPublicPromotions();
      if (!isMounted) return;
      const now = Date.now();
      const live = list.filter((promotion) => isPromotionNotExpired(promotion, now));

      // Check if backend provides priority / displayOrder / sortOrder
      const hasPriority = live.some(
        (p) => typeof p.priority === 'number' || typeof p.displayOrder === 'number' || typeof p.sortOrder === 'number'
      );

      if (hasPriority) {
        live.sort((a, b) => {
          const aPri = a.priority ?? a.displayOrder ?? a.sortOrder ?? 0;
          const bPri = b.priority ?? b.displayOrder ?? b.sortOrder ?? 0;
          return bPri - aPri; // Higher priority first
        });
      }
      // If no priority is provided, preserve exact backend response order (never reorder by expiry or discount).

      setPromotions(live);
    } catch {
      if (isMounted) setPromotions([]);
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchPromotions(isMounted);

    return () => {
      isMounted = false;
    };
  }, []);

  return { promotions, isLoading, refresh: () => fetchPromotions(true) };
}
