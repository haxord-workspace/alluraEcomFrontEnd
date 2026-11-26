import React, { useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, RefreshCw } from 'lucide-react';
import { AdminErrorBanner } from '../../components/admin/AdminErrorBanner';
import {
  AnalyticsCard,
  AnalyticsSummaryTiles,
  ProductRankList,
  RatingDistributionBars,
  ReviewTrendChart,
} from '../../components/admin/reviews/ReviewAnalyticsCharts';
import { ReconcileRatingsCard } from '../../components/admin/reviews/ReconcileRatingsCard';
import { useReviewAnalytics } from '../../hooks/useReviewAnalytics';

// ── Dates (local calendar days, YYYY-MM-DD as the API expects) ──────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isValidDate = (value: string | null | undefined): value is string =>
  !!value && ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));

const pad = (n: number) => String(n).padStart(2, '0');
const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toISODate(d);
};

interface Preset {
  key: string;
  label: string;
  range: () => { from?: string; to?: string };
}

const PRESETS: Preset[] = [
  { key: '7', label: 'Last 7 days', range: () => ({ from: daysAgo(6), to: daysAgo(0) }) },
  { key: '30', label: 'Last 30 days', range: () => ({ from: daysAgo(29), to: daysAgo(0) }) },
  { key: '90', label: 'Last 90 days', range: () => ({ from: daysAgo(89), to: daysAgo(0) }) },
  { key: 'all', label: 'All time', range: () => ({}) },
];

const forbiddenMessage = "You don't have permission to view review analytics.";

