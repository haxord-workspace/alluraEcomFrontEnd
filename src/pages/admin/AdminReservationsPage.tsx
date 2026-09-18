import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminReservationsPage: React.FC = () => {
  const { stockReservations } = useAdmin();

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
            <span>Back to Inventory</span>
          </Link>
          <h1 className="font-serif text-3xl text-stone-900 font-normal">
            Inventory Stock Reservations ({stockReservations.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Garment units locked for in-progress checkout, bridal bookings, and custom atelier alterations.
          </p>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Reservation ID</th>
                <th className="p-4">Product & Variant</th>
                <th className="p-4">Order / Customer</th>
                <th className="p-4">Units Locked</th>
                <th className="p-4">Created Time</th>
                <th className="p-4">Expiry Time</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {stockReservations.map(res => (
                <tr key={res.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="p-4 font-mono font-bold text-stone-900">{res.id}</td>
                  <td className="p-4">
                    <p className="font-serif text-sm font-medium text-stone-900">{res.productName}</p>
                    <p className="text-[10px] text-stone-400 font-mono">{res.variant}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-stone-800">{res.orderNumber}</p>
                    <p className="text-[10px] text-stone-400">{res.customerName}</p>
                  </td>
                  <td className="p-4 font-mono font-bold text-stone-900">{res.quantity} unit</td>
                  <td className="p-4 text-stone-500">{res.created}</td>
                  <td className="p-4 text-stone-500">{res.expires}</td>
                  <td className="p-4 text-right">
                    <StatusBadge status={res.status} size="sm" />
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
