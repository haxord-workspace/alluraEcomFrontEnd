import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAdminCustomer } from '../service/customers';
import { useAdminProductOptions } from './useAdminProductOptions';
import type { AdminReview } from '../types/reviews';

// -----------------------------------------------------------------------------
// The admin review endpoints return productId / customerId as bare ids (confirmed
// against a real GET /admin/product-reviews response), with no names. This fills
// the gaps from EXISTING admin services, never by guessing:
//   - product name / image: the cached admin catalogue (getAdminProducts, unchanged)
//   - customer name / email: getAdminCustomer(id) (unchanged), once per id per session
// Values the backend did send always win; a failed lookup simply stays unknown.
// -----------------------------------------------------------------------------

interface CustomerInfo {
  name?: string;
  email?: string;
}

const MAX_PARALLEL = 4;
/** id → info (null = lookup failed; not retried this session) */
const customerCache = new Map<string, CustomerInfo | null>();
const inflight = new Set<string>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());

let queue: string[] = [];
let active = 0;

const pump = () => {
  while (active < MAX_PARALLEL && queue.length) {
    const id = queue.shift()!;
    active += 1;
    getAdminCustomer(id)
      .then(profile => {
        customerCache.set(id, { name: profile.name?.trim() || undefined, email: profile.email?.trim() || undefined });
      })
      .catch(() => customerCache.set(id, null))
      .finally(() => {
        inflight.delete(id);
        active -= 1;
        notify();
        pump();
      });
  }
};

const requestCustomers = (ids: string[]) => {
  ids.forEach(id => {
    if (!id || customerCache.has(id) || inflight.has(id)) return;
    inflight.add(id);
    queue.push(id);
  });
  pump();
};

/**
 * Returns `enrich(review)` (pure, safe during render) and `request(reviews)` (call
 * from effects / handlers: starts the lookups the given reviews need).
 */
export const useAdminReviewLookups = () => {
  const [version, setVersion] = useState(0);
  const [needCatalog, setNeedCatalog] = useState(false);
  const { options } = useAdminProductOptions(needCatalog);
  const products = useMemo(() => new Map(options.map(option => [option.id, option])), [options]);

  // Re-render when customer lookups finish
  useEffect(() => {
    const listener = () => setVersion(v => v + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const request = useCallback((reviews: Array<AdminReview | undefined>) => {
    const customerIds: string[] = [];
    let missingProduct = false;
    reviews.forEach(review => {
      if (!review) return;
      if (review.product.id && (!review.product.name || !review.product.image)) missingProduct = true;
      if (review.customer.id && !review.customer.name && !review.customer.email) customerIds.push(review.customer.id);
    });
    if (missingProduct) setNeedCatalog(true);
    if (customerIds.length) requestCustomers(customerIds);
  }, []);

  const enrich = useCallback(
    (review: AdminReview): AdminReview => {
      const product = review.product.id ? products.get(review.product.id) : undefined;
      const customer = review.customer.id ? customerCache.get(review.customer.id) : undefined;
      if (!product && !customer) return review;
      return {
        ...review,
        product: {
          ...review.product,
          name: review.product.name || product?.name,
          image: review.product.image || product?.image,
        },
        customer: {
          ...review.customer,
          name: review.customer.name || customer?.name,
          email: review.customer.email || customer?.email,
        },
      };
    },
    // `version` changes when the customer cache gains entries
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, version]
  );

  return { enrich, request };
};

export type AdminReviewLookups = ReturnType<typeof useAdminReviewLookups>;
