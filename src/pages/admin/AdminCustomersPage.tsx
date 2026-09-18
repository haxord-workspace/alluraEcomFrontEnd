import React, { useState } from 'react';
import { Search, Eye, MessageCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';

export const AdminCustomersPage: React.FC = () => {
  const { customers } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = customers.filter(
    c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            PATRON DATABASE & CRM
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Allura Customers ({customers.length})
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
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none"
          />
        </div>
      </div>

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
              {filtered.map(cust => (
                <tr key={cust.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-stone-900 text-white font-serif font-bold text-xs flex items-center justify-center">
                        {cust.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-serif text-sm font-medium text-stone-900">{cust.name}</p>
                        <p className="text-[10px] text-stone-400">Patron since {cust.createdDate || '2026'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-stone-600 space-y-0.5">
                    <p className="font-medium text-stone-800">{cust.phone}</p>
                    <p className="text-[10px] text-stone-400">{cust.email}</p>
                  </td>
                  <td className="p-4 font-mono font-bold text-stone-900">{cust.ordersCount || 1} orders</td>
                  <td className="p-4 font-serif text-sm font-bold text-allura-darkBrown">
                    ₹ {(cust.totalSpent || 8999).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4">
                    {cust.isCircleMember ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-allura-gold/15 text-allura-goldDark font-bold text-[10px] uppercase">
                        <Sparkles size={11} />
                        <span>{cust.circleTier || 'Gold'} Tier</span>
                      </span>
                    ) : (
                      <span className="text-stone-400 text-[11px]">Regular Customer</span>
                    )}
                  </td>
                  <td className="p-4 text-stone-600">{cust.lastOrderDate || 'Recent'}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(cust.name)}%2C%20greetings%20from%20Allura%20Boutique.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Contact on WhatsApp"
                        className="p-1.5 bg-[#25D366]/10 text-[#128C7E] rounded-lg hover:bg-[#25D366]/20 transition-colors"
                      >
                        <MessageCircle size={14} />
                      </a>
                      <Link
                        to={`/admin/customers/${cust.id}`}
                        className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1"
                      >
                        <Eye size={12} />
                        <span>Profile</span>
                      </Link>
                    </div>
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
