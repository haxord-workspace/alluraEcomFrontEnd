import { useEffect, useState } from 'react';
import { getPublicPromotions } from '../service/storePromotions';
import type { StorePromotion } from '../types/storePromotion';

const isValidDate = (value: string): boolean => !!value && Number.isFinite(new Date(value).getTime());

const isPromotionLive = (promotion: StorePromotion, now: number): boolean => {
  if (!isValidDate(promotion.startsAt) || !isValidDate(promotion.expiresAt)) return false;
  const startsAt = new Date(promotion.startsAt).getTime();
  const expiresAt = new Date(promotion.expiresAt).getTime();
  return expiresAt > now && startsAt <= now;
};

export interface UsePromotionsResult {
  promotions: StorePromotion[];
  isLoading: boolean;
}

/** Fetches, normalizes (via the service) and filters to currently-live promotions, soonest-expiring first. */
export function usePromotions(): UsePromotionsResult {
  const [promotions, setPromotions] = useState<StorePromotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getPublicPromotions()
      .then((list) => {
        if (!isMounted) return;
        const now = Date.now();
        const live = list
          .filter((promotion) => isPromotionLive(promotion, now))
          .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
        setPromotions(live);
      })
      .catch(() => {
        if (isMounted) setPromotions([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { promotions, isLoading };
}
