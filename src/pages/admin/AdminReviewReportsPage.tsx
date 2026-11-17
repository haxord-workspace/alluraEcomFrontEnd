import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Flag, Gavel, RefreshCw } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { AdminPagination } from '../../components/admin/AdminPagination';
import { AdminErrorBanner } from '../../components/admin/AdminErrorBanner';
import { StarRatingDisplay } from '../../components/reviews/StarRating';
import { ReportStatusBadge } from '../../components/admin/reviews/ReportStatusBadge';
import { ReportDecisionModal } from '../../components/admin/reviews/ReportDecisionModal';
import { useAdminReviewReports } from '../../hooks/useAdminReviewReports';
import { useReviewEntityStore } from '../../hooks/useReviewEntityStore';
import { useReviewModeration } from '../../hooks/useReviewModeration';
import { useAdminReviewLookups } from '../../hooks/useAdminReviewLookups';
import { ASSUMED_REPORT_DECISION_STATUS } from '../../service/reviewMappers';
import { formatReviewDate } from '../../utils/reviewFormat';
import { REPORT_REASON_LABELS, REPORT_STATUSES, REPORT_STATUS_LABELS } from '../../types/reviews';
import type { ReportDecision, ReportModerationAction, ReportStatus, ReviewReport } from '../../types/reviews';

const PAGE_SIZES = [10, 20, 50] as const;
const DEFAULT_LIMIT = 20;
const DEFAULT_STATUS: ReportStatus = 'PENDING';
/** URL value for "no status filter" (absent `status` means the Pending default) */
const ALL = 'all';

interface Filters {
  page: number;
  limit: number;
  /** undefined = All */
  status?: ReportStatus;
}

const readFilters = (params: URLSearchParams): Filters => {
  const page = Number(params.get('page'));
  const limit = Number(params.get('limit'));
  const raw = params.get('status');
  const upper = raw?.toUpperCase() || '';
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: (PAGE_SIZES as readonly number[]).includes(limit) ? limit : DEFAULT_LIMIT,
    status:
      raw === null
        ? DEFAULT_STATUS
        : raw.toLowerCase() === ALL
          ? undefined
          : (REPORT_STATUSES as readonly string[]).includes(upper)
            ? (upper as ReportStatus)
            : DEFAULT_STATUS,
  };
};

const forbiddenMessage = "You don't have permission to manage reports.";

const reasonLabel = (report: ReviewReport) =>
  report.reason ? REPORT_REASON_LABELS[report.reason] : report.reasonRaw ? report.reasonRaw.replace(/_/g, ' ').toLowerCase() : undefined;

