import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  PackageCheck,
  RotateCcw,
  AlertTriangle,
  History,
  X
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { AdminPagination } from '../../components/admin/AdminPagination';
import {
  getInventoryTransactions,
  TransactionType,
  type InventoryTransactionItem,
} from '../../service/adminInventory';
import { getAdminVariants } from '../../service/adminVariants';
import { getAdminProducts } from '../../service/adminProducts';
import type { AdminProduct, AdminProductVariant } from '../../types';
import { getBackendErrorMessage } from '../../utils/apiResponse';

const PAGE_SIZE = 15;

const TRANSACTION_TYPES: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All Operations' },
  { value: TransactionType.STOCK_IN, label: 'Stock In (Restock)' },
  { value: TransactionType.STOCK_OUT, label: 'Stock Out' },
  { value: TransactionType.ADJUSTMENT_IN, label: 'Adjustment (In)' },
  { value: TransactionType.ADJUSTMENT_OUT, label: 'Adjustment (Out)' },
  { value: TransactionType.ORDER_DEDUCTION, label: 'Order Deduction' },
  { value: TransactionType.ORDER_CANCELLATION, label: 'Order Cancellation' },
  { value: TransactionType.RETURN_IN, label: 'Return Restock' },
  { value: TransactionType.DAMAGE_OUT, label: 'Damage Removal' },
  { value: TransactionType.RESERVATION, label: 'Reservation' },
  { value: TransactionType.RELEASE_RESERVATION, label: 'Release Reservation' },
  { value: TransactionType.TRANSFER_IN, label: 'Transfer In' },
  { value: TransactionType.TRANSFER_OUT, label: 'Transfer Out' },
];

