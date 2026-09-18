import React, { useState } from 'react';
import { 
  Search, 
  ExternalLink,
  Printer
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Link } from 'react-router-dom';

export const AdminShippingPage: React.FC = () => {
  const { orders, generateDelhiveryAWB } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');

  const shipments = orders.map(o => ({
    orderId: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customer.name,
    city: `${o.shippingAddress.city}, ${o.shippingAddress.state}`,
    pincode: o.shippingAddress.pincode,
    courier: o.tracking?.courier || 'Delhivery Luxury Express',
    awb: o.tracking?.awb || 'Pending Generation',
    status: o.orderStatus === 'Pending' || o.orderStatus === 'Processing' ? 'Ready to Ship' : o.orderStatus,
    expectedDelivery: o.tracking?.estimatedDelivery || '3 Days from Dispatch',
    itemsCount: o.items.length,
    date: o.date,
  }));

  const filtered = shipments.filter(
    s =>
      s.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.awb.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            LOGISTICS & DISPATCH HUB
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Delhivery Shipping Operations
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Manifest scheduling, automated waybill generation, and doorstep courier SLA tracking.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 rounded-xl text-xs font-sans font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Printer size={14} />
          <span>Print Daily Courier Manifest</span>
        </button>
      </div>

      {/* Logistics SLA KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Kerala Express SLA</span>
          <p className="font-serif text-2xl font-bold text-stone-900">24–48 Hrs</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">All-India Courier SLA</span>
          <p className="font-serif text-2xl font-bold text-stone-900">3–5 Days</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-emerald-700">On-Time Delivery</span>
          <p className="font-serif text-2xl font-bold text-emerald-800">99.1%</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Free Shipping Min</span>
          <p className="font-serif text-2xl font-bold text-allura-goldDark">₹ 2,999</p>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs space-y-4">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search shipment by AWB, order, or city..."
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
                <th className="p-4">Order Reference</th>
                <th className="p-4">Destination Details</th>
                <th className="p-4">Courier Partner</th>
                <th className="p-4">Delhivery AWB</th>
                <th className="p-4">Expected SLA</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((s, idx) => (
                <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                  <td className="p-4">
                    <p className="font-serif font-bold text-stone-900 text-sm">{s.orderNumber}</p>
                    <p className="text-[10px] text-stone-400">{s.customerName} ({s.itemsCount} items)</p>
                  </td>
                  <td className="p-4 text-stone-700">
                    <p className="font-medium">{s.city}</p>
                    <p className="text-[10px] text-stone-400 font-mono">PIN: {s.pincode}</p>
                  </td>
                  <td className="p-4 font-medium text-stone-800">{s.courier}</td>
                  <td className="p-4 font-mono font-bold text-stone-900">
                    {s.awb === 'Pending Generation' ? (
                      <span className="text-amber-700 text-[11px] font-sans font-semibold">Pending Waybill</span>
                    ) : (
                      s.awb
                    )}
                  </td>
                  <td className="p-4 text-stone-600">{s.expectedDelivery}</td>
                  <td className="p-4">
                    <StatusBadge status={s.status} size="sm" />
                  </td>
                  <td className="p-4 text-right">
                    {s.awb === 'Pending Generation' ? (
                      <button
                        onClick={() => generateDelhiveryAWB(s.orderId)}
                        className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
                      >
                        Generate AWB
                      </button>
                    ) : (
                      <Link
                        to={`/account/orders/${s.orderId}/tracking`}
                        target="_blank"
                        className="text-xs font-bold text-allura-goldDark hover:underline inline-flex items-center gap-1"
                      >
                        <span>Live Track</span>
                        <ExternalLink size={12} />
                      </Link>
                    )}
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