/** Admin › Reviews › Reported Reviews. Lazy-loaded route. */
const AdminReviewReportsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const list = useAdminReviewReports(filters);
  const { showToast } = useShop();
  const { reload, recordWrite, findReport } = list;

  // Embedded reviews carry bare product / customer ids: fill names from existing admin services
  const lookups = useAdminReviewLookups();
  const { enrich, request } = lookups;
  const rows = useMemo(
    () => list.reports.map(report => (report.review ? { ...report, review: enrich(report.review) } : report)),
    [list.reports, enrich]
  );
  useEffect(() => {
    request(list.reports.map(report => report.review));
  }, [list.reports, request]);

  // Reviews opened from a report use the same drawer + moderation as the Reviews page
  const reviewStore = useReviewEntityStore();
  const moderation = useReviewModeration({ store: reviewStore, lookups });
  const { openDrawer, refreshOpen } = moderation;
  const { invalidate } = reviewStore;

  const [decidingId, setDecidingId] = useState<string | null>(null);
  const decidingReport = decidingId ? findReport(decidingId) : undefined;

  const update = useCallback(
    (changes: Partial<Record<keyof Filters, string | number | undefined>>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === undefined || value === '') next.delete(key);
        else next.set(key, String(value));
      });
      if (!('page' in changes)) next.delete('page');
      if (next.get('page') === '1') next.delete('page');
      if (next.get('limit') === String(DEFAULT_LIMIT)) next.delete('limit');
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const setStatus = (status: ReportStatus | undefined) =>
    update({ status: status === DEFAULT_STATUS ? undefined : status ? status.toLowerCase() : ALL });

  const hasFilters = filters.status !== DEFAULT_STATUS;
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    ['status', 'page'].forEach(key => next.delete(key));
    setSearchParams(next);
  };

  const onDecided = useCallback(
    (report: ReviewReport, decision: ReportDecision, moderationAction: ReportModerationAction) => {
      recordWrite(report.id, { status: ASSUMED_REPORT_DECISION_STATUS[decision], decision, moderationAction });
      if (moderationAction === 'HIDE_REVIEW' && report.reviewId) {
        // The review changed outside its own store: drop cached detail, re-fetch if open
        invalidate(report.reviewId);
        refreshOpen(report.reviewId);
      }
      showToast(
        decision === 'DISMISSED'
          ? 'Report dismissed.'
          : moderationAction === 'HIDE_REVIEW'
            ? 'Report marked as reviewed and the review is hidden.'
            : 'Report marked as reviewed.',
        'success'
      );
    },
    [recordWrite, invalidate, refreshOpen, showToast]
  );

  // A decision emptied this page (rows left the status filter): step back, or pull the next items
  const pageEmptied = list.status === 'ready' && list.reports.length === 0 && list.removedCount > 0;
  useEffect(() => {
    if (!pageEmptied) return;
    if (filters.page > 1) {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(filters.page - 1));
      if (next.get('page') === '1') next.delete('page');
      setSearchParams(next, { replace: true });
    } else {
      reload();
    }
  }, [pageEmptied, filters.page, searchParams, setSearchParams, reload]);

  const total = list.pagination?.total ?? 0;
  const isForbidden = list.error?.kind === 'forbidden';
  // Columns appear only when the response provides that information
  const showReporter = list.reports.some(r => r.reporter.name || r.reporter.email);
  const showDate = list.reports.some(r => r.createdAt);

  const onViewReview = useCallback(
    (report: ReviewReport) => {
      if (report.reviewId) openDrawer(report.reviewId, report.review, 0);
    },
    [openDrawer]
  );
  const onDecide = useCallback((report: ReviewReport) => setDecidingId(report.id), []);

  return (
    <div className="space-y-6 pb-12 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            Customer voice & moderation
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Reported Reviews{list.status === 'ready' ? ` (${total})` : ''}
          </h1>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={list.status === 'loading'}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl border border-stone-200 bg-white text-xs font-sans font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={list.status === 'loading' ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 max-w-full" role="group" aria-label="Filter by report status">
          {[undefined, ...REPORT_STATUSES].map(status => {
            const active = filters.status === status;
            return (
              <button
                key={status ?? 'ALL'}
                type="button"
                onClick={() => setStatus(status)}
                aria-pressed={active}
                className={`min-h-11 px-4 rounded-full text-xs font-sans font-semibold whitespace-nowrap transition-colors ${
                  active ? 'bg-[#561C08] text-white shadow-xs' : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
                }`}
              >
                {status ? REPORT_STATUS_LABELS[status] : 'All'}
              </button>
            );
          })}
        </div>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className="min-h-11 text-xs font-sans font-bold text-allura-goldDark underline">
            Clear filters
          </button>
        )}
      </div>

      {list.status === 'error' && (
        <div className="space-y-2">
          <AdminErrorBanner
            title={isForbidden ? 'Access denied' : 'Could not load reports'}
            error={isForbidden ? forbiddenMessage : list.error?.message}
          />
          {!isForbidden && (
            <button type="button" onClick={reload} className="min-h-11 px-4 rounded-xl border border-stone-200 bg-white text-xs font-sans font-bold text-stone-700 hover:bg-stone-50">
              Retry
            </button>
          )}
        </div>
      )}

      {list.status !== 'error' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          {list.status === 'loading' ? (
            <ListSkeleton />
          ) : list.reports.length === 0 ? (
            <div className="p-10 text-center text-stone-400 text-xs font-sans space-y-2">
              <p>
                {filters.status === 'PENDING'
                  ? 'No pending reports. Nothing needs your attention.'
                  : filters.status
                    ? `No ${REPORT_STATUS_LABELS[filters.status].toLowerCase()} reports.`
                    : 'No reports yet.'}
              </p>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="min-h-11 font-bold text-allura-goldDark underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                      <th className="p-4 w-[32%]">Reported review</th>
                      <th className="p-4">Reason</th>
                      {showReporter && <th className="p-4">Reporter</th>}
                      {showDate && <th className="p-4">Reported</th>}
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {rows.map(report => (
                      <ReportRow
                        key={report.id}
                        report={report}
                        showReporter={showReporter}
                        showDate={showDate}
                        onViewReview={onViewReview}
                        onDecide={onDecide}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="md:hidden divide-y divide-stone-100">
                {rows.map(report => (
                  <ReportCard key={report.id} report={report} onViewReview={onViewReview} onDecide={onDecide} />
                ))}
              </ul>
            </>
          )}

          {list.status === 'ready' && total > 0 && (
            <div className="border-t border-stone-200">
              <AdminPagination
                currentPage={filters.page}
                totalItems={total}
                pageSize={filters.limit}
                onPageChange={page => update({ page })}
                className="border-t-0"
              />
              <div className="flex items-center justify-end gap-2 px-4 pb-3 text-xs font-sans text-stone-500">
                <label htmlFor="admin-reports-page-size">Rows per page</label>
                <select
                  id="admin-reports-page-size"
                  value={filters.limit}
                  onChange={e => update({ limit: Number(e.target.value) })}
                  className="min-h-11 px-2 bg-white border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:border-stone-800"
                >
                  {PAGE_SIZES.map(size => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {moderation.layer}

      {decidingReport && (
        <ReportDecisionModal
          key={`decide-${decidingReport.id}`}
          report={decidingReport}
          onClose={() => setDecidingId(null)}
          onDecided={(decision, moderationAction) => onDecided(decidingReport, decision, moderationAction)}
        />
      )}
    </div>
  );
};

// ── Cells & rows ─────────────────────────────────────────────────────────────

const ReviewCell: React.FC<{ report: ReviewReport }> = ({ report }) => {
  const review = report.review;
  if (!review) {
    // Minimal row: the response did not embed the review
    return (
      <p className="text-stone-400 italic">
        {report.reviewId ? `Review details not included (#${report.reviewId.slice(-6)})` : 'No review linked'}
      </p>
    );
  }
  return (
    <div className="space-y-1 min-w-0">
      {review.product.name && <p className="text-[10px] uppercase tracking-wider text-stone-400 truncate">{review.product.name}</p>}
      <StarRatingDisplay rating={review.rating} size={12} />
      {review.title && <p className="font-semibold text-stone-900 line-clamp-1 break-words">{review.title}</p>}
      {review.comment && <p className="text-stone-500 line-clamp-2 break-words">{review.comment}</p>}
    </div>
  );
};

const ReasonCell: React.FC<{ report: ReviewReport }> = ({ report }) => {
  const label = reasonLabel(report);
  return (
    <div className="space-y-1 min-w-0">
      {label ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold capitalize">
          <Flag size={11} /> {label}
        </span>
      ) : (
        <span className="text-stone-400">—</span>
      )}
      {report.description && <p className="text-stone-600 line-clamp-3 break-words whitespace-pre-line">“{report.description}”</p>}
    </div>
  );
};

const StatusCell: React.FC<{ report: ReviewReport }> = ({ report }) => (
  <div className="space-y-1">
    <ReportStatusBadge status={report.status} />
    {/* Read-only result for decided reports */}
    {report.status !== 'PENDING' && report.moderationAction === 'HIDE_REVIEW' && (
      <p className="text-[10px] font-semibold text-rose-700">Review hidden</p>
    )}
    {report.status !== 'PENDING' && report.decidedAt && (
      <p className="text-[10px] text-stone-400">{formatReviewDate(report.decidedAt)}</p>
    )}
  </div>
);

interface RowProps {
  report: ReviewReport;
  onViewReview: (report: ReviewReport) => void;
  onDecide: (report: ReviewReport) => void;
}

const ActionButtons: React.FC<RowProps & { size: 'sm' | 'lg' }> = ({ report, onViewReview, onDecide, size }) => {
  const height = size === 'lg' ? 'min-h-11 px-4' : 'min-h-9 px-3';
  return (
    <>
      {report.reviewId && (
        <button
          type="button"
          onClick={() => onViewReview(report)}
          className={`inline-flex items-center gap-1.5 ${height} rounded-lg border border-stone-200 bg-white text-stone-700 font-semibold hover:bg-stone-100`}
        >
          <Eye size={13} />
          <span>View review</span>
        </button>
      )}
      {report.status === 'PENDING' && (
        <button
          type="button"
          onClick={() => onDecide(report)}
          className={`inline-flex items-center gap-1.5 ${height} rounded-lg bg-[#561C08] hover:bg-[#561C08]/90 text-white font-semibold`}
        >
          <Gavel size={13} />
          <span>Resolve</span>
        </button>
      )}
    </>
  );
};

const ReportRow: React.FC<RowProps & { showReporter: boolean; showDate: boolean }> = memo(
  ({ report, showReporter, showDate, onViewReview, onDecide }) => (
    <tr className="hover:bg-stone-50/70 transition-colors align-top">
      <td className="p-4">
        <ReviewCell report={report} />
      </td>
      <td className="p-4 max-w-[240px]">
        <ReasonCell report={report} />
      </td>
      {showReporter && (
        <td className="p-4 max-w-[180px]">
          {report.reporter.name && <p className="text-stone-900 break-words">{report.reporter.name}</p>}
          {report.reporter.email && <p className="text-stone-400 break-all">{report.reporter.email}</p>}
          {!report.reporter.name && !report.reporter.email && <span className="text-stone-400">—</span>}
        </td>
      )}
      {showDate && <td className="p-4 whitespace-nowrap text-stone-500">{formatReviewDate(report.createdAt) || '—'}</td>}
      <td className="p-4">
        <StatusCell report={report} />
      </td>
      <td className="p-4 text-right">
        <div className="inline-flex flex-wrap justify-end gap-1.5">
          <ActionButtons report={report} onViewReview={onViewReview} onDecide={onDecide} size="sm" />
        </div>
      </td>
    </tr>
  )
);
ReportRow.displayName = 'ReportRow';

const ReportCard: React.FC<RowProps> = memo(({ report, onViewReview, onDecide }) => (
  <li className="p-4 space-y-3 text-xs font-sans">
    <div className="flex items-start justify-between gap-3">
      <ReasonCell report={report} />
      <div className="flex-shrink-0">
        <StatusCell report={report} />
      </div>
    </div>
    <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
      <ReviewCell report={report} />
    </div>
    {(report.reporter.name || report.createdAt) && (
      <p className="text-[11px] text-stone-500">
        {[report.reporter.name && `Reported by ${report.reporter.name}`, formatReviewDate(report.createdAt)].filter(Boolean).join(' · ')}
      </p>
    )}
    {(report.reviewId || report.status === 'PENDING') && (
      <div className="flex flex-wrap gap-2">
        <ActionButtons report={report} onViewReview={onViewReview} onDecide={onDecide} size="lg" />
      </div>
    )}
  </li>
));
ReportCard.displayName = 'ReportCard';

const ListSkeleton: React.FC = () => (
  <div className="divide-y divide-stone-100" role="status" aria-label="Loading reports">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="p-4 flex items-start gap-4 animate-pulse" aria-hidden="true">
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/4 bg-stone-200 rounded" />
          <div className="h-3 w-2/3 bg-stone-100 rounded" />
          <div className="h-3 w-1/2 bg-stone-100 rounded" />
        </div>
        <div className="h-5 w-20 bg-stone-100 rounded-full" />
      </div>
    ))}
  </div>
);

export default AdminReviewReportsPage;
