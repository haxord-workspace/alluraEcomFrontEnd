import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowDown, ArrowUp, BarChart3, Loader2, RefreshCw, Search, X } from 'lucide-react';
import axios from 'axios';
import { usePermissions } from '../../hooks/usePermissions';
import { useSupplierResource } from '../../hooks/useSupplierResource';
import { useShop } from '../../context/ShopContext';
import {
  getSupplierAnalyticsOverview,
  getSupplierPerformance,
  getSupplierTopRankings,
  refreshSupplierAnalytics,
  toSupplierApiError,
} from '../../service/adminSuppliers';
import { AdminErrorBanner } from '../../components/admin/AdminErrorBanner';
import { AdminPagination } from '../../components/admin/AdminPagination';
import { InfoTip, SupplierStatusBadge } from '../../components/admin/suppliers/SupplierStatusBadge';
import { SupplierBreadcrumb } from '../../components/admin/suppliers/SupplierPageChrome';
import {
  SUPPLIER_METRIC_INFO,
  formatCount,
  formatMetricValue,
  formatPercent,
  isValidISODate,
  isoDaysAgo,
  pluralize,
} from '../../utils/supplierFormat';
import {
  SUPPLIER_METRIC_FIELD,
  SUPPLIER_READY_METRICS,
  SUPPLIER_STATUSES,
  SUPPLIER_STATUS_LABELS,
  SUPPLIER_TYPES,
  SUPPLIER_TYPE_LABELS,
  SUPPLIER_UNTRACKED_METRICS,
} from '../../types/suppliers';
import type {
  AnalyticsDateRange,
  SortOrder,
  SupplierAnalyticsOverview,
  SupplierMetric,
  SupplierPerformanceParams,
  SupplierRanking,
  SupplierReadyMetric,
  SupplierStatus,
  SupplierType,
} from '../../types/suppliers';

const REFRESH_DELAY_MS = 4000;
const PERF_LIMIT = 20;
const PERF_PAGE_SIZES = [10, 20, 50, 100] as const;
const ALL_METRICS: SupplierMetric[] = [...SUPPLIER_READY_METRICS, ...SUPPLIER_UNTRACKED_METRICS];

interface Preset {
  key: string;
  label: string;
  range: () => AnalyticsDateRange;
}

const PRESETS: Preset[] = [
  { key: '7', label: 'Last 7 days', range: () => ({ startDate: isoDaysAgo(6), endDate: isoDaysAgo(0) }) },
  { key: '30', label: 'Last 30 days', range: () => ({ startDate: isoDaysAgo(29), endDate: isoDaysAgo(0) }) },
  { key: '90', label: 'Last 90 days', range: () => ({ startDate: isoDaysAgo(89), endDate: isoDaysAgo(0) }) },
  { key: 'all', label: 'All time', range: () => ({}) },
];

const STATUS_BAR: Record<SupplierStatus, string> = {
  ACTIVE: 'bg-emerald-600',
  INACTIVE: 'bg-stone-400',
  BLOCKED: 'bg-rose-600',
};

