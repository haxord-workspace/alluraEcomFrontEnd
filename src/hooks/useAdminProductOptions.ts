import { useCallback, useEffect, useState } from 'react';
import { getAdminProducts } from '../service/adminProducts';

// -----------------------------------------------------------------------------
// Product options for the admin reviews product filter, from the EXISTING
// getAdminProducts() (unchanged). That service returns the whole catalogue and
// accepts no search / AbortSignal, so it is fetched once per session (shared
// promise) and searched client-side. Late results after unmount are ignored.
// -----------------------------------------------------------------------------

export interface AdminProductOption {
  id: string;
  name: string;
  sku?: string;
  image?: string;
}

let catalogPromise: Promise<AdminProductOption[]> | null = null;

const loadCatalog = (): Promise<AdminProductOption[]> => {
  if (!catalogPromise) {
    catalogPromise = getAdminProducts()
      .then(list =>
        list
          .filter(p => p && p.id)
          .map(p => ({
            id: String(p.id),
            name: p.name || 'Untitled product',
            sku: p.sku || undefined,
            image: p.images?.find(img => img.isPrimary)?.url || p.images?.[0]?.url,
          }))
      )
      .catch(error => {
        catalogPromise = null; // allow a retry
        throw error;
      });
  }
  return catalogPromise;
};

/** Loads the catalogue once `enabled` is true (picker opened, or a product is already selected). */
export const useAdminProductOptions = (enabled: boolean) => {
  const [options, setOptions] = useState<AdminProductOption[] | null>(null);
  const [failedAttempt, setFailedAttempt] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadCatalog()
      .then(list => {
        if (active) setOptions(list);
      })
      .catch(() => {
        if (active) setFailedAttempt(attempt);
      });
    return () => {
      active = false;
    };
  }, [enabled, attempt]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);
  const status: 'idle' | 'loading' | 'ready' | 'error' = options
    ? 'ready'
    : !enabled
      ? 'idle'
      : failedAttempt === attempt
        ? 'error'
        : 'loading';

  return { options: options ?? [], status, retry };
};
