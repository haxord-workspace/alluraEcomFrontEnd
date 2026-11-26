import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpDown, BarChart3, Edit3, Eye, Plus, RefreshCw, Search, ShieldCheck, Trash2, Truck, X } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useSupplierResource } from '../../hooks/useSupplierResource';
import { AdminPagination } from '../../components/admin/AdminPagination';
import { AdminErrorBanner } from '../../components/admin/AdminErrorBanner';
import { SupplierStatusBadge } from '../../components/admin/suppliers/SupplierStatusBadge';
import { useSupplierActions } from '../../hooks/useSupplierActions';
import { getSuppliers } from '../../service/adminSuppliers';
import { formatSupplierDate, isValidISODate, pluralize } from '../../utils/supplierFormat';
import {
  SUPPLIER_SORTS,
  SUPPLIER_SORT_LABELS,
  SUPPLIER_STATUSES,
  SUPPLIER_STATUS_LABELS,
  SUPPLIER_TYPES,
  SUPPLIER_TYPE_LABELS,
} from '../../types/suppliers';
import type {
  SupplierListItem,
  SupplierListParams,
  SupplierSort,
  SupplierStatus,
  SupplierType,
} from '../../types/suppliers';

const PAGE_SIZES = [10, 20, 50, 100] as const;
const DEFAULT_LIMIT = 20;
const DEFAULT_SORT: SupplierSort = 'newest';
const FILTER_KEYS = [
  'search',
  'status',
  'supplierType',
  'hasProducts',
  'minProducts',
  'maxProducts',
  'createdFrom',
  'createdTo',
] as const;

type Filters = Required<Pick<SupplierListParams, 'page' | 'limit' | 'sortBy'>> & SupplierListParams;

const readCount = (value: string | null): number | undefined => {
  if (value === null || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
};

// ── URL query string ⇄ filters ───────────────────────────────────────────────
const readFilters = (params: URLSearchParams): Filters => {
  const page = Number(params.get('page'));
  const limit = Number(params.get('limit'));
  const status = params.get('status')?.toUpperCase();
  const supplierType = params.get('supplierType')?.toUpperCase();
  const sortBy = params.get('sortBy');
  const hasProducts = params.get('hasProducts');
  const createdFrom = params.get('createdFrom');
  const createdTo = params.get('createdTo');
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: Number.isInteger(limit) && limit >= 1 && limit <= 100 ? limit : DEFAULT_LIMIT,
    sortBy: (SUPPLIER_SORTS as readonly string[]).includes(sortBy || '') ? (sortBy as SupplierSort) : DEFAULT_SORT,
    search: params.get('search')?.trim() || undefined,
    status: (SUPPLIER_STATUSES as readonly string[]).includes(status || '') ? (status as SupplierStatus) : undefined,
    supplierType: (SUPPLIER_TYPES as readonly string[]).includes(supplierType || '') ? (supplierType as SupplierType) : undefined,
    hasProducts: hasProducts === 'true' ? true : hasProducts === 'false' ? false : undefined,
    minProducts: readCount(params.get('minProducts')),
    maxProducts: readCount(params.get('maxProducts')),
    createdFrom: isValidISODate(createdFrom) ? createdFrom : undefined,
    createdTo: isValidISODate(createdTo) ? createdTo : undefined,
  };
};

const SELECT_CLASS =
  'px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-700 focus:outline-none focus:border-stone-800 cursor-pointer';
const INPUT_CLASS =
  'px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-800';

