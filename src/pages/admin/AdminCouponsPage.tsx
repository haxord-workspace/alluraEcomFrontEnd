import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Search, Loader2, Power, Edit3, Trash2 } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import {
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
  setAdminCouponStatus,
  couponErrorMessage,
} from '../../service/coupons';
import type { CouponInput } from '../../service/coupons';
import type { Coupon } from '../../types';

const today = () => new Date().toISOString().split('T')[0];
const inDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

const EMPTY_FORM = {
  code: '',
  description: '',
  type: 'PERCENTAGE' as CouponInput['discount']['type'],
  value: 10,
  maxDiscountAmount: '' as number | '',
  startsAt: today(),
  expiresAt: inDays(30),
  status: 'ACTIVE' as NonNullable<CouponInput['status']>,
};

const benefitLabel = (c: { discountType: Coupon['discountType']; discountValue: number; maxDiscount?: number }) =>
  c.discountType === 'Percentage'
    ? `${c.discountValue}% OFF${c.maxDiscount ? ` (max ₹${c.maxDiscount.toLocaleString('en-IN')})` : ''}`
    : `₹${c.discountValue.toLocaleString('en-IN')} OFF`;

export const AdminCouponsPage: React.FC = () => {
  const { hasPermission } = useAdmin();
  const { showToast } = useShop();
  const canCreate = hasPermission('marketing', 'create');
  const canEdit = hasPermission('marketing', 'edit');
  const canDelete = hasPermission('marketing', 'delete');
  const canPublish = hasPermission('marketing', 'publish') || canEdit;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchCoupons = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setCoupons(await getAdminCoupons());
    } catch (err: any) {
      setError(couponErrorMessage(err, 'Failed to load coupons'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, startsAt: today(), expiresAt: inDays(30) });
    setIsCreateOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      type: coupon.discountType === 'Fixed' ? 'FIXED' : 'PERCENTAGE',
      value: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscount ?? '',
      startsAt: coupon.startDate || today(),
      expiresAt: coupon.endDate || inDays(30),
      status: coupon.status === 'Active' ? 'ACTIVE' : 'DRAFT',
    });
    setIsCreateOpen(true);
  };

  const replaceCoupon = (updated: Coupon) =>
    setCoupons(prev => prev.map(c => (c.id === updated.id ? updated : c)));

  // Activate / deactivate. Returns the updated coupon (or null if the server didn't send it back).
  const changeStatus = async (coupon: Coupon, active: boolean, quiet = false) => {
    setBusyId(coupon.id);
    try {
      const updated = await setAdminCouponStatus(coupon.id, active);
      if (updated) replaceCoupon(updated);
      else await fetchCoupons();
      if (!quiet) showToast(`Coupon ${coupon.code} ${active ? 'is now active: customers can use it' : 'deactivated'}`, active ? 'success' : 'info');
      return true;
    } catch (err: any) {
      showToast(couponErrorMessage(err, `Could not ${active ? 'activate' : 'deactivate'} ${coupon.code}`), 'error');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setBusyId(target.id);
    try {
      await deleteAdminCoupon(target.id);
      setCoupons(prev => prev.filter(c => c.id !== target.id));
      showToast(`Coupon ${target.code} deleted`, 'info');
    } catch (err: any) {
      showToast(couponErrorMessage(err, 'Could not delete coupon'), 'error');
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = form.code.toUpperCase().trim();
    if (!code) return;
    if (form.type === 'PERCENTAGE' && (form.value <= 0 || form.value > 100)) {
      showToast('Percentage must be between 1 and 100', 'error');
      return;
    }
    if (form.expiresAt < form.startsAt) {
      showToast('Expiry date must be after the start date', 'error');
      return;
    }

    const input: CouponInput = {
      code,
      description: form.description.trim() || undefined,
      discount: {
        type: form.type,
        value: Number(form.value),
        ...(form.type === 'PERCENTAGE' && form.maxDiscountAmount !== ''
          ? { maxDiscountAmount: Number(form.maxDiscountAmount) }
          : {}),
      },
      startsAt: new Date(`${form.startsAt}T00:00:00`).toISOString(),
      expiresAt: new Date(`${form.expiresAt}T23:59:59`).toISOString(),
      status: form.status,
    };

    setIsSaving(true);
    try {
      const { status: _status, ...details } = input;
      let saved: Coupon;
      if (editingId) {
        const updated = await updateAdminCoupon(editingId, details);
        saved = updated || { ...coupons.find(c => c.id === editingId)!, code };
        if (updated) replaceCoupon(updated);
      } else {
        saved = await createAdminCoupon(input);
        setCoupons(prev => [saved, ...prev]);
      }

      // The server ignores "status" on create/update, so apply it through the status endpoint
      const wantActive = form.status === 'ACTIVE';
      const isActive = saved.status === 'Active';
      let statusOk = true;
      if (saved.id && wantActive !== isActive && !(saved.status === 'Draft' && !wantActive)) {
        statusOk = await changeStatus(saved, wantActive, true);
      }

      if (!statusOk) {
        showToast(`Coupon ${code} saved, but it could not be ${wantActive ? 'activated' : 'deactivated'}. Use the button in the list to retry.`, 'info');
      } else {
        showToast(`Coupon ${code} ${editingId ? 'updated' : wantActive ? 'published and active' : 'saved as draft'}`, 'success');
      }
      setIsCreateOpen(false);
      setEditingId(null);
    } catch (err: any) {
      showToast(couponErrorMessage(err, editingId ? 'Failed to update coupon' : 'Failed to create coupon'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = coupons.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q || c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
  });

  const previewValue = Number(form.value) || 0;

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
            Publish discount codes customers can apply in their Bag.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCoupons}
            disabled={isLoading}
            className="p-2.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 rounded-xl transition-colors disabled:opacity-50"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {canCreate && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>Create Coupon</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchCoupons} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* Coupons Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-200">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search code or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Coupon Code</th>
                <th className="p-4">Benefit / Discount</th>
                <th className="p-4">Min Cart Value</th>
                <th className="p-4">Usage</th>
                <th className="p-4">Valid</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading && coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-stone-400">Loading coupons…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-stone-400">
                    {coupons.length === 0 ? 'No coupons yet. Create your first one.' : 'No coupons match your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map(coupon => (
                  <tr key={coupon.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-4">
                      <span className="font-serif font-bold text-stone-900 text-base tracking-wider">{coupon.code}</span>
                      {coupon.description && (
                        <p className="text-[11px] text-stone-500 line-clamp-1">{coupon.description}</p>
                      )}
                    </td>
                    <td className="p-4 font-bold text-stone-900">{benefitLabel(coupon)}</td>
                    <td className="p-4 font-semibold text-stone-700">
                      {coupon.minOrderValue > 0 ? `₹ ${coupon.minOrderValue.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="p-4 font-mono text-stone-800">
                      {coupon.usageCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''} used
                    </td>
                    <td className="p-4 text-stone-600 whitespace-nowrap">
                      {coupon.startDate || '—'} → {coupon.endDate || 'No expiry'}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={coupon.status} size="sm" />
                      {coupon.status !== 'Active' && coupon.status !== 'Expired' && (
                        <p className="text-[10px] text-stone-400 mt-1">Not usable by customers</p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {canPublish && coupon.status !== 'Expired' && (
                          coupon.status === 'Active' ? (
                            <button
                              onClick={() => changeStatus(coupon, false)}
                              disabled={busyId === coupon.id}
                              className="px-2.5 py-1.5 border border-stone-200 text-stone-700 hover:bg-stone-100 rounded-lg text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"
                              title="Stop customers from using this coupon"
                            >
                              {busyId === coupon.id ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => changeStatus(coupon, true)}
                              disabled={busyId === coupon.id}
                              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"
                              title="Let customers use this coupon"
                            >
                              {busyId === coupon.id ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
                              Activate
                            </button>
                          )
                        )}
                        {canEdit && (
                          <button
                            onClick={() => openEdit(coupon)}
                            className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg"
                            title="Edit"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget(coupon)}
                            className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Coupon Modal with Live Preview */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-xl p-6 sm:p-8 space-y-6 shadow-2xl animate-slide-up text-xs font-sans max-h-[92vh] overflow-y-auto">
            <h3 className="font-serif text-2xl text-stone-900 font-normal">{editingId ? 'Edit Coupon' : 'Create Coupon'}</h3>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="E.g. DIWALI20"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold font-mono text-sm uppercase focus:outline-none focus:border-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Discount Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as CouponInput['discount']['type'] })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Flat Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                    {form.type === 'PERCENTAGE' ? 'Discount (%) *' : 'Discount Amount (₹) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={form.type === 'PERCENTAGE' ? 100 : undefined}
                    value={form.value}
                    onChange={e => setForm({ ...form, value: Number(e.target.value) })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold"
                  />
                </div>
                {form.type === 'PERCENTAGE' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Max Discount (₹)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="No cap"
                      value={form.maxDiscountAmount}
                      onChange={e => setForm({ ...form, maxDiscountAmount: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Starts On *</label>
                  <input
                    type="date"
                    required
                    value={form.startsAt}
                    onChange={e => setForm({ ...form, startsAt: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Expires On *</label>
                  <input
                    type="date"
                    required
                    min={form.startsAt}
                    value={form.expiresAt}
                    onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['ACTIVE', 'Active', 'Customers can use it now'],
                    ['DRAFT', 'Draft', 'Hidden, not usable yet'],
                  ] as const).map(([value, label, hint]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm({ ...form, status: value })}
                      className={`p-2.5 rounded-xl border text-left transition-colors ${
                        form.status === value ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      <p className="font-bold text-stone-900">{label}</p>
                      <p className="text-[10px] text-stone-500">{hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Description / Customer Note</label>
                <input
                  type="text"
                  placeholder="E.g. Festive discount on all bridal wear"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              {/* Live Customer Preview Card */}
              <div className="p-4 bg-allura-card border border-allura-border rounded-xl space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-allura-goldDark">LIVE CUSTOMER PREVIEW</span>
                <p className="font-serif text-base font-bold text-stone-900">{form.code || 'COUPON_CODE'}</p>
                <p className="text-[11px] text-stone-600">
                  {benefitLabel({
                    discountType: form.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed',
                    discountValue: previewValue,
                    maxDiscount: form.maxDiscountAmount === '' ? undefined : Number(form.maxDiscountAmount),
                  })}
                  {' · '}valid {form.startsAt} to {form.expiresAt}
                </p>
                {form.description && <p className="text-[11px] text-stone-500">{form.description}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsCreateOpen(false); setEditingId(null); }}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 size={13} className="animate-spin" />}
                  {editingId ? 'Save Changes' : form.status === 'ACTIVE' ? 'Publish Coupon' : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Coupon"
        message={`Delete coupon "${deleteTarget?.code}"? Customers will no longer be able to use it.`}
        confirmLabel="Delete Coupon"
        isDestructive
      />
    </div>
  );
};
