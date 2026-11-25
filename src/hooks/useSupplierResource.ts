import { useCallback, useEffect, useState } from 'react';
import { isRequestAborted, toSupplierApiError } from '../service/adminSuppliers';
import type { SupplierApiError } from '../types/suppliers';

export type ResourceStatus = 'loading' | 'ready' | 'error';

interface ResourceState<T> {
  key: string;
  data?: T;
  error?: SupplierApiError;
}

/**
 * Loads one supplier API resource and reloads it whenever `key` changes.
 * The request is aborted when the key changes or the component unmounts, and a
 * stale response never overwrites a newer one. The previous data is kept while
 * a reload is in flight (`isRefetching`) so tables don't flash empty.
 */
export const useSupplierResource = <T,>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  fallbackMessage: string,
  enabled = true
) => {
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${key}#${attempt}`;
  const [state, setState] = useState<ResourceState<T> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetcher(controller.signal)
      .then(data => setState({ key: requestKey, data }))
      .catch(err => {
        if (isRequestAborted(err)) return;
        setState({ key: requestKey, error: toSupplierApiError(err, fallbackMessage) });
      });
    return () => controller.abort();
    // `fetcher` is recreated every render; `requestKey` captures everything it depends on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, enabled]);

  const isCurrent = state?.key === requestKey;
  const status: ResourceStatus = !isCurrent ? 'loading' : state?.error ? 'error' : 'ready';

  const reload = useCallback(() => setAttempt(a => a + 1), []);
  /** Replace the loaded data locally (after a successful write) */
  const mutate = useCallback(
    (update: (prev: T) => T) =>
      setState(prev => (prev && prev.data !== undefined ? { ...prev, data: update(prev.data) } : prev)),
    []
  );

  return {
    status,
    data: state?.data,
    error: isCurrent ? state?.error : undefined,
    isRefetching: !isCurrent && state?.data !== undefined,
    reload,
    mutate,
  };
};
