import React, { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { StarRatingDisplay } from '../../reviews/StarRating';
import { REVIEW_RATINGS, REVIEW_STATUSES, REVIEW_STATUS_LABELS } from '../../../types/reviews';
import type { AnalyticsProduct, AnalyticsTrendPoint, ReviewAnalytics, ReviewRatingDistribution } from '../../../types/reviews';

// Hand-built charts (Tailwind + inline SVG), in the style of AdminDashboardPage.
// Each component renders only data that exists; callers skip absent sections.

const fmt = (n: number) => n.toLocaleString('en-IN');

export const AnalyticsCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; className?: string }> = ({
  title,
  subtitle,
  children,
  className = '',
}) => (
  <section className={`bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 min-w-0 ${className}`}>
    <div>
      <h2 className="font-serif text-xl font-normal text-stone-900">{title}</h2>
      {subtitle && <p className="text-xs font-sans text-stone-500">{subtitle}</p>}
    </div>
    {children}
  </section>
);

// ── Summary tiles ────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  PENDING: 'bg-blue-500',
  APPROVED: 'bg-emerald-600',
  REJECTED: 'bg-rose-600',
  HIDDEN: 'bg-stone-400',
};

interface Tile {
  key: string;
  label: string;
  value: string;
  hint?: string;
  dot?: string;
}

/** KPI tiles for whichever metrics the response provided */
export const AnalyticsSummaryTiles: React.FC<{ data: ReviewAnalytics }> = ({ data }) => {
  const tiles: Tile[] = [];
  if (data.totalReviews !== undefined) tiles.push({ key: 'total', label: 'Total reviews', value: fmt(data.totalReviews) });
  if (data.averageRating !== undefined)
    tiles.push({ key: 'avg', label: 'Average rating', value: `${data.averageRating.toFixed(2)} / 5` });
  REVIEW_STATUSES.forEach(status => {
    const count = data.statusCounts?.[status];
    if (count !== undefined) {
      // Status is named in text; the dot is only a secondary cue
      tiles.push({ key: status, label: REVIEW_STATUS_LABELS[status], value: fmt(count), dot: STATUS_DOT[status] });
    }
  });
  if (data.reportedCount !== undefined) tiles.push({ key: 'reported', label: 'Reported', value: fmt(data.reportedCount) });
  if (data.verifiedPercentage !== undefined)
    tiles.push({ key: 'verified', label: 'Verified purchases', value: `${Math.round(data.verifiedPercentage)}%` });
  if (data.withImagesCount !== undefined) tiles.push({ key: 'images', label: 'With photos', value: fmt(data.withImagesCount) });

  if (tiles.length === 0) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {tiles.map(tile => (
        <div key={tile.key} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1 min-w-0">
          <span className="flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase text-stone-400">
            {tile.dot && <span className={`w-2 h-2 rounded-full ${tile.dot}`} aria-hidden="true" />}
            <span className="truncate">{tile.label}</span>
          </span>
          <p className="font-serif text-2xl font-bold text-[#561C08] break-words">{tile.value}</p>
        </div>
      ))}
    </div>
  );
};

// ── Rating distribution (horizontal bars) ────────────────────────────────────