/** Admin › Suppliers › All suppliers */
export const AdminSuppliersPage: React.FC = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canCreate = can('supplier_management', 'create');
  const canEdit = can('supplier_management', 'edit');
  const canChangeStatus = can('supplier_management', 'publish');
  const canDelete = can('supplier_management', 'delete');
  const canViewAnalytics = can('supplier_management', 'view');

  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const key = JSON.stringify(filters);
  const list = useSupplierResource(key, signal => getSuppliers(filters, { signal }), 'Could not load suppliers');
  const { reload, mutate } = list;

  /** Any filter change resets to page 1; only `page` itself keeps it */
  const update = useCallback(
    (changes: Partial<Record<keyof Filters, string | number | boolean | undefined>>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(changes).forEach(([k, value]) => {
        if (value === undefined || value === '') next.delete(k);
        else next.set(k, String(value));
      });
      if (!('page' in changes)) next.delete('page');
      if (next.get('page') === '1') next.delete('page');
      if (next.get('limit') === String(DEFAULT_LIMIT)) next.delete('limit');
      if (next.get('sortBy') === DEFAULT_SORT) next.delete('sortBy');
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  // Debounced search box → URL
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '');
  const [lastUrlSearch, setLastUrlSearch] = useState(filters.search ?? '');
  if ((filters.search ?? '') !== lastUrlSearch) {
    // URL changed elsewhere (back button, clear filters): follow it
    setLastUrlSearch(filters.search ?? '');
    setSearchDraft(filters.search ?? '');
  }
  useEffect(() => {
    const trimmed = searchDraft.trim();
    if (trimmed === (filters.search ?? '')) return;
    const t = setTimeout(() => update({ search: trimmed || undefined }), 350);
    return () => clearTimeout(t);
  }, [searchDraft, filters.search, update]);

  const hasFilters = FILTER_KEYS.some(k => filters[k] !== undefined);
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    [...FILTER_KEYS, 'page'].forEach(k => next.delete(k));
    setSearchParams(next);
  };

  const actions = useSupplierActions({
    canChangeStatus,
    onStatusChanged: (id, result) =>
      mutate(prev => ({
        ...prev,
        data: prev.data.map(s => (s._id === id ? { ...s, status: result.supplier?.status ?? s.status } : s)),
      })),
    onDeleted: () => reload(),
    onViewProducts: id => navigate(`/admin/suppliers/${encodeURIComponent(id)}?tab=products`),
  });

  const rows = list.data?.data ?? [];
  const total = list.data?.meta.total ?? 0;
  const isForbidden = list.error?.status === 403;

  return (
    <div className="space-y-6 pb-12 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            Supplier management
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Suppliers{list.data ? ` (${total})` : ''}
          </h1>
          <p className="text-xs font-sans text-stone-500">
            The vendors, manufacturers and wholesalers your products come from.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reload}
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
            title="Refresh"
            aria-label="Refresh suppliers"
          >
            <RefreshCw size={15} className={list.status === 'loading' ? 'animate-spin' : ''} />
          </button>
          {canViewAnalytics && (
            <Link
              to="/admin/suppliers/analytics"
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-sans font-semibold transition-colors flex items-center gap-1.5"
            >
              <BarChart3 size={14} />
              <span>Supplier analytics</span>
            </Link>
          )}
          {canCreate && (
            <Link
              to="/admin/suppliers/new"
              className="px-4 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>Add supplier</span>
            </Link>
          )}
        </div>
      </div>

      {/* Toolbar & filters */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={searchDraft}
              onChange={e => setSearchDraft(e.target.value)}
              placeholder="Search name, code, company, contact, email or phone..."
              aria-label="Search suppliers"
              className={`w-full pl-9 pr-8 ${INPUT_CLASS}`}
            />
            {searchDraft && (
              <button
                type="button"
                onClick={() => setSearchDraft('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filters.status ?? ''}
              onChange={e => update({ status: e.target.value || undefined })}
              aria-label="Filter by status"
              className={SELECT_CLASS}
            >
              <option value="">Status: All</option>
              {SUPPLIER_STATUSES.map(s => (
                <option key={s} value={s}>
                  {SUPPLIER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={filters.supplierType ?? ''}
              onChange={e => update({ supplierType: e.target.value || undefined })}
              aria-label="Filter by supplier type"
              className={SELECT_CLASS}
            >
              <option value="">Type: All</option>
              {SUPPLIER_TYPES.map(t => (
                <option key={t} value={t}>
                  {SUPPLIER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 border border-stone-200 rounded-xl px-2.5 py-1.5 bg-stone-50 text-xs text-stone-700">
              <ArrowUpDown size={13} className="text-stone-400" aria-hidden="true" />
              <select
                value={filters.sortBy}
                onChange={e => update({ sortBy: e.target.value })}
                aria-label="Sort suppliers"
                className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
              >
                {SUPPLIER_SORTS.map(s => (
                  <option key={s} value={s}>
                    {SUPPLIER_SORT_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 pt-3 border-t border-stone-100 text-xs font-sans">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-stone-400">Products</span>
            <select
              value={filters.hasProducts === undefined ? '' : String(filters.hasProducts)}
              onChange={e => update({ hasProducts: e.target.value || undefined })}
              className={SELECT_CLASS}
            >
              <option value="">Any</option>
              <option value="true">Has products</option>
              <option value="false">No products</option>
            </select>
          </label>
          <ProductCountRange
            key={`${filters.minProducts ?? ''}|${filters.maxProducts ?? ''}`}
            min={filters.minProducts}
            max={filters.maxProducts}
            onApply={(minProducts, maxProducts) => update({ minProducts, maxProducts })}
          />
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-stone-400">Added from</span>
            <input
              type="date"
              value={filters.createdFrom ?? ''}
              max={filters.createdTo}
              onChange={e => update({ createdFrom: e.target.value || undefined })}
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-stone-400">Added to</span>
            <input
              type="date"
              value={filters.createdTo ?? ''}
              min={filters.createdFrom}
              onChange={e => update({ createdTo: e.target.value || undefined })}
              className={INPUT_CLASS}
            />
          </label>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="self-start sm:self-end py-2 font-bold text-allura-goldDark underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {list.status === 'error' ? (
        <div className="space-y-2">
          <AdminErrorBanner title={isForbidden ? 'Access denied' : 'Could not load suppliers'} error={list.error?.message} />
          {!isForbidden && (
            <button
              type="button"
              onClick={reload}
              className="min-h-10 px-4 rounded-xl border border-stone-200 bg-white text-xs font-sans font-bold text-stone-700 hover:bg-stone-50"
            >
              Retry
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          {list.status === 'loading' && !list.isRefetching ? (
            <TableSkeleton />
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-stone-500 text-xs font-sans space-y-3">
              <Truck size={24} className="mx-auto text-stone-300" />
              <p>{hasFilters ? 'No suppliers match these filters.' : 'No suppliers yet.'}</p>
              {hasFilters ? (
                <button type="button" onClick={clearFilters} className="font-bold text-allura-goldDark underline">
                  Clear filters
                </button>
              ) : (
                canCreate && (
                  <Link to="/admin/suppliers/new" className="font-bold text-allura-goldDark underline">
                    Add your first supplier
                  </Link>
                )
              )}
            </div>
          ) : (
            <div className={`overflow-x-auto transition-opacity ${list.isRefetching ? 'opacity-60' : ''}`} aria-busy={list.isRefetching}>
              <table className="w-full min-w-[960px] text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                    <th className="p-4">Code</th>
                    <th className="p-4">Supplier</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-right">Products</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Added</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.map(supplier => (
                    <SupplierRow
                      key={supplier._id}
                      supplier={supplier}
                      canEdit={canEdit}
                      canChangeStatus={canChangeStatus}
                      canDelete={canDelete}
                      isDeleting={actions.deletingId === supplier._id}
                      onOpen={() => navigate(`/admin/suppliers/${encodeURIComponent(supplier._id)}`)}
                      onStatus={() => actions.openStatus(supplier)}
                      onDelete={() => void actions.requestDelete(supplier)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {list.data && total > 0 && (
            <div className="border-t border-stone-200">
              <AdminPagination
                currentPage={filters.page}
                totalItems={total}
                pageSize={filters.limit}
                onPageChange={page => update({ page })}
                className="border-t-0"
              />
              <div className="flex items-center justify-end gap-2 px-4 pb-3 text-xs font-sans text-stone-500">
                <label htmlFor="admin-suppliers-page-size">Rows per page</label>
                <select
                  id="admin-suppliers-page-size"
                  value={filters.limit}
                  onChange={e => update({ limit: Number(e.target.value) })}
                  className="min-h-9 px-2 bg-white border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:border-stone-800"
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

      {actions.layer}
    </div>
  );
};

// ── Products min/max (applied on blur or Enter) ──────────────────────────────

const ProductCountRange: React.FC<{
  min?: number;
  max?: number;
  onApply: (min?: number, max?: number) => void;
}> = ({ min, max, onApply }) => {
  const [draftMin, setDraftMin] = useState(min === undefined ? '' : String(min));
  const [draftMax, setDraftMax] = useState(max === undefined ? '' : String(max));
  const apply = () => {
    const nextMin = readCount(draftMin);
    const nextMax = readCount(draftMax);
    if (nextMin === min && nextMax === max) return;
    // Swap a reversed range rather than sending one the API would reject
    if (nextMin !== undefined && nextMax !== undefined && nextMin > nextMax) onApply(nextMax, nextMin);
    else onApply(nextMin, nextMax);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') apply();
  };
  return (
    <div className="flex items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase text-stone-400">Min products</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={draftMin}
          onChange={e => setDraftMin(e.target.value)}
          onBlur={apply}
          onKeyDown={onKeyDown}
          className={`w-24 ${INPUT_CLASS}`}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase text-stone-400">Max products</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={draftMax}
          onChange={e => setDraftMax(e.target.value)}
          onBlur={apply}
          onKeyDown={onKeyDown}
          className={`w-24 ${INPUT_CLASS}`}
        />
      </label>
    </div>
  );
};

// ── Row ──────────────────────────────────────────────────────────────────────

const ICON_BTN = 'p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

const SupplierRow: React.FC<{
  supplier: SupplierListItem;
  canEdit: boolean;
  canChangeStatus: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  onOpen: () => void;
  onStatus: () => void;
  onDelete: () => void;
}> = ({ supplier, canEdit, canChangeStatus, canDelete, isDeleting, onOpen, onStatus, onDelete }) => {
  const hasProducts = supplier.productCount > 0;
  const deleteHint = hasProducts
    ? `Can't delete: ${pluralize(supplier.productCount, 'product')} still use this supplier. Move them or deactivate it instead.`
    : 'Delete supplier';
  return (
    <tr className="hover:bg-stone-50/70 transition-colors">
      <td className="p-4 font-mono text-[11px] text-stone-500 whitespace-nowrap">{supplier.supplierCode}</td>
      <td className="p-4">
        <Link
          to={`/admin/suppliers/${encodeURIComponent(supplier._id)}`}
          className="font-serif text-sm font-medium text-stone-900 hover:text-allura-goldDark hover:underline leading-tight"
        >
          {supplier.name}
        </Link>
        {supplier.companyName && <p className="text-[10px] text-stone-500 truncate max-w-[220px]" title={supplier.companyName}>{supplier.companyName}</p>}
      </td>
      <td className="p-4">
        <div className="space-y-0.5 max-w-[220px]">
          {supplier.contactPerson && <p className="text-stone-900 truncate" title={supplier.contactPerson}>{supplier.contactPerson}</p>}
          {supplier.phone && <p className="text-[10px] text-stone-500 font-mono">{supplier.phone}</p>}
          {supplier.email && <p className="text-[10px] text-stone-500 truncate" title={supplier.email}>{supplier.email}</p>}
          {!supplier.contactPerson && !supplier.phone && !supplier.email && <span className="text-stone-300">—</span>}
        </div>
      </td>
      <td className="p-4 text-stone-700">
        {supplier.supplierType ? SUPPLIER_TYPE_LABELS[supplier.supplierType] : <span className="text-stone-300">—</span>}
      </td>
      <td className="p-4 text-right font-semibold text-stone-900 tabular-nums">{supplier.productCount.toLocaleString('en-IN')}</td>
      <td className="p-4">
        <SupplierStatusBadge status={supplier.status} />
      </td>
      <td className="p-4 text-stone-500 whitespace-nowrap">{formatSupplierDate(supplier.createdAt) || '—'}</td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={onOpen}
            title="View supplier"
            aria-label={`View ${supplier.name}`}
            className={`${ICON_BTN} text-stone-400 hover:text-stone-800 hover:bg-stone-100`}
          >
            <Eye size={14} />
          </button>
          {canEdit && (
            <Link
              to={`/admin/suppliers/${encodeURIComponent(supplier._id)}/edit`}
              title="Edit supplier"
              aria-label={`Edit ${supplier.name}`}
              className={`${ICON_BTN} text-stone-400 hover:text-stone-800 hover:bg-stone-100`}
            >
              <Edit3 size={14} />
            </Link>
          )}
          {canChangeStatus && (
            <button
              type="button"
              onClick={onStatus}
              title="Change status"
              aria-label={`Change status of ${supplier.name}`}
              className={`${ICON_BTN} text-stone-400 hover:text-stone-800 hover:bg-stone-100`}
            >
              <ShieldCheck size={14} />
            </button>
          )}
          {canDelete && (
            // The wrapper keeps the tooltip working while the button is disabled
            <span title={deleteHint} className="inline-flex">
              <button
                type="button"
                onClick={onDelete}
                disabled={hasProducts || isDeleting}
                aria-label={hasProducts ? deleteHint : `Delete ${supplier.name}`}
                className={`${ICON_BTN} text-stone-400 hover:text-rose-700 hover:bg-rose-50`}
              >
                {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </span>
          )}
        </div>
      </td>
    </tr>
  );
};

const TableSkeleton: React.FC = () => (
  <div className="divide-y divide-stone-100" role="status" aria-label="Loading suppliers">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-center gap-6 p-4 animate-pulse" aria-hidden="true">
        <div className="h-3 w-16 bg-stone-200 rounded" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 w-40 bg-stone-200 rounded" />
          <div className="h-2.5 w-28 bg-stone-100 rounded" />
        </div>
        <div className="h-3 w-32 bg-stone-100 rounded hidden sm:block" />
        <div className="h-5 w-16 bg-stone-100 rounded-full" />
      </div>
    ))}
  </div>
);

export default AdminSuppliersPage;
