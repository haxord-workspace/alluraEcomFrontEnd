import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const AdminTransactionsPage: React.FC = () => {
  const { stockTransactions } = useAdmin();

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <Link
            to="/admin/inventory"
            className="inline-flex items-center gap-1 text-xs font-sans text-stone-500 hover:text-stone-900 mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to Inventory Control</span>
          </Link>
          <h1 className="font-serif text-3xl text-stone-900 font-normal">
            Stock Transactions Audit Trail
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Immutable physical ledger of stock arrivals, customer purchases, cycle adjustments, and returns restocks.
          </p>
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
                <th className="p-4">Qty Change</th>
                <th className="p-4">Balance (Prev &rarr; New)</th>
                <th className="p-4">Reason & Reference</th>
                <th className="p-4 text-right">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {stockTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="p-4 text-stone-500 whitespace-nowrap">{tx.date}</td>
                  <td className="p-4">
                    <p className="font-medium text-stone-900 font-serif">{tx.productName}</p>
                    <p className="text-[10px] text-stone-400 font-mono">SKU: {tx.sku}</p>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        tx.operation === 'Add'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tx.operation === 'Sale' || tx.operation === 'Remove'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {tx.operation}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-sm">
                    {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                  </td>
                  <td className="p-4 font-mono text-stone-600">
                    {tx.previousStock} &rarr; <strong className="text-stone-900">{tx.newStock}</strong>
                  </td>
                  <td className="p-4">
                    <p className="text-stone-800 font-medium">{tx.reason}</p>
                    <p className="text-[10px] text-stone-400 font-mono">Ref: {tx.reference}</p>
                  </td>
                  <td className="p-4 text-right font-medium text-stone-700">{tx.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