export const AdminTransactionsPage: React.FC = () => {
  const { stockTransactions: contextTransactions } = useAdmin();

  const [transactions, setTransactions] = useState<InventoryTransactionItem[]>([]);
  const [variants, setVariants] = useState<AdminProductVariant[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [txResult, variantData, productData] = await Promise.all([
        getInventoryTransactions({ limit: 100 }),
        getAdminVariants().catch(() => []),
        getAdminProducts().catch(() => []),
      ]);

      setTransactions(txResult.transactions || []);
      setVariants(variantData || []);
      setProducts(productData || []);
    } catch (err: any) {
      setError(getBackendErrorMessage(err, 'Failed to fetch transaction logs'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Variant & Product maps for enrichment
  const variantMap = useMemo(() => {
    const map: Record<string, AdminProductVariant> = {};
    variants.forEach(v => {
      map[v.id] = v;
      if (v._id) map[v._id] = v;
    });
    return map;
  }, [variants]);

  const productMap = useMemo(() => {
    const map: Record<string, AdminProduct> = {};
    products.forEach(p => {
      map[p.id] = p;
      if (p._id) map[p._id] = p;
    });
    return map;
  }, [products]);

  // Merge live backend transactions with local context fallback if backend is empty
  const enrichedTransactions = useMemo(() => {
    if (transactions.length > 0) {
      return transactions.map(tx => {
        const variant = tx.variantId ? variantMap[tx.variantId] : undefined;
        const productId = tx.productId || variant?.productId;
        const product = productId ? productMap[productId] : undefined;

        const dateStr = tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) : '—';

        const prevCount =
          typeof tx.previousBalance === 'object' && tx.previousBalance !== null
            ? (tx.previousBalance as any).onHand ?? (tx.previousBalance as any).available ?? '—'
            : tx.previousBalance ?? '—';

        const newCount =
          typeof tx.newBalance === 'object' && tx.newBalance !== null
            ? (tx.newBalance as any).onHand ?? (tx.newBalance as any).available ?? '—'
            : tx.newBalance ?? '—';

        const performer =
          typeof tx.performedBy === 'object' && tx.performedBy !== null
            ? (tx.performedBy as any).name || (tx.performedBy as any).email || 'Admin'
            : tx.performedBy || 'System';

        return {
          id: tx.id || tx._id,
          date: dateStr,
          rawDate: tx.createdAt,
          productName: product?.name || 'Item Variant',
          sku: variant?.sku || (typeof tx.reference === 'object' ? tx.reference?.id : undefined) || '—',
          type: tx.type,
          quantity: tx.quantity,
          previousStock: prevCount,
          newStock: newCount,
          reason: tx.reason || 'Inventory operation',
          reference: typeof tx.reference === 'object' ? `${tx.reference?.type || 'MANUAL'}` : (tx.reference || 'MANUAL'),
          user: performer,
        };
      });
    }

    // Fallback to AdminContext stock transactions
    return contextTransactions.map(ctx => ({
      id: ctx.id,
      date: ctx.date,
      rawDate: ctx.date,
      productName: ctx.productName,
      sku: ctx.sku,
      type: ctx.operation === 'Add' ? TransactionType.STOCK_IN : ctx.operation === 'Remove' ? TransactionType.STOCK_OUT : ctx.operation,
      quantity: ctx.quantity,
      previousStock: ctx.previousStock,
      newStock: ctx.newStock,
      reason: ctx.reason,
      reference: ctx.reference,
      user: ctx.user,
    }));
  }, [transactions, contextTransactions, variantMap, productMap]);

  // Filtering by search & operation type
  const filteredTransactions = useMemo(() => {
    return enrichedTransactions.filter(tx => {
      const matchesType =
        typeFilter === 'ALL' ||
        tx.type === typeFilter ||
        (typeFilter === TransactionType.STOCK_IN && tx.type === 'Add') ||
        (typeFilter === TransactionType.STOCK_OUT && tx.type === 'Remove');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tx.productName.toLowerCase().includes(q) ||
        tx.sku.toLowerCase().includes(q) ||
        tx.reason.toLowerCase().includes(q) ||
        tx.reference.toLowerCase().includes(q) ||
        tx.user.toLowerCase().includes(q);

      return matchesType && matchesSearch;
    });
  }, [enrichedTransactions, typeFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  // Pagination (Limit 15)
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, currentPage]);

  const renderBadge = (type: string) => {
    switch (type) {
      case TransactionType.STOCK_IN:
      case 'Add':
      case TransactionType.TRANSFER_IN:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowDownLeft size={10} />
            Stock In
          </span>
        );
      case TransactionType.RETURN_IN:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RotateCcw size={10} />
            Return In
          </span>
        );
      case TransactionType.STOCK_OUT:
      case 'Remove':
      case TransactionType.DAMAGE_OUT:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <ArrowUpRight size={10} />
            {type === TransactionType.DAMAGE_OUT ? 'Damage' : 'Stock Out'}
          </span>
        );
      case TransactionType.ORDER_DEDUCTION:
      case 'Sale':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <PackageCheck size={10} />
            Order Deduction
          </span>
        );
      case TransactionType.ADJUSTMENT_IN:
      case TransactionType.ADJUSTMENT_OUT:
      case 'Set':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <SlidersHorizontal size={10} />
            Adjustment
          </span>
        );
      case TransactionType.RESERVATION:
      case TransactionType.RELEASE_RESERVATION:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <History size={10} />
            Reservation
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <Link
            to="/admin/inventory"
            className="inline-flex items-center gap-1 text-xs font-sans text-stone-500 hover:text-stone-900 mb-2 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Inventory Control</span>
          </Link>
          <h1 className="font-serif text-3xl text-stone-900 font-normal">
            Stock Transactions Audit Trail
          </h1>
          <p className="text-xs font-sans text-stone-500 mt-1">
            Immutable physical ledger of stock arrivals, customer purchases, cycle adjustments, and returns restocks.
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-sans text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:border-stone-300 rounded-xl transition-all shadow-xs disabled:opacity-50"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to fetch latest live audit logs</p>
            <p className="mt-0.5 opacity-90">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-amber-600 hover:text-amber-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by SKU, product name, reason, reference, or user..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-xs font-sans bg-stone-50/60 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-400 focus:bg-white transition-all text-stone-800 placeholder-stone-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-sans text-stone-500 whitespace-nowrap">Operation:</span>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-xs font-sans bg-stone-50/60 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 focus:outline-hidden focus:ring-1 focus:ring-stone-400 focus:bg-white transition-all"
          >
            {TRANSACTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Product & SKU</th>
                <th className="p-4">Operation</th>
                <th className="p-4 text-center">Qty Change</th>
                <th className="p-4">Balance (Prev &rarr; New)</th>
                <th className="p-4">Reason & Reference</th>
                <th className="p-4 text-right">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-stone-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-stone-300" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-stone-400">
                    <p className="font-serif text-base text-stone-700">No stock transactions found</p>
                    <p className="text-xs mt-1">Try clearing your search query or operation filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-4 text-stone-500 whitespace-nowrap font-mono text-[11px]">
                      {tx.date}
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-stone-900 font-serif">{tx.productName}</p>
                      <p className="text-[10px] text-stone-400 font-mono">SKU: {tx.sku}</p>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {renderBadge(tx.type)}
                    </td>
                    <td className="p-4 font-mono font-bold text-xs text-center whitespace-nowrap">
                      {typeof tx.quantity === 'number' ? (
                        tx.quantity > 0 ? (
                          <span className="text-emerald-700 font-semibold">+{tx.quantity}</span>
                        ) : tx.quantity < 0 ? (
                          <span className="text-rose-700 font-semibold">{tx.quantity}</span>
                        ) : (
                          <span className="text-stone-500">0</span>
                        )
                      ) : (
                        <span>{tx.quantity}</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-stone-600 whitespace-nowrap">
                      {tx.previousStock} &rarr; <strong className="text-[#561C08]">{tx.newStock}</strong>
                    </td>
                    <td className="p-4">
                      <p className="text-stone-800 font-medium">{tx.reason}</p>
                      <p className="text-[10px] text-stone-400 font-mono">Ref: {tx.reference}</p>
                    </td>
                    <td className="p-4 text-right font-medium text-stone-700 whitespace-nowrap">
                      {tx.user}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Limit 15 Pagination */}
        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredTransactions.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