/** Admin › Suppliers › Supplier analytics (/admin/suppliers/analytics) */
export const AdminSupplierAnalyticsPage: React.FC = () => {
  const { can } = usePermissions();
  const { showToast } = useShop();
  const canRefresh = can('supplier_management', 'edit');
  const canViewProducts = can('products_catalog', 'view');
  const [searchParams, setSearchParams] = useSearchParams();

  const startParam = searchParams.get('startDate');
  const endParam = searchParams.get('endDate');
  // Invalid or reversed URL values are ignored rather than sent
  const range = useMemo<AnalyticsDateRange>(() => {
    const startDate = isValidISODate(startParam) ? startParam : undefined;
    const endDate = isValidISODate(endParam) ? endParam : undefined;
    return startDate && endDate && startDate > endDate ? {} : { startDate, endDate };
  }, [startParam, endParam]);
  const rangeKey = `${range.startDate ?? ''}|${range.endDate ?? ''}`;

  const overview = useSupplierResource('overview', signal => getSupplierAnalyticsOverview({ signal }), 'Could not load the overview');
  const top = useSupplierResource(
    `top:${rangeKey}`,
    signal => getSupplierTopRankings({ ...range, limit: 10 }, { signal }),
    'Could not load top suppliers'
  );

  const setParams = useCallback(
    (changes: Record<string, string | number | undefined>, resetPerfPage = true) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(changes).forEach(([k, v]) => {
        if (v === undefined || v === '') next.delete(k);
        else next.set(k, String(v));
      });
      if (resetPerfPage && !('ppage' in changes)) next.delete('ppage');
      if (next.get('ppage') === '1') next.delete('ppage');
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const applyRange = (next: AnalyticsDateRange) => setParams({ startDate: next.startDate, endDate: next.endDate });
  const activePreset = PRESETS.find(p => {
    const r = p.range();
    return r.startDate === range.startDate && r.endDate === range.endDate;
  })?.key;

  // ── Refresh (POST → 202, then reload after a few seconds) ──
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);
  const { reload: reloadOverview } = overview;
  const { reload: reloadTop } = top;
  const reloadAll = useCallback(() => {
    reloadOverview();
    reloadTop();
    setRefreshNonce(n => n + 1);
  }, [reloadOverview, reloadTop]);

  const startRefresh = async () => {
    setIsRecalculating(true);
    try {
      await refreshSupplierAnalytics();
      showToast('Recalculating supplier numbers. This takes a few seconds.', 'info');
      timerRef.current = setTimeout(() => {
        reloadAll();
        setIsRecalculating(false);
        showToast('Supplier analytics updated', 'success');
      }, REFRESH_DELAY_MS);
    } catch (err) {
      setIsRecalculating(false);
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      showToast(
        status === 503 ? "Couldn't start the refresh. Try again shortly." : toSupplierApiError(err, "Couldn't start the refresh.").message,
        'error'
      );
    }
  };

  const forbidden = overview.error?.status === 403 || top.error?.status === 403;

  return (
    <div className="space-y-6 pb-12 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <SupplierBreadcrumb items={[{ label: 'Suppliers', to: '/admin/suppliers' }, { label: 'Analytics' }]} />
          <h1 className="font-serif text-3xl text-stone-900 font-normal">Supplier Analytics</h1>
          <p className="text-xs font-sans text-stone-500">
            {range.startDate || range.endDate
              ? `Sales from ${range.startDate ?? 'the beginning'} to ${range.endDate ?? 'today'}`
              : 'Sales for all time'}
            . Numbers are cached for up to 5 minutes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={reloadAll}
            disabled={isRecalculating}
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-50"
            title="Reload"
            aria-label="Reload analytics"
          >
            <RefreshCw size={15} className={overview.status === 'loading' ? 'animate-spin' : ''} />
          </button>
          {canRefresh && (
            <button
              type="button"
              onClick={() => void startRefresh()}
              disabled={isRecalculating}
              className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-xl border border-stone-200 bg-white text-xs font-sans font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
              title="Recalculate every supplier's numbers now"
            >
              {isRecalculating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              <span>{isRecalculating ? 'Recalculating…' : 'Refresh numbers'}</span>
            </button>
          )}
        </div>
      </div>

      {forbidden && <AdminErrorBanner title="Access denied" error="You don't have access to suppliers." />}

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
                className={`min-h-10 px-4 rounded-full text-xs font-sans font-semibold whitespace-nowrap transition-colors ${
                  active ? 'bg-[#561C08] text-white shadow-xs' : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <CustomRangeForm key={rangeKey} range={range} onApply={applyRange} />
        <p className="text-[11px] text-stone-500 font-sans">
          The date range only changes sales numbers (revenue, units sold). Stock and product counts are always current.
        </p>
      </div>

      {/* Overview */}
      {overview.status === 'error' && !forbidden ? (
        <RetryError title="Could not load the overview" message={overview.error?.message} onRetry={overview.reload} />
      ) : overview.status === 'loading' && !overview.data ? (
        <TilesSkeleton />
      ) : overview.data ? (
        <OverviewSection data={overview.data} canViewProducts={canViewProducts} />
      ) : null}

      {/* Top suppliers */}
      <section className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 min-w-0">
        <h2 className="font-serif text-xl font-normal text-stone-900">Top suppliers</h2>
        {top.status === 'error' && !forbidden ? (
          <RetryError title="Could not load top suppliers" message={top.error?.message} onRetry={top.reload} />
        ) : top.status === 'loading' && !top.data ? (
          <div className="h-48 bg-stone-50 rounded-xl animate-pulse" aria-label="Loading rankings" role="status" />
        ) : (
          <RankingTabs
            rankings={top.data ?? []}
            metric={(ALL_METRICS as string[]).includes(searchParams.get('metric') || '') ? (searchParams.get('metric') as SupplierMetric) : 'sales_revenue'}
            onMetric={m => setParams({ metric: m === 'sales_revenue' ? undefined : m }, false)}
            dimmed={top.isRefetching}
          />
        )}
      </section>

      {/* Performance */}
      <PerformanceSection range={range} rangeKey={rangeKey} refreshNonce={refreshNonce} setParams={setParams} />
    </div>
  );
};

// ── Overview ─────────────────────────────────────────────────────────────────

const OverviewSection: React.FC<{ data: SupplierAnalyticsOverview; canViewProducts: boolean }> = ({ data, canViewProducts }) => {
  const tiles: { key: string; label: string; value: number; dot?: string; hint?: string }[] = [
    { key: 'total', label: 'Total suppliers', value: data.totalSuppliers },
    { key: 'active', label: 'Active', value: data.activeSuppliers, dot: STATUS_BAR.ACTIVE },
    { key: 'inactive', label: 'Inactive', value: data.inactiveSuppliers, dot: STATUS_BAR.INACTIVE },
    { key: 'blocked', label: 'Blocked', value: data.blockedSuppliers, dot: STATUS_BAR.BLOCKED },
    { key: 'with', label: 'With products', value: data.suppliersWithProducts, hint: `${formatCount(data.suppliersWithoutProducts)} without` },
    { key: 'linked', label: 'Products linked', value: data.totalProductsAssociated },
  ];
  // percentage comes from the API (against totalSuppliers, 2 decimals); never recalculated here
  const dist = data.distributionByStatus;

  return (
    <div className="space-y-6">
      {data.productsWithoutSupplier > 0 && (
        <div role="status" className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-sans flex flex-wrap items-center gap-3">
          <AlertTriangle size={16} className="text-amber-700 flex-shrink-0" />
          <p className="flex-1 min-w-[200px]">
            <span className="font-semibold">{pluralize(data.productsWithoutSupplier, 'product')}</span>{' '}
            {data.productsWithoutSupplier === 1 ? 'is' : 'are'} missing a supplier.
          </p>
          {canViewProducts && (
            <Link to="/admin/products?supplier=none" className="font-bold text-amber-900 underline">
              Review products
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4 content-start">
          {tiles.map(tile => (
            <div key={tile.key} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1 min-w-0">
              <span className="flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase text-stone-400">
                {tile.dot && <span className={`w-2 h-2 rounded-full ${tile.dot}`} aria-hidden="true" />}
                <span className="truncate">{tile.label}</span>
              </span>
              <p className="font-serif text-2xl font-bold text-[#561C08]">{formatCount(tile.value)}</p>
              {tile.hint && <p className="text-[11px] text-stone-500 font-sans">{tile.hint}</p>}
            </div>
          ))}
        </div>
        <section className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 min-w-0">
          <h2 className="font-serif text-xl font-normal text-stone-900">Suppliers by status</h2>
          {dist.length === 0 ? (
            <p className="py-6 text-center text-xs font-sans text-stone-400">No suppliers yet.</p>
          ) : (
            <ul className="space-y-2.5 text-xs font-sans" aria-label="Suppliers by status">
              {dist.map(item => {
                const pct = formatPercent(item.percentage);
                const label = SUPPLIER_STATUS_LABELS[item.status] ?? item.status;
                return (
                  <li key={item.status} className="grid grid-cols-[4.5rem_1fr_6.5rem] items-center gap-3" aria-label={`${label}: ${item.count}, ${pct}`}>
                    <span className="font-semibold text-stone-700">{label}</span>
                    <span className="h-2.5 rounded-full bg-stone-100 overflow-hidden" aria-hidden="true">
                      <span
                        className={`block h-full rounded-full ${STATUS_BAR[item.status] ?? 'bg-stone-400'}`}
                        style={{ width: `${Math.min(100, Math.max(0, item.percentage || 0))}%` }}
                      />
                    </span>
                    <span className="text-right text-stone-500 tabular-nums whitespace-nowrap">
                      {formatCount(item.count)} <span className="text-stone-400">({pct})</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

// ── Rankings ─────────────────────────────────────────────────────────────────

const RankingTabs: React.FC<{
  rankings: SupplierRanking[];
  metric: SupplierMetric;
  onMetric: (m: SupplierMetric) => void;
  dimmed: boolean;
}> = ({ rankings, metric, onMetric, dimmed }) => {
  const byMetric = new Map(rankings.map(r => [r.metric, r]));
  const current = byMetric.get(metric);
  const isUntracked = (SUPPLIER_UNTRACKED_METRICS as readonly string[]).includes(metric) || current?.available === false;
  const rows = current?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Ranking metric">
        {ALL_METRICS.map(m => {
          const active = m === metric;
          const untracked = (SUPPLIER_UNTRACKED_METRICS as readonly string[]).includes(m);
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onMetric(m)}
              className={`min-h-10 px-4 rounded-full text-xs font-sans font-semibold whitespace-nowrap transition-colors ${
                active
                  ? 'bg-[#561C08] text-white shadow-xs'
                  : `bg-white border border-stone-200 hover:text-stone-900 ${untracked ? 'text-stone-400' : 'text-stone-600'}`
              }`}
            >
              {SUPPLIER_METRIC_INFO[m].label}
              {/* The gross-revenue label already carries its own brackets; values are shown in ₹ */}
              {SUPPLIER_METRIC_INFO[m].currency && m !== 'sales_revenue' ? ' (₹)' : ''}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className={`transition-opacity ${dimmed ? 'opacity-60' : ''}`}>
        {current?.definition && (
          <p className="flex items-center gap-1.5 text-[11px] text-stone-500 font-sans mb-3">
            <InfoTip text={current.definition} label="How this is calculated" />
            <span>{metric === 'inventory_value' ? 'Stock on hand × cost price. This is not purchase spend.' : current.definition}</span>
          </p>
        )}
        {isUntracked ? (
          <div className="py-10 text-center space-y-1 text-xs font-sans">
            <p className="font-semibold text-stone-700">Not tracked yet</p>
            <p className="text-stone-500">Purchases from suppliers aren't recorded in Allura yet, so there's nothing to rank.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-xs font-sans text-stone-400 space-y-2">
            <BarChart3 size={22} className="mx-auto text-stone-300" />
            <p>No supplier has a value for this metric in this period.</p>
          </div>
        ) : (
          <RankList rows={rows} metric={metric} />
        )}
      </div>
    </div>
  );
};

const RankList: React.FC<{ rows: NonNullable<SupplierRanking['data']>; metric: SupplierMetric }> = ({ rows, metric }) => {
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <ol className="divide-y divide-stone-100 text-xs font-sans">
      {rows.map(row => (
        <li key={row.supplierId} className="grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_minmax(0,1fr)_10rem_auto] items-center gap-3 py-2.5 min-h-11">
          <span className="text-center font-serif font-bold text-stone-400">{row.rank}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                to={`/admin/suppliers/${encodeURIComponent(row.supplierId)}`}
                title={row.name}
                className="truncate font-medium text-stone-900 hover:text-allura-goldDark hover:underline"
              >
                {row.name}
              </Link>
              {row.status !== 'ACTIVE' && <SupplierStatusBadge status={row.status} />}
            </div>
            <span
              className="block truncate text-[10px] text-stone-400"
              title={row.companyName ? `${row.supplierCode} · ${row.companyName}` : undefined}
            >
              <span className="font-mono">{row.supplierCode}</span>
              {row.companyName && ` · ${row.companyName}`}
            </span>
          </div>
          <span className="hidden sm:block h-2 rounded-full bg-stone-100 overflow-hidden" aria-hidden="true">
            <span className="block h-full bg-[#561C08] rounded-full" style={{ width: `${Math.round((row.value / max) * 100)}%` }} />
          </span>
          <span className="text-right font-semibold text-stone-900 tabular-nums whitespace-nowrap">{formatMetricValue(metric, row.value)}</span>
        </li>
      ))}
    </ol>
  );
};

// ── Performance table ────────────────────────────────────────────────────────

const PerformanceSection: React.FC<{
  range: AnalyticsDateRange;
  rangeKey: string;
  refreshNonce: number;
  setParams: (changes: Record<string, string | number | undefined>, resetPerfPage?: boolean) => void;
}> = ({ range, rangeKey, refreshNonce, setParams }) => {
  const [searchParams] = useSearchParams();
  const sortParam = searchParams.get('psort');
  const sortBy: SupplierReadyMetric = (SUPPLIER_READY_METRICS as readonly string[]).includes(sortParam || '')
    ? (sortParam as SupplierReadyMetric)
    : 'sales_revenue';
  const sortOrder: SortOrder = searchParams.get('porder') === 'asc' ? 'asc' : 'desc';
  const statusParam = searchParams.get('pstatus');
  const status = (SUPPLIER_STATUSES as readonly string[]).includes(statusParam || '') ? (statusParam as SupplierStatus) : undefined;
  const typeParam = searchParams.get('ptype');
  const supplierType = (SUPPLIER_TYPES as readonly string[]).includes(typeParam || '') ? (typeParam as SupplierType) : undefined;
  const search = searchParams.get('pq')?.trim() || undefined;
  const pageNum = Number(searchParams.get('ppage'));
  const page = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;
  const limitNum = Number(searchParams.get('plimit'));
  const limit = (PERF_PAGE_SIZES as readonly number[]).includes(limitNum) ? limitNum : PERF_LIMIT;

  // page and limit always go to the API as query params (limit 1–100, default 20)
  const params: SupplierPerformanceParams = { ...range, sortBy, sortOrder, status, supplierType, search, page, limit };
  const perf = useSupplierResource(
    `perf:${rangeKey}:${JSON.stringify(params)}:${refreshNonce}`,
    signal => getSupplierPerformance(params, { signal }),
    'Could not load supplier performance'
  );

  const [draft, setDraft] = useState(search ?? '');
  useEffect(() => {
    if (draft.trim() === (search ?? '')) return;
    const t = setTimeout(() => setParams({ pq: draft.trim() || undefined }), 350);
    return () => clearTimeout(t);
  }, [draft, search, setParams]);

  const definitions = perf.data?.definitions ?? {};
  const definitionFor = (m: SupplierReadyMetric) => definitions[m] ?? definitions[SUPPLIER_METRIC_FIELD[m]];
  const sortOn = (m: SupplierReadyMetric) => {
    if (m === sortBy) setParams({ porder: sortOrder === 'desc' ? 'asc' : undefined });
    else setParams({ psort: m === 'sales_revenue' ? undefined : m, porder: undefined });
  };
  const rows = perf.data?.data ?? [];
  const total = perf.data?.meta.total ?? 0;
  const hasFilters = !!(status || supplierType || search);

  return (
    <section className="bg-white border border-stone-200 rounded-2xl shadow-xs min-w-0 overflow-hidden">
      <div className="p-5 sm:p-6 space-y-4">
        <h2 className="font-serif text-xl font-normal text-stone-900">Supplier performance</h2>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Search suppliers..."
              aria-label="Search supplier performance"
              className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-800"
            />
            {draft && (
              <button
                type="button"
                onClick={() => setDraft('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <select
            value={status ?? ''}
            onChange={e => setParams({ pstatus: e.target.value || undefined })}
            aria-label="Filter by status"
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-700 focus:outline-none cursor-pointer"
          >
            <option value="">Status: All</option>
            {SUPPLIER_STATUSES.map(s => (
              <option key={s} value={s}>
                {SUPPLIER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={supplierType ?? ''}
            onChange={e => setParams({ ptype: e.target.value || undefined })}
            aria-label="Filter by supplier type"
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-700 focus:outline-none cursor-pointer"
          >
            <option value="">Type: All</option>
            {SUPPLIER_TYPES.map(t => (
              <option key={t} value={t}>
                {SUPPLIER_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setDraft('');
                setParams({ pq: undefined, pstatus: undefined, ptype: undefined });
              }}
              className="self-start sm:self-auto text-xs font-sans font-bold text-allura-goldDark underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {perf.status === 'error' ? (
        <div className="px-5 pb-5">
          <RetryError title="Could not load supplier performance" message={perf.error?.message} onRetry={perf.reload} />
        </div>
      ) : perf.status === 'loading' && !perf.isRefetching ? (
        <div className="px-5 pb-5">
          <div className="h-48 bg-stone-50 rounded-xl animate-pulse" role="status" aria-label="Loading performance" />
        </div>
      ) : rows.length === 0 ? (
        <p className="px-5 pb-8 text-center text-xs font-sans text-stone-400">
          {hasFilters ? 'No suppliers match these filters.' : 'No suppliers yet.'}
        </p>
      ) : (
        <div className={`overflow-x-auto border-t border-stone-200 transition-opacity ${perf.isRefetching ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[960px] text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Supplier</th>
                <th className="p-4">Status</th>
                {SUPPLIER_READY_METRICS.map(m => {
                  const active = m === sortBy;
                  return (
                    <th key={m} className="p-4 text-right" aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <span className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => sortOn(m)}
                          title={SUPPLIER_METRIC_INFO[m].label}
                          className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-stone-900 ${active ? 'text-stone-900 font-bold' : ''}`}
                        >
                          {SUPPLIER_METRIC_INFO[m].shortLabel ?? SUPPLIER_METRIC_INFO[m].label}
                          {active && (sortOrder === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                        </button>
                        <InfoTip text={definitionFor(m)} label={SUPPLIER_METRIC_INFO[m].label} />
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map(row => (
                <tr key={row.supplierId} className="hover:bg-stone-50/70 transition-colors">
                  <td className="p-4 max-w-[240px]">
                    <Link
                      to={`/admin/suppliers/${encodeURIComponent(row.supplierId)}`}
                      title={row.name}
                      className="block truncate font-medium text-stone-900 hover:text-allura-goldDark hover:underline"
                    >
                      {row.name}
                    </Link>
                    <p className="text-[10px] text-stone-400 truncate" title={row.companyName ? `${row.supplierCode} · ${row.companyName}` : undefined}>
                      <span className="font-mono">{row.supplierCode}</span>
                      {row.companyName && ` · ${row.companyName}`}
                    </p>
                  </td>
                  <td className="p-4">
                    <SupplierStatusBadge status={row.status} />
                  </td>
                  {SUPPLIER_READY_METRICS.map(m => {
                    const value = row.metrics[SUPPLIER_METRIC_FIELD[m]];
                    return (
                      <td key={m} className={`p-4 text-right tabular-nums whitespace-nowrap ${m === sortBy ? 'font-bold text-stone-900' : 'text-stone-700'}`}>
                        {formatMetricValue(m, typeof value === 'number' ? value : null)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Page numbers when totalPages > 1; "Showing all N entries" otherwise (AdminPagination) */}
      {perf.data && total > 0 && (
        <div className="border-t border-stone-200">
          <AdminPagination
            currentPage={page}
            totalItems={total}
            pageSize={limit}
            onPageChange={p => setParams({ ppage: p })}
            className="border-t-0"
          />
          <div className="flex items-center justify-end gap-2 px-4 pb-3 text-xs font-sans text-stone-500">
            <label htmlFor="supplier-perf-page-size">Rows per page</label>
            <select
              id="supplier-perf-page-size"
              value={limit}
              onChange={e => setParams({ plimit: Number(e.target.value) === PERF_LIMIT ? undefined : Number(e.target.value) })}
              className="min-h-9 px-2 bg-white border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:border-stone-800"
            >
              {PERF_PAGE_SIZES.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </section>
  );
};

// ── Small pieces ─────────────────────────────────────────────────────────────

const RetryError: React.FC<{ title: string; message?: string; onRetry: () => void }> = ({ title, message, onRetry }) => (
  <div className="space-y-2">
    <AdminErrorBanner title={title} error={message || 'Something went wrong.'} />
    <button
      type="button"
      onClick={onRetry}
      className="min-h-10 px-4 rounded-xl border border-stone-200 bg-white text-xs font-sans font-bold text-stone-700 hover:bg-stone-50"
    >
      Retry
    </button>
  </div>
);

const TilesSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4" role="status" aria-label="Loading overview">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2 animate-pulse" aria-hidden="true">
        <div className="h-2.5 w-16 bg-stone-200 rounded" />
        <div className="h-6 w-12 bg-stone-100 rounded" />
      </div>
    ))}
  </div>
);

const CustomRangeForm: React.FC<{ range: AnalyticsDateRange; onApply: (range: AnalyticsDateRange) => void }> = ({ range, onApply }) => {
  const [from, setFrom] = useState(range.startDate ?? '');
  const [to, setTo] = useState(range.endDate ?? '');
  const [error, setError] = useState('');
  const fromId = useId();
  const toId = useId();
  const errorId = useId();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (from && !isValidISODate(from)) return setError('Enter a valid start date.');
    if (to && !isValidISODate(to)) return setError('Enter a valid end date.');
    if (from && to && from > to) return setError('The start date must be on or before the end date.');
    setError('');
    onApply({ startDate: from || undefined, endDate: to || undefined });
  };

  const inputClass = `min-h-10 px-3 bg-white border rounded-xl text-xs font-sans text-stone-900 focus:outline-none ${
    error ? 'border-rose-400' : 'border-stone-200 focus:border-stone-800'
  }`;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 text-xs font-sans">
      <label htmlFor={fromId} className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase text-stone-400">From</span>
        <input id={fromId} type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} className={inputClass} />
      </label>
      <label htmlFor={toId} className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase text-stone-400">To</span>
        <input id={toId} type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} className={inputClass} />
      </label>
      <button type="submit" className="min-h-10 px-5 rounded-xl bg-[#561C08] hover:bg-[#561C08]/90 text-white text-xs font-sans font-bold">
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

export default AdminSupplierAnalyticsPage;
