import React, { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight, Eye, X, SlidersHorizontal } from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  getAdminPayments,
  getAdminPayment,
  paymentLedgerErrorMessage,
  type PaymentListParams,
  type PaymentsSummary,
} from '../../service/adminPayments';
import type { PaymentDetail, PaymentLedgerMethod, PaymentLedgerStatus, PaymentListItem } from '../../types';

const PAGE_SIZE = 20;

const STATUSES: ('All' | PaymentLedgerStatus)[] = ['All', 'PAID', 'PENDING', 'FAILED', 'REFUNDED'];
// Used by the Method filter, which is hidden for now (only online payment is offered)
// const METHODS: ('All' | PaymentLedgerMethod)[] = ['All', 'UPI', 'CARD', 'NETBANKING', 'COD'];
const SORTS: { value: NonNullable<PaymentListParams['sort']>; label: string }[] = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
  { value: '-amount', label: 'Amount: high to low' },
  { value: 'amount', label: 'Amount: low to high' },
];

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | PaymentLedgerStatus>('All');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [methodDraft, setMethodDraft] = useState<'All' | PaymentLedgerMethod>('All');
  const [fromDraft, setFromDraft] = useState('');
  const [toDraft, setToDraft] = useState('');
  const [sortDraft, setSortDraft] = useState<NonNullable<PaymentListParams['sort']>>('-createdAt');

  const [method, setMethod] = useState<'All' | PaymentLedgerMethod>('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<NonNullable<PaymentListParams['sort']>>('-createdAt');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const hasActiveFilters = method !== 'All' || !!from || !!to || sort !== '-createdAt';

  // Search is sent to the server; wait until typing pauses
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAdminPayments({
        page,
        limit: PAGE_SIZE,
        status: statusFilter === 'All' ? undefined : statusFilter,
        method: method === 'All' ? undefined : method,
        from: from || undefined,
        to: to || undefined,
        sort,
        search: search || undefined,
      });
      setPayments(result.items);
      setTotal(result.total);
      setSummary(result.summary);
    } catch (err) {
      setError(paymentLedgerErrorMessage(err, 'Failed to load payments'));
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, method, from, to, sort, search]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const applyAdvancedFilters = () => {
    setMethod(methodDraft);
    setFrom(fromDraft);
    setTo(toDraft);
    setSort(sortDraft);
    setPage(1);
  };

  const resetAdvancedFilters = () => {
    setMethodDraft('All');
    setFromDraft('');
    setToDraft('');
    setSortDraft('-createdAt');
    setMethod('All');
    setFrom('');
    setTo('');
    setSort('-createdAt');
    setPage(1);
  };

  const openDetail = async (paymentId: string) => {
    setSelectedId(paymentId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const data = await getAdminPayment(paymentId);
      setDetail(data);
    } catch (err) {
      setDetailError(paymentLedgerErrorMessage(err, 'Failed to load payment detail'));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            FINANCIAL RECONCILIATION
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Razorpay Payments Ledger
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Real-time webhook capture, transaction IDs, UPI settlements, and refund logs.
          </p>
        </div>
        <button
          onClick={fetchPayments}
          disabled={isLoading}
          className="p-2.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 rounded-xl transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Total Captured</span>
          <p className="font-serif text-2xl font-bold text-emerald-800">
            ₹ {(summary?.totalCaptured ?? 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">UPI Success Rate</span>
          <p className="font-serif text-2xl font-bold text-[#561C08]">
            {(summary?.upiSuccessRate ?? 0).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Settlement Cycle</span>
          <p className="font-serif text-2xl font-bold text-[#561C08]">{summary?.settlementCycle ?? '—'}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Environment</span>
          <p className="font-serif text-2xl font-bold text-emerald-700 font-mono capitalize">
            {summary?.environment ?? '—'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search payment ID, order, or customer..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
            />
          </div>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className={`px-3.5 py-2 rounded-xl text-xs font-sans font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${showAdvanced || hasActiveFilters
              ? 'bg-[#561C08] text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
          >
            <SlidersHorizontal size={13} />
            <span>Advanced Filters</span>
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>
        </div>

        {/* Status Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 border-t border-stone-100 pt-3">
          {STATUSES.map(st => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors whitespace-nowrap ${statusFilter === st
                ? 'bg-[#561C08] text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
            >
              {st}
            </button>
          ))}
        </div>

        {showAdvanced && (
          <div className="border-t border-stone-100 pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Method filter hidden: only online payment is offered right now
              <div>
                <label className="block text-[10px] font-sans font-bold uppercase text-stone-400 mb-1">Method</label>
                <select
                  value={methodDraft}
                  onChange={e => setMethodDraft(e.target.value as 'All' | PaymentLedgerMethod)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
                >
                  {METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              */}
              <div>
                <label className="block text-[10px] font-sans font-bold uppercase text-stone-400 mb-1">From</label>
                <input
                  type="date"
                  value={fromDraft}
                  onChange={e => setFromDraft(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-sans font-bold uppercase text-stone-400 mb-1">To</label>
                <input
                  type="date"
                  value={toDraft}
                  onChange={e => setToDraft(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-sans font-bold uppercase text-stone-400 mb-1">Sort by</label>
                <select
                  value={sortDraft}
                  onChange={e => setSortDraft(e.target.value as NonNullable<PaymentListParams['sort']>)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
                >
                  {SORTS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={applyAdvancedFilters}
                className="px-4 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors"
              >
                Apply
              </button>
              <button
                onClick={resetAdvancedFilters}
                className="px-4 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-3">
            {method !== 'All' && (
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[10px] font-sans font-semibold">
                Method: {method}
              </span>
            )}
            {from && (
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[10px] font-sans font-semibold">
                From: {from}
              </span>
            )}
            {to && (
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[10px] font-sans font-semibold">
                To: {to}
              </span>
            )}
            {sort !== '-createdAt' && (
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[10px] font-sans font-semibold">
                Sort: {SORTS.find(s => s.value === sort)?.label}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchPayments} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Payment ID & Date</th>
                <th className="p-4">Order Reference</th>
                <th className="p-4">Customer</th>
                {/* Method hidden: only online payment is offered right now */}
                {/* <th className="p-4">Method</th> */}
                <th className="p-4">Gross Amount</th>
                <th className="p-4">Gateway Reference</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading && payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-stone-400">Loading payments…</td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-stone-400">
                    {search || statusFilter !== 'All' || hasActiveFilters
                      ? 'No payments match these filters.'
                      : 'No payments yet.'}
                  </td>
                </tr>
              ) : (
                payments.map(pay => (
                  <tr key={pay.paymentId} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-4">
                      <p className="font-mono font-bold text-stone-900">{pay.paymentId}</p>
                      <p className="text-[10px] text-stone-400">{formatDateTime(pay.createdAt)}</p>
                    </td>
                    <td className="p-4 font-serif font-medium text-stone-800">{pay.orderNumber || '—'}</td>
                    <td className="p-4">
                      <p className="font-medium text-stone-900">{pay.customerName || '—'}</p>
                      <p className="text-[10px] text-stone-400">{pay.customerEmail}</p>
                    </td>
                    {/* <td className="p-4 font-semibold text-stone-700">{pay.method || '—'}</td> */}
                    <td className="p-4 font-bold text-[#561C08]">₹ {pay.amount.toLocaleString('en-IN')}</td>
                    <td className="p-4 font-mono text-[10px] text-stone-500">{pay.gatewayReference || '—'}</td>
                    <td className="p-4">
                      <StatusBadge status={pay.status} size="sm" />
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openDetail(pay.paymentId)}
                        className="px-3 py-1.5 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-lg font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1 shadow-xs"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 text-xs font-sans text-stone-500">
            <span>
              Page {page} of {totalPages} · {total} payments
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="p-1.5 border border-stone-200 rounded-lg disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="p-1.5 border border-stone-200 rounded-lg disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeDetail}>
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
                  PAYMENT DETAIL
                </span>
                <h2 className="font-serif text-xl text-black font-semibold mt-0.5">{selectedId}</h2>
              </div>
              <button
                onClick={closeDetail}
                className="p-1.5 text-black hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {detailLoading ? (
              <p className="text-xs font-sans text-black py-6 text-center">Loading detail…</p>
            ) : detailError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 flex items-center justify-between">
                <span>{detailError}</span>
                <button onClick={() => openDetail(selectedId)} className="font-bold underline">Retry</button>
              </div>
            ) : detail ? (
              <div className="space-y-3 text-xs font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-[#191616] uppercase text-[10px] font-bold">Status</span>
                  <StatusBadge status={detail.status} size="sm" />
                </div>
                <dl className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                  <dt className="text-[#191616] font-medium">Order</dt>
                  <dd className="text-stone-900 font-medium text-right">{detail.orderNumber || '—'}</dd>

                  <dt className="text-[#191616] font-medium">Customer</dt>
                  <dd className="text-stone-900 font-medium text-right">{detail.customerName || '—'}</dd>

                  <dt className="text-[#191616] font-medium">Email</dt>
                  <dd className="text-stone-900 text-right">{detail.customerEmail || '—'}</dd>

                  {/* Method hidden: only online payment is offered right now
                  <dt className="text-[#191616] font-medium">Method</dt>
                  <dd className="text-stone-900 font-medium text-right">{detail.method || '—'}</dd>
                  */}

                  <dt className="text-[#191616] font-medium">Amount</dt>
                  <dd className="text-[#561C08] font-bold text-right">
                    {detail.currency} {detail.amount.toLocaleString('en-IN')}
                  </dd>

                  <dt className="text-[#191616] font-medium">Gateway Reference</dt>
                  <dd className="text-stone-900 font-mono text-[11px] text-right">{detail.gatewayReference || '—'}</dd>

                  <dt className="text-[#191616] font-medium">Razorpay Order ID</dt>
                  <dd className="text-stone-900 font-mono text-[11px] text-right">{detail.razorpayOrderId || '—'}</dd>

                  <dt className="text-[#191616] font-medium">Created</dt>
                  <dd className="text-stone-900 text-right">{formatDateTime(detail.createdAt)}</dd>

                  <dt className="text-[#191616] font-medium">Updated</dt>
                  <dd className="text-stone-900 text-right">{formatDateTime(detail.updatedAt)}</dd>
                </dl>

                {detail.failureReason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold uppercase text-rose-700">Failure Reason</p>
                    <p className="text-rose-800">{detail.failureReason}</p>
                    {detail.failureDescription && (
                      <p className="text-rose-700 text-[11px]">{detail.failureDescription}</p>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