export const RatingDistributionBars: React.FC<{ distribution: ReviewRatingDistribution }> = ({ distribution }) => {
  const total = REVIEW_RATINGS.reduce((sum, star) => sum + distribution[star], 0);
  return (
    <ul className="space-y-2.5 text-xs font-sans" aria-label="Rating distribution">
      {REVIEW_RATINGS.map(star => {
        const count = distribution[star];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <li key={star} className="grid grid-cols-[3rem_1fr_4.5rem] items-center gap-3" aria-label={`${star} stars: ${count} reviews, ${pct}%`}>
            <span className="font-semibold text-stone-700">{star} ★</span>
            <span className="h-2.5 rounded-full bg-stone-100 overflow-hidden" aria-hidden="true">
              <span className="block h-full bg-[#561C08] rounded-full" style={{ width: `${pct}%` }} />
            </span>
            <span className="text-right text-stone-500 tabular-nums">
              {fmt(count)} <span className="text-stone-400">({pct}%)</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
};

// ── Ranked products ──────────────────────────────────────────────────────────

export const ProductRankList: React.FC<{ products: AnalyticsProduct[] }> = ({ products }) => (
  <ol className="divide-y divide-stone-100 text-xs font-sans">
    {products.map((product, idx) => {
      const name = product.name || (product.id ? `Product #${product.id.slice(-6)}` : 'Unknown product');
      return (
        <li key={`${product.id ?? product.name}-${idx}`} className="flex items-center gap-3 py-2.5 min-h-11">
          <span className="w-6 text-center font-serif font-bold text-stone-400 flex-shrink-0">{idx + 1}</span>
          <div className="flex-1 min-w-0">
            {product.id ? (
              <Link
                to={`/admin/products/${encodeURIComponent(product.id)}/edit`}
                className="block truncate font-medium text-stone-900 hover:text-allura-goldDark hover:underline"
              >
                {name}
              </Link>
            ) : (
              <span className={`block truncate ${product.name ? 'text-stone-900 font-medium' : 'text-stone-400 italic'}`}>{name}</span>
            )}
            {product.reviewCount !== undefined && (
              <span className="text-[10px] text-stone-400">
                {fmt(product.reviewCount)} review{product.reviewCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {product.averageRating !== undefined && (
            <span className="flex items-center gap-1.5 flex-shrink-0">
              <StarRatingDisplay rating={product.averageRating} size={11} />
              <span className="font-semibold text-stone-800 tabular-nums">{product.averageRating.toFixed(1)}</span>
            </span>
          )}
        </li>
      );
    })}
  </ol>
);

// ── Trend (bars for count, SVG line for average rating) ──────────────────────

const shortLabel = (label: string) => {
  const time = Date.parse(label);
  if (/^\d{4}-\d{2}(-\d{2})?/.test(label) && !Number.isNaN(time)) {
    return new Intl.DateTimeFormat('en-IN', label.length > 7 ? { day: 'numeric', month: 'short' } : { month: 'short', year: '2-digit' }).format(
      new Date(time)
    );
  }
  return label;
};

export const ReviewTrendChart: React.FC<{ points: AnalyticsTrendPoint[] }> = ({ points }) => {
  const [showTable, setShowTable] = useState(false);
  const summaryId = useId();
  const tableId = useId();
  const maxCount = Math.max(1, ...points.map(p => p.count));
  const total = points.reduce((sum, p) => sum + p.count, 0);
  const peak = points.reduce((best, p) => (p.count > best.count ? p : best), points[0]);
  const hasAverage = points.some(p => p.averageRating !== undefined);
  const n = points.length;
  // Show at most ~6 axis labels so they never overlap on small screens
  const labelEvery = Math.max(1, Math.ceil(n / 6));

  const linePoints = points
    .map((p, i) => (p.averageRating === undefined ? null : `${((i + 0.5) / n) * 100},${100 - (Math.min(5, Math.max(0, p.averageRating)) / 5) * 100}`))
    .filter(Boolean)
    .join(' ');

  return (
    <figure className="space-y-3" aria-describedby={summaryId}>
      <div className="flex flex-wrap items-center gap-4 text-[11px] font-sans text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#561C08]" aria-hidden="true" /> Reviews per period (bars)
        </span>
        {hasAverage && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0 border-t-2 border-dashed border-amber-500" aria-hidden="true" /> Average rating, 0–5 (dashed line)
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {/* Y axis (HTML so it stays readable at any width) */}
        <div className="flex flex-col justify-between h-48 text-[10px] font-sans text-stone-400 text-right w-8 flex-shrink-0" aria-hidden="true">
          <span>{fmt(maxCount)}</span>
          <span>{fmt(Math.round(maxCount / 2))}</span>
          <span>0</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="relative h-48 border-b border-l border-stone-200" aria-hidden="true">
            {/* Gaps only for short series, so long ones still fit a 360px screen */}
            <div className="absolute inset-0 flex items-end px-0.5" style={{ columnGap: n > 40 ? 0 : 2 }}>
              {points.map((p, i) => (
                <div key={`${p.label}-${i}`} className="flex-1 h-full flex items-end group min-w-0" title={`${p.label}: ${p.count}`}>
                  <div
                    className="w-full bg-[#561C08] group-hover:bg-allura-gold transition-colors rounded-t-sm"
                    style={{ height: `${p.count > 0 ? Math.max(2, (p.count / maxCount) * 100) : 0}%` }}
                  />
                </div>
              ))}
            </div>
            {hasAverage && linePoints && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline
                  points={linePoints}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
          </div>
          <div className="flex text-[10px] font-sans text-stone-400 mt-1" aria-hidden="true">
            {points.map((p, i) => (
              <span key={`${p.label}-${i}`} className="flex-1 min-w-0 text-center truncate">
                {i % labelEvery === 0 || i === n - 1 ? shortLabel(p.label) : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      <figcaption id={summaryId} className="text-xs font-sans text-stone-600">
        {fmt(total)} reviews across {n} period{n === 1 ? '' : 's'} ({points[0].label} to {points[n - 1].label}). Busiest:{' '}
        {peak.label} with {fmt(peak.count)}.
      </figcaption>

      <button
        type="button"
        onClick={() => setShowTable(v => !v)}
        aria-expanded={showTable}
        aria-controls={tableId}
        className="min-h-11 text-xs font-sans font-bold text-allura-goldDark underline"
      >
        {showTable ? 'Hide data table' : 'Show data table'}
      </button>
      {showTable && (
        <div id={tableId} className="max-h-72 overflow-auto border border-stone-200 rounded-xl">
          <table className="w-full text-left text-xs font-sans">
            <caption className="sr-only">Reviews over time</caption>
            <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500 sticky top-0">
              <tr>
                <th scope="col" className="p-2.5">Period</th>
                <th scope="col" className="p-2.5 text-right">Reviews</th>
                {hasAverage && <th scope="col" className="p-2.5 text-right">Avg rating</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {points.map((p, i) => (
                <tr key={`${p.label}-${i}`}>
                  <td className="p-2.5 text-stone-700">{p.label}</td>
                  <td className="p-2.5 text-right tabular-nums">{fmt(p.count)}</td>
                  {hasAverage && <td className="p-2.5 text-right tabular-nums">{p.averageRating !== undefined ? p.averageRating.toFixed(2) : '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
};
