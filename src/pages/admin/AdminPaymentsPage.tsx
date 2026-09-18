import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminPaymentsPage: React.FC = () => {
  const { orders } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');

  const payments = orders.map((o, idx) => ({
    id: `pay_RZP${Math.floor(10000000 + idx * 4921)}`,
    orderId: o.orderNumber,
    customerName: o.customer.name,
    customerEmail: o.customer.email,
    amount: o.total,
    currency: 'INR',
    gateway: 'Razorpay',
    method: o.paymentMethod,
    status: o.paymentStatus,
    reference: `tx_ref_${Math.floor(100000000 + idx * 7731)}`,
    date: o.date,
  }));

  const filtered = payments.filter(
    p =>
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            FINANCIAL RECONCILIATION
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Razorpay Payments Ledger ({payments.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Real-time webhook capture, transaction IDs, UPI settlements, and refund logs.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Total Captured</span>
          <p className="font-serif text-2xl font-bold text-emerald-800">₹ 4,86,500</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">UPI Success Rate</span>
          <p className="font-serif text-2xl font-bold text-stone-900">98.4%</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Settlement Cycle</span>
          <p className="font-serif text-2xl font-bold text-stone-900">T + 1 Days</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Environment</span>
          <p className="font-serif text-2xl font-bold text-emerald-700 font-mono">Live</p>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs space-y-4">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search payment ID, order, or customer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Payment ID & Date</th>
                <th className="p-4">Order Reference</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Method</th>
                <th className="p-4">Gross Amount</th>
                <th className="p-4">Gateway Reference</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(pay => (
                <tr key={pay.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="p-4">
                    <p className="font-mono font-bold text-stone-900">{pay.id}</p>
                    <p className="text-[10px] text-stone-400">{pay.date}</p>
                  </td>
                  <td className="p-4 font-serif font-medium text-stone-800">{pay.orderId}</td>
                  <td className="p-4">
                    <p className="font-medium text-stone-900">{pay.customerName}</p>
                    <p className="text-[10px] text-stone-400">{pay.customerEmail}</p>
                  </td>
                  <td className="p-4 font-semibold text-stone-700">{pay.method}</td>
                  <td className="p-4 font-bold text-stone-900">₹ {pay.amount.toLocaleString('en-IN')}</td>
                  <td className="p-4 font-mono text-[10px] text-stone-500">{pay.reference}</td>
                  <td className="p-4 text-right">
                    <StatusBadge status={pay.status} size="sm" />
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