/** Admin › Reviews › Analytics. Lazy-loaded route. */
const AdminReviewAnalyticsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  // Invalid or reversed URL values are ignored rather than sent
  const range = useMemo(() => {
    const from = isValidDate(fromParam) ? fromParam : undefined;
    const to = isValidDate(toParam) ? toParam : undefined;
    return from && to && from > to ? {} : { from, to };
  }, [fromParam, toParam]);

  const analytics = useReviewAnalytics(range);
  const data = analytics.data;
  const isForbidden = analytics.error?.kind === 'forbidden';

  const applyRange = (next: { from?: string; to?: string }) => {
    const params = new URLSearchParams(searchParams);
    if (next.from) params.set('from', next.from);
    else params.delete('from');
    if (next.to) params.set('to', next.to);
    else params.delete('to');
    setSearchParams(params);
  };

  const activePreset = PRESETS.find(p => {
    const r = p.range();
    return (r.from ?? undefined) === range.from && (r.to ?? undefined) === range.to;
  })?.key;

  return (
    <div className="space-y-6 pb-12 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            Customer voice & moderation
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">Review Analytics</h1>
          <p className="text-xs font-sans text-stone-500">
            {range.from || range.to ? `${range.from ?? 'Beginning'} to ${range.to ?? 'today'}` : 'All time'}
          </p>
        </div>
        <button
          type="button"
          onClick={analytics.reload}
          disabled={analytics.status === 'loading'}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl border border-stone-200 bg-white text-xs font-sans font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={analytics.status === 'loading' ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Range controls */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Date range presets">
          {PRESETS.map(preset => {
            const active = activePreset === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyRange(preset.range())}
                aria-pressed={active}
                className={`min-h-11 px-4 rounded-full text-xs font-sans font-semibold whitespace-nowrap transition-colors ${
                  active ? 'bg-[#561C08] text-white shadow-xs' : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        {/* Remounts when the URL range changes, so the inputs always start from it */}
        <CustomRangeForm key={`${range.from ?? ''}|${range.to ?? ''}`} from={range.from} to={range.to} onApply={applyRange} />
      </div>

      {/* Content */}
      {analytics.status === 'loading' ? (
        <AnalyticsSkeleton />
      ) : analytics.status === 'error' ? (
        <div className="space-y-2">
          <AdminErrorBanner
            title={isForbidden ? 'Access denied' : 'Could not load analytics'}
            error={isForbidden ? forbiddenMessage : analytics.error?.message}
          />
          {!isForbidden && (
            <button
              type="button"
              onClick={analytics.reload}
              className="min-h-11 px-4 rounded-xl border border-stone-200 bg-white text-xs font-sans font-bold text-stone-700 hover:bg-stone-50"
            >
              Retry
            </button>
          )}
        </div>
      ) : !data || data.isEmpty ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center space-y-2 shadow-xs">
          <BarChart3 size={24} className="mx-auto text-stone-300" />
          <p className="text-sm font-sans text-stone-600">No analytics available for this period.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <AnalyticsSummaryTiles data={data} />

          {(data.trend || data.distribution) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {data.trend && (
                <AnalyticsCard title="Reviews over time" className={data.distribution ? 'lg:col-span-2' : 'lg:col-span-3'}>
                  <ReviewTrendChart points={data.trend} />
                </AnalyticsCard>
              )}
              {data.distribution && (
                <AnalyticsCard title="Rating distribution" className={data.trend ? '' : 'lg:col-span-3'}>
                  <RatingDistributionBars distribution={data.distribution} />
                </AnalyticsCard>
              )}
            </div>
          )}

          {(data.topProducts || data.bottomProducts) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.topProducts && (
                <AnalyticsCard title="Top rated products">
                  <ProductRankList products={data.topProducts} />
                </AnalyticsCard>
              )}
              {data.bottomProducts && (
                <AnalyticsCard title="Lowest rated products" subtitle="Worth a look for quality or sizing issues.">
                  <ProductRankList products={data.bottomProducts} />
                </AnalyticsCard>
              )}
            </div>
          )}
        </div>
      )}

      <ReconcileRatingsCard />
    </div>
  );
};

// ── Custom range ─────────────────────────────────────────────────────────────

const CustomRangeForm: React.FC<{ from?: string; to?: string; onApply: (range: { from?: string; to?: string }) => void }> = ({
  from,
  to,
  onApply,
}) => {
  const [draftFrom, setDraftFrom] = useState(from ?? '');
  const [draftTo, setDraftTo] = useState(to ?? '');
  const [error, setError] = useState('');
  const fromId = useId();
  const toId = useId();
  const errorId = useId();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draftFrom && !isValidDate(draftFrom)) return setError('Enter a valid start date.');
    if (draftTo && !isValidDate(draftTo)) return setError('Enter a valid end date.');
    if (draftFrom && draftTo && draftFrom > draftTo) return setError('The start date must be on or before the end date.');
    setError('');
    onApply({ from: draftFrom || undefined, to: draftTo || undefined });
  };

  const inputClass = `min-h-11 px-3 bg-white border rounded-xl text-xs font-sans text-stone-900 focus:outline-none ${
    error ? 'border-rose-400' : 'border-stone-200 focus:border-stone-800'
  }`;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 text-xs font-sans">
      <label htmlFor={fromId} className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase text-stone-400">From</span>
        <input
          id={fromId}
          type="date"
          value={draftFrom}
          max={draftTo || undefined}
          onChange={e => setDraftFrom(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={inputClass}
        />
      </label>
      <label htmlFor={toId} className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase text-stone-400">To</span>
        <input
          id={toId}
          type="date"
          value={draftTo}
          min={draftFrom || undefined}
          onChange={e => setDraftTo(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        className="min-h-11 px-5 rounded-xl bg-[#561C08] hover:bg-[#561C08]/90 text-white text-xs font-sans font-bold"
      >
        Apply range
      </button>
      {error && (
        <p id={errorId} role="alert" className="text-rose-700 font-medium sm:basis-full">
          {error}
        </p>
      )}
    </form>
  );
};

const AnalyticsSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-label="Loading analytics">
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" aria-hidden="true">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2 animate-pulse">
          <div className="h-2.5 w-16 bg-stone-200 rounded" />
          <div className="h-6 w-12 bg-stone-100 rounded" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" aria-hidden="true">
      <div className="lg:col-span-2 h-64 bg-white border border-stone-200 rounded-2xl animate-pulse" />
      <div className="h-64 bg-white border border-stone-200 rounded-2xl animate-pulse" />
    </div>
  </div>
);

export default AdminReviewAnalyticsPage;
