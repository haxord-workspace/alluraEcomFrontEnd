import { useCallback, useRef, useState } from 'react';
import { useShop } from '../context/ShopContext';
import type { CartItem } from '../types';

export type CartLineAction = 'decrease' | 'increase' | 'remove';

const lineKey = (item: CartItem) => `${item.product.id}-${item.selectedSize}-${item.selectedColor.name}`;

/**
 * Quantity / remove actions for bag lines. Only one action runs at a time:
 * every control stays disabled until the server responds, and the clicked
 * button shows a spinner.
 */
export const useCartLineActions = () => {
  const { updateQuantity, removeFromCart } = useShop();
  const [pending, setPending] = useState<{ key: string; action: CartLineAction } | null>(null);
  const busy = useRef(false);

  const run = useCallback(
    async (item: CartItem, action: CartLineAction) => {
      if (busy.current) return;
      busy.current = true;
      setPending({ key: lineKey(item), action });
      const { id } = item.product;
      try {
        if (action === 'remove') {
          await removeFromCart(id, item.selectedSize, item.selectedColor.name);
        } else {
          const quantity = item.quantity + (action === 'increase' ? 1 : -1);
          await updateQuantity(id, item.selectedSize, item.selectedColor.name, quantity);
        }
      } finally {
        busy.current = false;
        setPending(null);
      }
    },
    [updateQuantity, removeFromCart]
  );

  const isPending = (item: CartItem, action: CartLineAction) =>
    pending?.key === lineKey(item) && pending.action === action;

  return { run, isBusy: pending !== null, isPending };
};
