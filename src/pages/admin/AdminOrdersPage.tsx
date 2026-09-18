import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Eye, 
  Truck
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { OrderStatus } from '../../types';

export const AdminOrdersPage: React.FC = () => {
  const { orders } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const statuses: ('All' | OrderStatus)[] = [
    'All',
    'Pending',
    'Processing',
    'Packed',
    'Shipped',
    'Delivered',
    'Cancelled',
    'Returned',
    'Refunded',
  ];

  const filteredOrders = orders.filter(o => {
    const matchesStatus = statusFilter === 'All' || o.orderStatus === statusFilter;
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer.phone.includes(searchQuery) ||
      o.customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            OPERATIONS & FULFILLMENT
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Customer Orders ({orders.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Fulfill atelier garments, assign Delhivery AWB manifests, and process status transitions.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
            />
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 border-t border-stone-100 pt-3">
          {statuses.map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
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
                <th className="p-4">Shipment Courier</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="p-4">
                    <p className="font-serif text-sm font-bold text-stone-900">{order.orderNumber}</p>
                    <p className="text-[10px] text-stone-400">{order.date}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-stone-800">{order.customer.name}</p>
                    <p className="text-[10px] text-stone-400">{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                    <p className="text-[10px] text-stone-400">{order.customer.phone}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-stone-800 truncate max-w-[180px]">
                      {order.items[0]?.product.name}
                    </p>
                    <p className="text-[10px] text-stone-400 font-mono">
                      {order.items[0]?.sku} ({order.items.length} item{order.items.length > 1 ? 's' : ''})
                    </p>
                  </td>
                  <td className="p-4 font-bold text-stone-900">
                    ₹ {order.total.toLocaleString('en-IN')}
                  </td>
                  <td className="p-4">
                    <span className="font-semibold text-stone-700">{order.paymentMethod}</span>
                    <p className="text-[10px] text-emerald-700 font-medium">{order.paymentStatus}</p>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={order.orderStatus} size="sm" />
                  </td>
                  <td className="p-4">
                    <p className="text-stone-700 font-medium">{order.tracking?.courier || 'Delhivery Express'}</p>
                    <p className="font-mono text-[10px] text-stone-400">{order.tracking?.awb || 'Pending AWB'}</p>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
