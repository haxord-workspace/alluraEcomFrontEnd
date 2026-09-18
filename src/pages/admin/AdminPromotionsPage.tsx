import React, { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminPromotionsPage: React.FC = () => {
  const { promotions, addPromotion } = useAdmin();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [discount, setDiscount] = useState('15% Off');
  const [conditions, setConditions] = useState('Applicable on all festive edits');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    addPromotion({
      title,
      type: 'Tiered Discount',
      conditions,
      discount,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-11-30',
      status: 'Active',
      eligibleCategories: ['Ethnic Wear', 'Curated Sets'],
    });
    setTitle('');
    setIsCreateOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            CAMPAIGNS & PROMOTIONS
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Storewide Promotions ({promotions.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Tiered thresholds, festive gifting campaigns, and VIP early access schedules.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={14} />
          <span>New Promotion</span>
        </button>
      </div>

      {/* Promotions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {promotions.map(p => (
          <div
            key={p.id}
            className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2 text-xs font-sans">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-allura-goldDark bg-allura-bgSecondary px-2.5 py-1 rounded-md">
                  {p.type}
                </span>
                <StatusBadge status={p.status} size="sm" />
              </div>
              <h3 className="font-serif text-2xl font-normal text-stone-900">{p.title}</h3>
              <p className="text-stone-600 leading-relaxed">{p.conditions}</p>
              <div className="pt-2">
                <span className="text-[10px] uppercase font-bold text-stone-400">Campaign Benefit</span>
                <p className="font-serif text-lg font-bold text-stone-900">{p.discount}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-sans text-stone-500">
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                <span>{p.startDate} to {p.endDate}</span>
              </span>
              <button className="text-stone-700 font-bold hover:underline">
                Edit Settings
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-6 space-y-4 text-xs font-sans">
            <h3 className="font-serif text-xl text-stone-900">Create Promotion</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="E.g. Festive Silk Stole Gifting Edit"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Benefit Display</label>
                <input
                  type="text"
                  required
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Conditions</label>
                <input
                  type="text"
                  required
                  value={conditions}
                  onChange={e => setConditions(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 text-white rounded-xl font-bold uppercase"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
