import { useEffect, useState, useCallback } from 'react';
import { getAdminProducts } from '../service/adminProducts';
import { getAdminVariants } from '../service/adminVariants';
import { enrichOrder } from '../service/orders';
import type { OrderCatalogInfo } from '../service/orders';
import type { Order } from '../types';

type Catalog = {
  products: Map<string, { name: string; image?: string }>;
  variants: Map<string, { color?: string; size?: string; image?: string }>;
};

// Loaded once per session and shared by every admin order screen
let catalogPromise: Promise<Catalog> | null = null;

const loadCatalog = (): Promise<Catalog> => {
  if (!catalogPromise) {
    catalogPromise = Promise.all([getAdminProducts().catch(() => []), getAdminVariants().catch(() => [])]).then(
      ([products, variants]) => ({
        products: new Map(
          products.map(p => [p.id, { name: p.name, image: p.images?.find(i => i.isPrimary)?.url || p.images?.[0]?.url }])
        ),
        variants: new Map(
          variants.map(v => [
            v.id,
            {
              color: v.attributes?.color,
              size: v.attributes?.size,
              image: v.images?.find((i: any) => i.isPrimary)?.url || v.images?.[0]?.url,
            },
          ])
        ),
      })
    );
    // Allow a retry later if loading failed entirely
    catalogPromise.catch(() => {
      catalogPromise = null;
    });
  }
  return catalogPromise;
};

/** Fills in product names, images, colours and sizes on admin orders (the order API only stores ids). */
export const useAdminOrderCatalog = () => {
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCatalog().then(c => {
      if (!cancelled) setCatalog(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return useCallback(
    (order: Order): Order => {
      if (!catalog) return order;
      return enrichOrder(order, (productId, variantId): OrderCatalogInfo | undefined => {
        const product = catalog.products.get(productId);
        const variant = variantId ? catalog.variants.get(variantId) : undefined;
        if (!product && !variant) return undefined;
        return {
          name: product?.name,
          image: variant?.image || product?.image,
          color: variant?.color,
          size: variant?.size,
        };
      });
    },
    [catalog]
  );
};
