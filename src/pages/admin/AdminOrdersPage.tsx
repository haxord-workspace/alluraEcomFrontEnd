import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Eye,
  Truck,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { getAdminOrders, toBackendStatus, orderErrorMessage } from '../../service/orders';
import type { Order, OrderStatus } from '../../types';
import { useAdminOrderCatalog } from '../../hooks/useAdminOrderCatalog';

const PAGE_SIZE = 20;

export const AdminOrdersPage: React.FC = () => {
  const [rawOrders, setOrders] = useState<Order[]>([]);
  const withCatalog = useAdminOrderCatalog();
  const orders = React.useMemo(() => rawOrders.map(withCatalog), [rawOrders, withCatalog]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const statuses: ('All' | OrderStatus)[] = [
    'All',
    'Pending',
    'Confirmed',
    'Processing',
    'Shipped',
    'Delivered',
    'Cancelled',
    'Returned',
  ];

  // Search is sent to the server; wait until typing pauses
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAdminOrders({
        page,
        limit: PAGE_SIZE,
        status: statusFilter === 'All' ? undefined : toBackendStatus(statusFilter),
        search: search || undefined,
      });
      setOrders(result.orders);
      setTotal(result.total);
    } catch (err) {
      setError(orderErrorMessage(err, 'Failed to load orders'));
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            OPERATIONS & FULFILLMENT
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Customer Orders ({total})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Confirm, pack and ship orders, and manage cancellations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="p-2.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <Link
            to="/admin/shipping"
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Truck size={14} />
            <span>Shipping Dispatch Hub</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by order #, customer, or phone..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
            />
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 border-t border-stone-100 pt-3">
          {statuses.map(st => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchOrders} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Order Number & Date</th>
                <th className="p-4">Customer & City</th>
                <th className="p-4">Items / SKU</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Order Status</th>
                <th className="p-4">Shipment</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading && orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-stone-400">Loading orders…</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-stone-400">
                    {search || statusFilter !== 'All' ? 'No orders match these filters.' : 'No orders yet.'}
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-4">
                      <p className="font-serif text-sm font-bold text-stone-900">{order.orderNumber}</p>
                      <p className="text-[10px] text-stone-400">{order.date}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-stone-800">{order.customer.name}</p>
                      {(order.shippingAddress.city || order.shippingAddress.state) && (
                        <p className="text-[10px] text-stone-400">
                          {[order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                      <p className="text-[10px] text-stone-400">{order.customer.phone}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-stone-800 truncate max-w-[180px]">
                        {order.items[0]?.product.name || '—'}
                      </p>
                      {order.items.length > 0 && (
                        <p className="text-[10px] text-stone-400 font-mono">
                          {order.items[0]?.sku} ({order.items.length} item{order.items.length > 1 ? 's' : ''})
                        </p>
                      )}
                    </td>
                    <td className="p-4 font-bold text-stone-900">
                      ₹ {order.total.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-stone-700">{order.paymentMethod}</span>
                      <p className={`text-[10px] font-medium ${order.paymentStatus === 'Paid' || order.paymentStatus === 'Captured' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {order.paymentStatus}
                      </p>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={order.orderStatus} size="sm" />
                    </td>
                    <td className="p-4">
                      <p className="text-stone-700 font-medium">{order.tracking?.courier || '—'}</p>
                      <p className="font-mono text-[10px] text-stone-400">{order.tracking?.awb || 'Not shipped'}</p>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1 shadow-xs"
                      >
                        <Eye size={12} />
                        <span>Manage</span>
                      </Link>
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
              Page {page} of {totalPages} · {total} orders
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
    </div>
  );
};
