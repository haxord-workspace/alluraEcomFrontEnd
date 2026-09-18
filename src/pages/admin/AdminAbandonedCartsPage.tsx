import React from 'react';
import { MessageCircle, CheckCircle2 } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const AdminAbandonedCartsPage: React.FC = () => {
  const { abandonedCarts, sendCartReminder } = useAdmin();

  const totalAbandonedValue = abandonedCarts.reduce((acc, c) => acc + c.cartValue, 0);
  const recoveredCount = abandonedCarts.filter(c => c.recovered).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            CONVERSION RECOVERY
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Abandoned Carts Hub ({abandonedCarts.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Recover dropped checkout bags via personalized WhatsApp concierge and email invitations.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Total Dropped Bags</span>
          <p className="font-serif text-2xl font-bold text-stone-900">{abandonedCarts.length}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Potential Revenue</span>
          <p className="font-serif text-2xl font-bold text-stone-900">
            ₹ {totalAbandonedValue.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-emerald-700">Recovered Carts</span>
          <p className="font-serif text-2xl font-bold text-emerald-800">{recoveredCount}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Recovery Rate</span>
          <p className="font-serif text-2xl font-bold text-allura-goldDark">33.3%</p>
        </div>
      </div>

      {/* Abandoned Carts Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Customer</th>
                <th className="p-4">Dropped Garments</th>
                <th className="p-4">Cart Value</th>
                <th className="p-4">Last Activity</th>
                <th className="p-4">Reminder History</th>
                <th className="p-4 text-right">Trigger Recovery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {abandonedCarts.map(cart => (
                <tr key={cart.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="p-4">
                    <p className="font-serif text-sm font-medium text-stone-900">{cart.customerName}</p>
                    <p className="text-[10px] text-stone-400">{cart.phone}</p>
                    <p className="text-[10px] text-stone-400">{cart.email}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={cart.items[0]?.image}
                        alt={cart.items[0]?.name}
                        className="w-10 h-12 object-cover rounded bg-stone-100"
                      />
                      <div>
                        <p className="font-medium text-stone-900 truncate max-w-[160px]">{cart.items[0]?.name}</p>
                        <p className="text-[10px] text-stone-400">{cart.items.length} item(s) in bag</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-stone-900">
                    ₹ {cart.cartValue.toLocaleString('en-IN')}
                  </td>
                  <td className="p-4 text-stone-500">{cart.lastActivity}</td>
                  <td className="p-4">
                    {cart.recovered ? (
                      <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase">
                        <CheckCircle2 size={12} />
                        <span>Recovered</span>
                      </span>
                    ) : (
                      <p className="text-[11px] text-stone-600">
                        {cart.reminder1Sent ? cart.reminder1Date : 'No reminder sent yet'}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {!cart.recovered && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => sendCartReminder(cart.id, 'WhatsApp')}
                          className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-xs"
                        >
                          <MessageCircle size={13} />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          onClick={() => sendCartReminder(cart.id, 'Email')}
                          className="px-3 py-1.5 border border-stone-200 hover:bg-stone-100 text-stone-700 rounded-lg font-semibold text-[11px]"
                        >
                          Email
                        </button>
                      </div>
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
