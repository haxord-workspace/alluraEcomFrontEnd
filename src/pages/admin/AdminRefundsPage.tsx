import React from 'react';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminRefundsPage: React.FC = () => {
  const refunds = [
    {
      id: 'ref-901',
      orderNumber: 'ALR-ORD-720194',
      customerName: 'Ananya Menon',
      customerPhone: '+91 98471 23456',
      amount: 5499,
      reason: 'Exchange store credit processed',
      paymentMethod: 'Card (Razorpay)',
      status: 'Completed',
      requestedDate: '29 Aug 2026',
      processedDate: '30 Aug 2026',
      gatewayTxId: 'rfnd_RZP8812034',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            REFUND AUDITING
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Processed Refunds & Credits ({refunds.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Source UPI/Card refunds and boutique store credit vouchers.
          </p>
        </div>
      </div>

      {/* Refunds Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Refund ID</th>
                <th className="p-4">Order Reference</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Refund Reason</th>
                <th className="p-4">Gateway Reference</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {refunds.map(ref => (
                <tr key={ref.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="p-4 font-mono font-bold text-stone-900 uppercase">{ref.id}</td>
                  <td className="p-4 font-serif font-semibold text-stone-800">{ref.orderNumber}</td>
                  <td className="p-4">
                    <p className="font-medium text-stone-900">{ref.customerName}</p>
                    <p className="text-[10px] text-stone-400">{ref.customerPhone}</p>
                  </td>
                  <td className="p-4 font-bold text-stone-900">₹ {ref.amount.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-stone-600">{ref.reason}</td>
                  <td className="p-4 font-mono text-[10px] text-stone-500">{ref.gatewayTxId}</td>
                  <td className="p-4 text-right">
                    <StatusBadge status={ref.status} size="sm" />
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
