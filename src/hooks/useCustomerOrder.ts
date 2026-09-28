import { useEffect, useState } from 'react';
import { useShop } from '../context/ShopContext';
import type { Order } from '../types';

/**
 * Returns a customer's order, fetching GET /orders/{orderId} so the page
 * always shows the latest status (the list may be stale or not loaded yet).
 */
export const useCustomerOrder = (orderId?: string): { order: Order | undefined; isLoading: boolean } => {
  const { getOrderById, loadOrder } = useShop();
  const cached = orderId ? getOrderById(orderId) : undefined;
  const [isLoading, setIsLoading] = useState(!!orderId);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    setIsLoading(true);
    loadOrder(orderId).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [orderId, loadOrder]);

  // Read again after loading so the freshest copy from the cache is returned
  return { order: orderId ? getOrderById(orderId) ?? cached : undefined, isLoading: isLoading && !cached };
};
