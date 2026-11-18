import React, { useCallback, useEffect, useState } from 'react';
import { Search, Eye, MessageCircle, Sparkles, UserCheck, Users, ShoppingBag, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAdminCustomers, getAdminCustomerStats, customerErrorMessage } from '../../service/customers';
import type { CustomerProfile } from '../../types';
import type { AdminCustomerStats, AdminCustomerSortBy, AdminCustomerSortOrder } from '../../types/customer';

const PAGE_SIZE = 10;

type SortValue = `${AdminCustomerSortBy}:${AdminCustomerSortOrder}`;

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: 'createdAt:desc', label: 'Patron Since (Newest)' },
  { value: 'createdAt:asc', label: 'Patron Since (Oldest)' },
  { value: 'lifetimeSpend:desc', label: 'Lifetime Spend (High to Low)' },
  { value: 'lifetimeSpend:asc', label: 'Lifetime Spend (Low to High)' },
  { value: 'ordersCount:desc', label: 'Orders Count (High to Low)' },
  { value: 'ordersCount:asc', label: 'Orders Count (Low to High)' },
];
const DEFAULT_SORT: SortValue = 'createdAt:desc';

export const AdminCustomersPage: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortValue>(DEFAULT_SORT);
  const [page, setPage] = useState(1);

  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminCustomerStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Search is sent to the server; wait until typing pauses
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Stats load once on page load
  useEffect(() => {
    getAdminCustomerStats()
      .then(setStats)
      .catch(err => console.warn('Could not load customer stats:', err))
      .finally(() => setIsStatsLoading(false));
  }, []);

  const fetchCustomers = useCallback(
    (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      const [sortBy, sortOrder] = sort.split(':') as [AdminCustomerSortBy, AdminCustomerSortOrder];
      getAdminCustomers({ page, limit: PAGE_SIZE, search: search || undefined, sortBy, sortOrder }, signal)
        .then(result => {
          setCustomers(result.customers);
          setTotal(result.total);
          setTotalPages(result.totalPages);
          setHasMore(result.hasMore);
        })
        .catch(err => {
          if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
          setError(customerErrorMessage(err, 'Failed to load customers'));
        })
        .finally(() => {
          if (!signal?.aborted) setIsLoading(false);
        });
    },
    [page, search, sort]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchCustomers(controller.signal);
    return () => controller.abort();
  }, [fetchCustomers]);

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setSort(DEFAULT_SORT);
    setPage(1);
  };

  const hasActiveFilters = Boolean(search) || sort !== DEFAULT_SORT;

  // Header count: stats total while idle, result count while a search is active (if known)
  const headerCount = search ? total ?? null : stats?.totalPatrons ?? total ?? null;

  const rangeStart = customers.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = (page - 1) * PAGE_SIZE + customers.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            PATRON DATABASE & CRM
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Allura Customers{headerCount !== null ? ` (${headerCount})` : ''}
          </h1>
          <p className="text-xs font-sans text-stone-500">
            360-degree customer profiles, lifetime spending, size preferences, and dedicated WhatsApp concierge links.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by name, email, or mobile..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-white border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Customer Analytics KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-stone-400">
            <span className="text-[10px] font-bold uppercase">Total Patrons</span>
            <Users size={14} />
          </div>
          <p className="font-serif text-2xl font-bold text-[#561C08]">
            {isStatsLoading ? <span className="inline-block h-6 w-10 bg-stone-100 rounded animate-pulse" /> : stats?.totalPatrons ?? 0}
          </p>
          <p className="text-[11px] text-stone-500 font-sans">Active in boutique CRM</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-emerald-700">
            <span className="text-[10px] font-bold uppercase">New Registrations</span>
            <UserCheck size={14} />
          </div>
          <p className="font-serif text-2xl font-bold text-emerald-800">
            {isStatsLoading ? <span className="inline-block h-6 w-10 bg-emerald-50 rounded animate-pulse" /> : stats?.newRegistrations ?? 0}
          </p>
          <p className="text-[11px] text-emerald-700 font-sans">Current window</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-allura-goldDark">
            <span className="text-[10px] font-bold uppercase">Repeat Patrons</span>
            <Sparkles size={14} />
          </div>
          <p className="font-serif text-2xl font-bold text-allura-darkBrown">
            {isStatsLoading ? <span className="inline-block h-6 w-10 bg-stone-100 rounded animate-pulse" /> : stats?.repeatPatrons ?? 0}
          </p>
          <p className="text-[11px] text-stone-500 font-sans">2+ Atelier orders</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-stone-400">
            <span className="text-[10px] font-bold uppercase">First-Time Buyers</span>
            <ShoppingBag size={14} />
          </div>
          <p className="font-serif text-2xl font-bold text-[#561C08]">
            {isStatsLoading ? <span className="inline-block h-6 w-10 bg-stone-100 rounded animate-pulse" /> : stats?.firstTimeBuyers ?? 0}
          </p>
          <p className="text-[11px] text-stone-500 font-sans">1 Atelier purchase</p>
        </div>
      </div>

      {/* Sort control & Clear filters */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-sans">
        <label className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-stone-400">Sort by</span>
          <select
            value={sort}
            onChange={e => {
              setSort(e.target.value as SortValue);
              setPage(1);
            }}
            className="p-2 bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-800"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className="font-bold text-allura-goldDark underline">
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchCustomers()} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Customer Patron</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Orders Count</th>
                <th className="p-4">Lifetime Spend</th>
                <th className="p-4">Allura Circle Tier</th>
                <th className="p-4">Last Order</th>
                <th className="p-4 text-right">CRM Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading && customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-stone-400">
                    <Loader2 size={20} className="animate-spin inline-block" />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-stone-400 space-y-2">
                    <p>No customers found.</p>
                    {hasActiveFilters && (
                      <button type="button" onClick={clearFilters} className="text-xs font-bold text-allura-goldDark underline">
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                customers.map(cust => (
                  <tr key={cust.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-stone-900 text-white font-serif font-bold text-xs flex items-center justify-center">
                          {cust.name ? cust.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <p className="font-serif text-sm font-medium text-stone-900">{cust.name || '—'}</p>
                          <p className="text-[10px] text-stone-400">
                            {cust.createdDate ? `Patron since ${cust.createdDate}` : '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-stone-600 space-y-0.5">
                      <p className="font-medium text-stone-800">{cust.phone || '—'}</p>
                      <p className="text-[10px] text-stone-400">{cust.email || '—'}</p>
                    </td>
                    <td className="p-4 font-mono font-bold text-[#561C08]">{cust.ordersCount ?? 0} orders</td>
                    <td className="p-4 font-serif text-sm font-bold text-allura-darkBrown">
                      ₹ {(cust.totalSpent ?? 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4">
                      {cust.isCircleMember ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-allura-gold/15 text-allura-goldDark font-bold text-[10px] uppercase">
                          <Sparkles size={11} />
                          <span>{cust.circleTier} Tier</span>
                        </span>
                      ) : (
                        <span className="text-stone-400 text-[11px]">Regular Customer</span>
                      )}
                    </td>
                    <td className="p-4 text-stone-600">{cust.lastOrderDate || '—'}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {cust.phone ? (
                          <a
                            href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(cust.name || 'there')}%2C%20greetings%20from%20Allura%20Boutique.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Contact on WhatsApp"
                            className="p-1.5 bg-[#25D366]/10 text-[#128C7E] rounded-lg hover:bg-[#25D366]/20 transition-colors"
                          >
                            <MessageCircle size={14} />
                          </a>
                        ) : (
                          <span
                            title="No phone number on file"
                            className="p-1.5 bg-stone-100 text-stone-300 rounded-lg cursor-not-allowed"
                          >
                            <MessageCircle size={14} />
                          </span>
                        )}
                        <Link
                          to={`/admin/customers/${cust.id}`}
                          className="px-3 py-1.5 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1"
                        >
                          <Eye size={12} />
                          <span>Profile</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {customers.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 text-xs font-sans text-stone-500">
            <span>
              Showing {rangeStart}-{rangeEnd}
              {total !== null ? ` of ${total}` : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="p-1.5 border border-stone-200 rounded-lg disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              {totalPages !== null && (
                <span className="px-1">Page {page} of {totalPages}</span>
              )}
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore || isLoading}
                className="p-1.5 border border-stone-200 rounded-lg disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
