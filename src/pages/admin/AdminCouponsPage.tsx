import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import type { Coupon } from '../../types';

export const AdminCouponsPage: React.FC = () => {
  const { coupons, addCoupon, deleteCoupon } = useAdmin();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteModalCoupon, setDeleteModalCoupon] = useState<Coupon | null>(null);

  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'Percentage' | 'Fixed'>('Percentage');
  const [newValue, setNewValue] = useState<number>(15);
  const [newMinOrder, setNewMinOrder] = useState<number>(3999);
  const [newEndDate, setNewEndDate] = useState('2026-12-31');

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode) return;
    addCoupon({
      code: newCode.toUpperCase().trim(),
      description: newDesc || `Flat ${newValue}% off on orders above ₹${newMinOrder}`,
      discountType: newType,
      discountValue: Number(newValue),
      minOrderValue: Number(newMinOrder),
      maxDiscount: 2000,
      startDate: new Date().toISOString().split('T')[0],
      endDate: newEndDate,
      status: 'Active',
      isExclusive: false,
    });
    setNewCode('');
    setNewDesc('');
    setIsCreateOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            MARKETING PRIVILEGES
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Coupons & Voucher Builder ({coupons.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Publish boutique discount codes, set minimum cart thresholds, and review redemption metrics.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={14} />
          <span>Create Coupon</span>
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Coupon Code</th>
                <th className="p-4">Benefit / Discount</th>
                <th className="p-4">Min Cart Value</th>
                <th className="p-4">Usage Count</th>
                <th className="p-4">Validity End</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {coupons.map(coupon => (
                <tr key={coupon.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-stone-900 text-base tracking-wider">
                        {coupon.code}
                      </span>
                      {coupon.isExclusive && (
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase">
                          VIP
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 line-clamp-1">{coupon.description}</p>
                  </td>
                  <td className="p-4 font-bold text-stone-900">
                    {coupon.discountType === 'Percentage'
                      ? `${coupon.discountValue}% OFF`
                      : `₹ ${coupon.discountValue} FLAT`}
                  </td>
                  <td className="p-4 font-semibold text-stone-700">
                    ₹ {coupon.minOrderValue.toLocaleString('en-IN')}
                  </td>
                  <td className="p-4 font-mono text-stone-800">
                    {coupon.usageCount} redemptions
                  </td>
                  <td className="p-4 text-stone-600">{coupon.endDate}</td>
                  <td className="p-4">
                    <StatusBadge status={coupon.status} size="sm" />
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDeleteModalCoupon(coupon)}
                        className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Coupon Modal with Live Preview */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-xl p-6 sm:p-8 space-y-6 shadow-2xl animate-slide-up text-xs font-sans">
            <h3 className="font-serif text-2xl text-stone-900 font-normal">Create Boutique Coupon</h3>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. DIWALI20"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold font-mono text-sm uppercase focus:outline-none focus:border-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Discount Type</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Flat Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={newValue}
                    onChange={e => setNewValue(Number(e.target.value))}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Min Order Value (₹)</label>
                  <input
                    type="number"
                    required
                    value={newMinOrder}
                    onChange={e => setNewMinOrder(Number(e.target.value))}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={e => setNewEndDate(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Description / Customer Note</label>
                <input
                  type="text"
                  placeholder="E.g. Special festive celebration discount for bespoke bridal patrons."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              {/* Live Customer Preview Card */}
              <div className="p-4 bg-allura-card border border-allura-border rounded-xl space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-allura-goldDark">LIVE CUSTOMER PREVIEW</span>
                <p className="font-serif text-base font-bold text-stone-900">{newCode.toUpperCase() || 'COUPON_CODE'}</p>
                <p className="text-[11px] text-stone-600">
                  {newType === 'Percentage' ? `${newValue}% off` : `₹${newValue} off`} on minimum spend of ₹{newMinOrder.toLocaleString('en-IN')}
                </p>
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
                  className="px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider shadow-sm"
                >
                  Publish Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteModalCoupon}
        onClose={() => setDeleteModalCoupon(null)}
        onConfirm={() => {
          if (deleteModalCoupon) deleteCoupon(deleteModalCoupon.id);
        }}
        title="Delete Coupon"
        message={`Are you sure you want to delete coupon code "${deleteModalCoupon?.code}"? Customers will no longer be able to apply it at checkout.`}
        confirmLabel="Delete Coupon"
        isDestructive
      />
    </div>
  );
};
