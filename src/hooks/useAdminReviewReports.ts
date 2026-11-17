import { useCallback, useEffect, useMemo, useState } from 'react';
import { getReviewReports } from '../service/adminReviews';
import { isReviewRequestAborted, toReviewApiError } from '../service/reviewErrors';
import { nextReviewSeq } from './useReviewEntityStore';
import type { Stamped } from './useReviewEntityStore';
import type { ReportStatus, ReviewApiError, ReviewPagination, ReviewReport } from '../types/reviews';

// -----------------------------------------------------------------------------
// Single source of truth for the Reported Reviews page, with the same stamped
// ordering as useAdminReviewsList: the list page and each local decision write
// carry a sequence number, and a response requested before a write never
// overrides it, whatever page or filter the user moved to meanwhile.
// -----------------------------------------------------------------------------

interface ListResult {
  key: string;
  at: number;
  reports: ReviewReport[];
  pagination: ReviewPagination;
}

export interface AdminReviewReportsParams {
  page: number;
  limit: number;
  status?: ReportStatus;
}

export const useAdminReviewReports = ({ page, limit, status }: AdminReviewReportsParams) => {
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([page, limit, status ?? null, attempt]);
  const [result, setResult] = useState<ListResult | null>(null);
  const [error, setError] = useState<{ key: string; error: ReviewApiError } | null>(null);
  const [writes, setWrites] = useState<Record<string, Array<Stamped<Partial<ReviewReport>>>>>({});

  useEffect(() => {
    const controller = new AbortController();
    const at = nextReviewSeq();
    getReviewReports({ page, limit, status }, { signal: controller.signal })
      .then(data => setResult({ key, at, ...data }))
      .catch(err => {
        if (isReviewRequestAborted(err)) return;
        setError({ key, error: toReviewApiError(err, 'admin-read', 'Could not load reports.') });
      });
    return () => controller.abort();
  }, [page, limit, status, key]);

  const current = result?.key === key ? result : null;
  const currentError = error?.key === key ? error.error : null;

  /** Newest view of a report: the list row, then any writes applied after it was fetched */
  const resolve = useCallback(
    (report: ReviewReport, fetchedAt: number): ReviewReport =>
      (writes[report.id] || [])
        .filter(write => write.at > fetchedAt)
        .sort((a, b) => a.at - b.at)
        .reduce<ReviewReport>((acc, write) => ({ ...acc, ...write.value }), report),
    [writes]
  );

  // Rows as displayed: resolved, minus rows that left the current status filter
  const { rows, removedCount } = useMemo(() => {
    if (!current) return { rows: [] as ReviewReport[], removedCount: 0 };
    const visible: ReviewReport[] = [];
    let removed = 0;
    current.reports.forEach(report => {
      const view = resolve(report, current.at);
      if (status && view.status !== status) removed += 1;
      else visible.push(view);
    });
    return { rows: visible, removedCount: removed };
  }, [current, resolve, status]);

  const pagination = current
    ? { ...current.pagination, total: Math.max(0, current.pagination.total - removedCount) }
    : null;

  /** A report by id from the current page, resolved (used by the decision modal) */
  const findReport = useCallback(
    (id: string): ReviewReport | undefined => {
      const report = current?.reports.find(r => r.id === id);
      return report && current ? resolve(report, current.at) : undefined;
    },
    [current, resolve]
  );

  /** Apply a successful decision locally */
  const recordWrite = useCallback((id: string, patch: Partial<ReviewReport>) => {
    const at = nextReviewSeq();
    setWrites(prev => ({ ...prev, [id]: [...(prev[id] || []), { at, value: patch }] }));
  }, []);

  return {
    status: (current ? 'ready' : currentError ? 'error' : 'loading') as 'loading' | 'ready' | 'error',
    reports: rows,
    removedCount,
    pagination,
    error: currentError,
    reload: useCallback(() => setAttempt(a => a + 1), []),
    findReport,
    recordWrite,
  };
};
