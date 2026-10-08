import { useCallback, useEffect, useRef, useState } from 'react';
import { useShop } from '../context/ShopContext';
import type { Product, ProductColor } from '../types';

export type AddToBagState = 'idle' | 'adding' | 'added';

/**
 * Wraps addToCart with button feedback: 'adding' while the request runs (ignore repeat clicks),
 * then 'added' for a moment on success, then back to 'idle'.
 */
export const useAddToBag = (successMs = 1600) => {
  const { addToCart } = useShop();
  const [state, setState] = useState<AddToBagState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const add = useCallback(
    async (product: Product, size?: string, color?: ProductColor, quantity = 1, options?: { silent?: boolean }) => {
      if (state === 'adding') return false;
      clearTimeout(timer.current);
      setState('adding');
      const ok = await addToCart(product, size, color, quantity, options);
      if (ok) {
        setState('added');
        timer.current = setTimeout(() => setState('idle'), successMs);
      } else {
        setState('idle');
      }
      return ok;
    },
    [addToCart, state, successMs]
  );

  return { add, state, isAdding: state === 'adding', justAdded: state === 'added' };
};
