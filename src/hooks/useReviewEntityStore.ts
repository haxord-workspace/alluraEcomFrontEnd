import { useCallback, useState } from 'react';
import type { AdminReview } from '../types/reviews';

// -----------------------------------------------------------------------------
// Stamped entity store for admin reviews (shared by the Reviews and Reports pages).
// Server snapshots and local writes each carry a sequence number taken when the
// request started / the write was applied. A review is resolved by applying its
// layers oldest → newest, so a response requested before a write can never
// override it.
// -----------------------------------------------------------------------------

let sequence = 0;
/** Stamp to take when a request starts (or a write is applied). */
export const nextReviewSeq = () => ++sequence;

export interface Stamped<T> {
  at: number;
  value: T;
}

const stripUndefined = <T extends object>(value: T): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;

/** Server snapshot merged over an older one, keeping values the newer one omits */
export const mergeServerReview = (base: AdminReview, next: AdminReview): AdminReview => ({
  ...base,
  ...stripUndefined(next),
  product: { ...base.product, ...stripUndefined(next.product) },
  customer: { ...base.customer, ...stripUndefined(next.customer) },
  order: { ...base.order, ...stripUndefined(next.order) },
  images: next.images.length ? next.images : base.images,
  history: next.history.length ? next.history : base.history,
  adminResponse: next.adminResponse ?? base.adminResponse,
});

export const useReviewEntityStore = () => {
  const [details, setDetails] = useState<Record<string, Stamped<AdminReview>>>({});
  // Each write is its own stamped layer (never re-stamped), so ordering stays exact
  const [writes, setWrites] = useState<Record<string, Array<Stamped<Partial<AdminReview>>>>>({});

  /** Newest view of one review; `base` is a list row (or remembered copy) and when it was fetched */
  const resolve = useCallback(
    (id: string, base?: AdminReview, baseAt = 0): AdminReview | undefined => {
      const layers: Array<{ at: number; apply: (acc: AdminReview | undefined) => AdminReview | undefined }> = [];
      if (base) layers.push({ at: baseAt, apply: acc => (acc ? mergeServerReview(acc, base) : base) });
      const detail = details[id];
      if (detail) layers.push({ at: detail.at, apply: acc => (acc ? mergeServerReview(acc, detail.value) : detail.value) });
      (writes[id] || []).forEach(write => {
        layers.push({ at: write.at, apply: acc => (acc ? { ...acc, ...write.value } : acc) });
      });
      return layers.sort((a, b) => a.at - b.at).reduce<AdminReview | undefined>((acc, layer) => layer.apply(acc), undefined);
    },
    [details, writes]
  );

  /** Record a server snapshot. `at` = stamp taken when the request started. */
  const recordDetail = useCallback((review: AdminReview, at: number) => {
    setDetails(prev => (prev[review.id] && prev[review.id].at > at ? prev : { ...prev, [review.id]: { at, value: review } }));
  }, []);

  /** Apply a successful local write (status, rejection reason, seller response…) */
  const recordWrite = useCallback((id: string, patch: Partial<AdminReview>) => {
    const at = nextReviewSeq();
    setWrites(prev => ({ ...prev, [id]: [...(prev[id] || []), { at, value: patch }] }));
  }, []);

  /**
   * Drop the cached detail and local writes of a review that changed elsewhere
   * (e.g. hidden through a report decision). The next fetch of it is the source of truth.
   */
  const invalidate = useCallback((id: string) => {
    const drop = <T,>(prev: Record<string, T>) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    };
    setDetails(drop);
    setWrites(drop);
  }, []);

  return { resolve, recordDetail, recordWrite, invalidate };
};

export type ReviewEntityStore = ReturnType<typeof useReviewEntityStore>;
