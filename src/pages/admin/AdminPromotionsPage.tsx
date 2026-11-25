import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Search, Loader2, Power, Edit3, Trash2, Calendar, ChevronDown } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { AdminErrorBanner } from '../../components/admin/AdminErrorBanner';
import { AdminPagination } from '../../components/admin/AdminPagination';
import {
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  updatePromotionStatus,
  promotionErrorMessage,
  toIsoDateTime,
  toIsoEndOfDay,
  toBackendPromotionStatus,
} from '../../service/promotions';
import { getCategories } from '../../service/category';
import { PROMOTION_TYPES, PROMOTION_STATUSES, PROMOTION_SCOPE_TYPES, PROMOTION_SCOPE_LABELS } from '../../types/promotion';
import type {
  AdminPromotion,
  PromotionInput,
  PromotionStatus,
  PromotionDiscountType,
  PromotionScopeType,
} from '../../types/promotion';
import type { Category } from '../../types';
import { PromotionItemPicker } from '../../components/admin/promotions/PromotionItemPicker';
import {
  useProductPickerOptions,
  useCategoryPickerOptions,
  useCollectionPickerOptions,
} from '../../hooks/usePromotionPickerOptions';
import { validatePromotionScope, scopeAllowsExclusions } from '../../utils/promotionValidation';
import { getBackendFieldErrors } from '../../utils/apiResponse';

const PAGE_SIZE = 10;

/** Replaced by Applies to > Categories; no longer used. Keeps the old Eligible Categories
 *  picker (and its category fetch) in the file without rendering or running it. */
const SHOW_LEGACY_ELIGIBLE_CATEGORIES = false;

/** "All products" / "3 products" / "2 categories" (+ "Excludes 1") for the list. */
const scopeSummary = (promo: AdminPromotion) => {
  const { type, productIds, categoryIds, collectionIds } = promo.applicableTo;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const scope =
    type === 'PRODUCTS'
      ? plural(productIds.length, 'product', 'products')
      : type === 'CATEGORIES'
        ? plural(categoryIds.length, 'category', 'categories')
        : type === 'COLLECTIONS'
          ? plural(collectionIds.length, 'collection', 'collections')
          : 'All products';
  const excluded = promo.excludedProducts.length + promo.excludedCategories.length;
  return { scope, excluded };
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-allura-goldDark border-b border-stone-100 pb-1.5">
    {children}
  </h4>
);
// Sized to fit the longest status label ("Expired") — same fixed-pill pattern used on the orders list.
const STATUS_PILL_SIZE = 'w-[92px] h-7';

const today = () => new Date().toISOString().split('T')[0];
const inDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

/** "25% Off" / "₹500 Off", for the table and edit-form preview. */
const formatDiscount = (type: PromotionDiscountType, value: number) =>
  type === 'Percentage' ? `${value}% Off` : `₹${value.toLocaleString('en-IN')} Off`;

interface FormState {
  name: string;
  type: string;
  discountType: PromotionDiscountType;
  discountValue: string;
  maxDiscountAmount: string;
  conditions: string;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
  /** Replaced by Applies to > Categories; no longer used (not sent). */
  eligibleCategories: string[];
  scopeType: PromotionScopeType;
  productIds: string[];
  categoryIds: string[];
  collectionIds: string[];
  excludedProducts: string[];
  excludedCategories: string[];
  /** Raw input text; integer */
  priority: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  type: PROMOTION_TYPES[0],
  discountType: 'Percentage',
  discountValue: '',
  maxDiscountAmount: '',
  conditions: '',
  startDate: today(),
  endDate: inDays(30),
  status: 'Active',
  eligibleCategories: [],
  scopeType: 'ALL',
  productIds: [],
  categoryIds: [],
  collectionIds: [],
  excludedProducts: [],
  excludedCategories: [],
  priority: '0',
};

export const AdminPromotionsPage: React.FC = () => {
  const { hasPermission } = useAdmin();
  const { showToast } = useShop();
  const canCreate = hasPermission('coupons_banners', 'create');
  const canEdit = hasPermission('coupons_banners', 'edit');
  const canDelete = hasPermission('coupons_banners', 'delete');
  const canPublish = hasPermission('coupons_banners', 'publish') || canEdit;

  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | PromotionStatus>('All');

  const [categories, setCategories] = useState<Category[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPromotion | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  /** Inline errors keyed by payload path (frontend rules and backend validation details) */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  /** Status as loaded for edit; the status endpoint is called only when it changes */
  const [loadedStatus, setLoadedStatus] = useState<PromotionStatus | null>(null);
  const [showExclusions, setShowExclusions] = useState(false);

  // Picker data loads only when the modal needs it; categories/collections are cached per session
  const exclusionsAllowed = scopeAllowsExclusions(form.scopeType);
  const wantsExclusions = exclusionsAllowed && (showExclusions || form.excludedProducts.length > 0 || form.excludedCategories.length > 0);
  const productOptions = useProductPickerOptions(isFormOpen && (form.scopeType === 'PRODUCTS' || wantsExclusions));
  const categoryOptions = useCategoryPickerOptions(isFormOpen && (form.scopeType === 'CATEGORIES' || wantsExclusions));
  const collectionOptions = useCollectionPickerOptions(isFormOpen && form.scopeType === 'COLLECTIONS');

  /** First error whose key is `key` or starts with `key.` (e.g. "applicableTo.productIds") */
  const errorFor = (...keys: string[]) => {
    for (const key of keys) {
      const match = Object.keys(fieldErrors).find(k => k === key || k.startsWith(`${key}.`) || k.startsWith(`${key}[`));
      if (match) return fieldErrors[match];
    }
    return undefined;
  };

  const clearFieldError = (...keys: string[]) =>
    setFieldErrors(prev => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([k]) => !keys.some(key => k === key || k.startsWith(`${key}.`) || k.startsWith(`${key}[`)))
      );
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });

  // Search is sent to the server; wait until typing pauses
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchPromotions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPromotions({
        page,
        limit: PAGE_SIZE,
        status: statusFilter === 'All' ? undefined : toBackendPromotionStatus(statusFilter),
        search: search || undefined,
      });
      setPromotions(result.promotions);
      setTotal(result.total);
    } catch (err) {
      setError(promotionErrorMessage(err, 'Failed to load promotions'));
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  useEffect(() => {
    // Replaced by Applies to > Categories; no longer used — skip the fetch for the hidden picker
    if (!SHOW_LEGACY_ELIGIBLE_CATEGORIES) return;
    getCategories().then(setCategories).catch(() => {
      // Non-fatal: the eligible-categories picker just shows no options.
    });
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormError(null);
    setFieldErrors({});
    setLoadedStatus(null);
    setShowExclusions(false);
    setForm({ ...EMPTY_FORM, startDate: today(), endDate: inDays(30) });
    setIsFormOpen(true);
  };

  const openEdit = (promo: AdminPromotion) => {
    setEditingId(promo.id);
    setFormError(null);
    setForm({
      name: promo.name,
      type: promo.type,
      discountType: promo.discountType,
      discountValue: promo.discountValue ? String(promo.discountValue) : '',
      maxDiscountAmount: promo.maxDiscountAmount ? String(promo.maxDiscountAmount) : '',
      conditions: promo.conditions,
      startDate: promo.startDate || today(),
      endDate: promo.endDate || inDays(30),
      status: promo.status,
      eligibleCategories: promo.eligibleCategories,
      // Older promotions without these fields map to ALL / [] / 0 (see mapPromotion)
      scopeType: promo.applicableTo.type,
      productIds: promo.applicableTo.productIds,
      categoryIds: promo.applicableTo.categoryIds,
      collectionIds: promo.applicableTo.collectionIds,
      excludedProducts: promo.excludedProducts,
      excludedCategories: promo.excludedCategories,
      priority: String(promo.priority),
    });
    setFieldErrors({});
    setLoadedStatus(promo.status);
    setShowExclusions(promo.excludedProducts.length > 0 || promo.excludedCategories.length > 0);
    setIsFormOpen(true);
  };

  const replacePromotion = (updated: AdminPromotion) =>
    setPromotions(prev => prev.map(p => (p.id === updated.id ? updated : p)));

  const changeStatus = async (promo: AdminPromotion, status: PromotionStatus, quiet = false) => {
    setBusyId(promo.id);
    try {
      const updated = await updatePromotionStatus(promo.id, status);
      if (updated) replacePromotion(updated);
      else await fetchPromotions();
      if (!quiet) showToast(`"${promo.name}" is now ${status}`, status === 'Active' ? 'success' : 'info');
      return true;
    } catch (err) {
      showToast(promotionErrorMessage(err, `Could not change the status of "${promo.name}"`), 'error');
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
      await deletePromotion(target.id);
      showToast(`Promotion "${target.name}" deleted`, 'info');
      // Re-fetch rather than filter locally, so pagination/total stay correct.
      await fetchPromotions();
    } catch (err) {
      showToast(promotionErrorMessage(err, 'Could not delete this promotion'), 'error');
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  };

  const toggleCategory = (name: string) => {
    setForm(prev => ({
      ...prev,
      eligibleCategories: prev.eligibleCategories.includes(name)
        ? prev.eligibleCategories.filter(c => c !== name)
        : [...prev.eligibleCategories, name],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const discountValue = Number(form.discountValue);
    if (!form.discountValue.trim() || Number.isNaN(discountValue) || discountValue <= 0) {
      showToast('Enter a discount value greater than 0', 'error');
      return;
    }
    if (form.discountType === 'Percentage' && discountValue > 100) {
      showToast('A percentage discount cannot exceed 100', 'error');
      return;
    }
    if (form.endDate < form.startDate) {
      showToast('End date must be after the start date', 'error');
      return;
    }
    const maxDiscountAmount = form.maxDiscountAmount.trim() ? Number(form.maxDiscountAmount) : undefined;
    if (maxDiscountAmount !== undefined && (Number.isNaN(maxDiscountAmount) || maxDiscountAmount <= 0)) {
      showToast('Max discount cap must be a positive number', 'error');
      return;
    }

    // Applies to / Exclusions / Priority rules (src/utils/promotionValidation.ts — confirm with backend)
    const scopeErrors = validatePromotionScope(form);
    if (Object.keys(scopeErrors).length > 0) {
      setFieldErrors(scopeErrors as Record<string, string>);
      showToast(Object.values(scopeErrors)[0] as string, 'error');
      return;
    }
    setFieldErrors({});

    // Only the list for the selected type is sent, so switching type never sends stale ids
    const scope = form.scopeType;
    const applicableTo = {
      type: scope,
      productIds: scope === 'PRODUCTS' ? form.productIds : [],
      categoryIds: scope === 'CATEGORIES' ? form.categoryIds : [],
      collectionIds: scope === 'COLLECTIONS' ? form.collectionIds : [],
    };
    const allowsExclusions = scopeAllowsExclusions(scope);
    const priorityText = form.priority.trim();

    const input: PromotionInput = {
      name: form.name.trim(),
      // Campaign Type: the backend does not store it (not in the Swagger schema). Sent as before.
      type: form.type,
      // "Conditions" is saved as `description`, the field the backend actually stores
      description: form.conditions.trim() || undefined,
      discount: {
        type: form.discountType === 'Fixed' ? 'FIXED' : 'PERCENTAGE',
        value: discountValue,
        ...(maxDiscountAmount !== undefined ? { maxDiscountAmount } : {}),
      },
      startsAt: toIsoDateTime(form.startDate),
      // End of the chosen local day (23:59:59), same as coupons
      expiresAt: toIsoEndOfDay(form.endDate),
      status: toBackendPromotionStatus(form.status),
      // eligibleCategories: replaced by Applies to > Categories; no longer sent
      applicableTo,
      excludedProducts: allowsExclusions ? form.excludedProducts : [],
      excludedCategories: allowsExclusions
        ? form.excludedCategories.filter(id => !applicableTo.categoryIds.includes(id))
        : [],
      ...(priorityText !== '' ? { priority: Number(priorityText) } : {}),
    };

    setIsSaving(true);
    try {
      if (editingId) {
        // PATCH /admin/promotions/{id} has no `status` field; status goes through the status endpoint
        const { status: _status, ...details } = input;
        const updated = await updatePromotion(editingId, details);
        if (updated) replacePromotion(updated);

        if (loadedStatus !== null && form.status !== loadedStatus) {
          try {
            const withStatus = await updatePromotionStatus(editingId, form.status);
            if (withStatus) replacePromotion(withStatus);
            setLoadedStatus(form.status);
          } catch (statusErr) {
            if (!updated) await fetchPromotions();
            const message = 'Promotion saved, but status could not be updated';
            setFormError(`${message}. ${promotionErrorMessage(statusErr, '')}`.trim());
            showToast(message, 'error');
            return; // keep the modal open with the admin's data
          }
        }

        if (!updated) await fetchPromotions();
        showToast(`Promotion "${input.name}" updated`, 'success');
      } else {
        await createPromotion(input);
        showToast(`Promotion "${input.name}" created`, 'success');
        await fetchPromotions();
      }
      setIsFormOpen(false);
      setEditingId(null);
    } catch (err) {
      const errText = promotionErrorMessage(err, editingId ? 'Failed to update promotion' : 'Failed to create promotion');
      setFieldErrors(getBackendFieldErrors(err));
      setFormError(errText);
      showToast(errText, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            CAMPAIGNS & PROMOTIONS
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Storewide Promotions ({total})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Tiered thresholds, festive gifting campaigns, and VIP early access schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPromotions}
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
              className="px-4 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>New Promotion</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by title..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 border-t border-stone-100 pt-3">
          {(['All', ...PROMOTION_STATUSES] as const).map(st => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[#561C08] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchPromotions} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* Promotions Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Campaign</th>
                <th className="p-4">Benefit</th>
                <th className="p-4">Valid</th>
                <th className="p-4 w-[110px]">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading && promotions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-stone-400">Loading promotions…</td>
                </tr>
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-stone-400">
                    {search || statusFilter !== 'All' ? 'No promotions match these filters.' : 'No promotions yet. Create your first one.'}
                  </td>
                </tr>
              ) : (
                promotions.map(promo => (
                  <tr key={promo.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-allura-goldDark bg-allura-bgSecondary px-2 py-0.5 rounded-md">
                        {promo.type}
                      </span>
                      <p className="font-serif text-base font-medium text-stone-900 mt-1">{promo.name}</p>
                      {promo.conditions && (
                        <p className="text-[11px] text-stone-500 line-clamp-1">{promo.conditions}</p>
                      )}
                    </td>
                    <td className="p-4 font-bold text-[#561C08]">
                      {promo.discountValue ? formatDiscount(promo.discountType, promo.discountValue) : '—'}
                      {(() => {
                        const { scope, excluded } = scopeSummary(promo);
                        return (
                          <p className="text-[11px] font-normal text-stone-500 mt-0.5">
                            {scope}
                            {excluded > 0 && <span className="text-stone-400"> · Excludes {excluded}</span>}
                          </p>
                        );
                      })()}
                    </td>
                    <td className="p-4 text-stone-600 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-stone-400" />
                        {promo.startDate || '—'} → {promo.endDate || '—'}
                      </span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={promo.status} size="sm" fixedSize={STATUS_PILL_SIZE} />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {canPublish && (
                          promo.status === 'Active' ? (
                            <button
                              onClick={() => changeStatus(promo, 'Paused')}
                              disabled={busyId === promo.id}
                              className="px-2.5 py-1.5 border border-stone-200 text-stone-700 hover:bg-stone-100 rounded-lg text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"
                              title="Pause this promotion"
                            >
                              {busyId === promo.id ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
                              Pause
                            </button>
                          ) : (
                            <button
                              onClick={() => changeStatus(promo, 'Active')}
                              disabled={busyId === promo.id}
                              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"
                              title="Activate this promotion"
                            >
                              {busyId === promo.id ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
                              Activate
                            </button>
                          )
                        )}
                        {canEdit && (
                          <button
                            onClick={() => openEdit(promo)}
                            className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg"
                            title="Edit"
                            aria-label={`Edit ${promo.name}`}
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget(promo)}
                            className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg"
                            title="Delete"
                            aria-label={`Delete ${promo.name}`}
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

        {total > 0 && (
          <AdminPagination
            currentPage={page}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={p => setPage(Math.min(Math.max(1, p), totalPages))}
          />
        )}
      </div>

      {/* Create / Edit modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-xl shadow-2xl animate-slide-up text-xs font-sans max-h-[92vh] flex flex-col overflow-hidden">
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
            {/* Scrollable body; the Cancel / Save footer below stays visible */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 space-y-6">
            <h3 className="font-serif text-2xl text-stone-900 font-normal">
              {editingId ? 'Edit Promotion' : 'Create Promotion'}
            </h3>

            {formError && (
              <AdminErrorBanner
                title="Promotion Save Failed"
                error={formError}
                onDismiss={() => setFormError(null)}
              />
            )}

            <div className="space-y-4">
              <SectionTitle>Basics</SectionTitle>
              <div>
                <label htmlFor="promo-name" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  Title *
                </label>
                <input
                  id="promo-name"
                  type="text"
                  required
                  autoFocus
                  placeholder="E.g. Festive Silk Stole Gifting Edit"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  disabled={isSaving}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                />
                {errorFor('name') && <p className="mt-1 text-[11px] text-rose-600">{errorFor('name')}</p>}
              </div>

              <div>
                <label htmlFor="promo-type" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  Campaign Type
                </label>
                <select
                  id="promo-type"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  disabled={isSaving}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                >
                  {PROMOTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="promo-conditions" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  Conditions
                </label>
                <input
                  id="promo-conditions"
                  type="text"
                  placeholder="E.g. Shop above ₹9,999 and receive a complimentary gift"
                  value={form.conditions}
                  onChange={e => setForm({ ...form, conditions: e.target.value })}
                  disabled={isSaving}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
                {errorFor('description') && <p className="mt-1 text-[11px] text-rose-600">{errorFor('description')}</p>}
              </div>

              <SectionTitle>Discount</SectionTitle>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="promo-discount-type" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                    Discount Type
                  </label>
                  <select
                    id="promo-discount-type"
                    value={form.discountType}
                    onChange={e => setForm({ ...form, discountType: e.target.value as PromotionDiscountType })}
                    disabled={isSaving}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="Percentage">Percentage</option>
                    <option value="Fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="promo-discount-value" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                    {form.discountType === 'Percentage' ? 'Percent Off *' : 'Amount Off (₹) *'}
                  </label>
                  <input
                    id="promo-discount-value"
                    type="number"
                    min={1}
                    max={form.discountType === 'Percentage' ? 100 : undefined}
                    required
                    placeholder={form.discountType === 'Percentage' ? 'E.g. 25' : 'E.g. 500'}
                    value={form.discountValue}
                    onChange={e => setForm({ ...form, discountValue: e.target.value })}
                    disabled={isSaving}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
                {form.discountType === 'Percentage' && (
                  <div>
                    <label htmlFor="promo-max-discount" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                      Max Cap (₹)
                    </label>
                    <input
                      id="promo-max-discount"
                      type="number"
                      min={1}
                      placeholder="Optional"
                      value={form.maxDiscountAmount}
                      onChange={e => setForm({ ...form, maxDiscountAmount: e.target.value })}
                      disabled={isSaving}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                )}
              </div>
              {errorFor('discount') && <p className="-mt-2 text-[11px] text-rose-600">{errorFor('discount')}</p>}

              {/* ─── Applies to ─────────────────────────────────────────────── */}
              <SectionTitle>Applies to</SectionTitle>
              <div className="space-y-3">
                <div>
                  <label htmlFor="promo-scope" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                    Applies to
                  </label>
                  <select
                    id="promo-scope"
                    value={form.scopeType}
                    onChange={e => {
                      setForm({ ...form, scopeType: e.target.value as PromotionScopeType });
                      clearFieldError('applicableTo', 'excludedCategories');
                    }}
                    disabled={isSaving}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    {PROMOTION_SCOPE_TYPES.map(t => <option key={t} value={t}>{PROMOTION_SCOPE_LABELS[t]}</option>)}
                  </select>
                  {form.scopeType === 'ALL' && errorFor('applicableTo') && (
                    <p className="mt-1 text-[11px] text-rose-600">{errorFor('applicableTo')}</p>
                  )}
                </div>

                {form.scopeType === 'PRODUCTS' && (
                  <PromotionItemPicker
                    id="promo-products"
                    label="Products *"
                    noun={{ one: 'product', many: 'products' }}
                    options={productOptions.options}
                    status={productOptions.status}
                    onRetry={productOptions.retry}
                    selectedIds={form.productIds}
                    onChange={ids => { setForm(f => ({ ...f, productIds: ids })); clearFieldError('applicableTo'); }}
                    error={errorFor('applicableTo')}
                    disabled={isSaving}
                  />
                )}
                {form.scopeType === 'CATEGORIES' && (
                  <PromotionItemPicker
                    id="promo-categories"
                    label="Categories *"
                    noun={{ one: 'category', many: 'categories' }}
                    options={categoryOptions.options}
                    status={categoryOptions.status}
                    onRetry={categoryOptions.retry}
                    selectedIds={form.categoryIds}
                    hiddenIds={form.excludedCategories}
                    onChange={ids => { setForm(f => ({ ...f, categoryIds: ids })); clearFieldError('applicableTo', 'excludedCategories'); }}
                    error={errorFor('applicableTo')}
                    disabled={isSaving}
                  />
                )}
                {form.scopeType === 'COLLECTIONS' && (
                  <PromotionItemPicker
                    id="promo-collections"
                    label="Collections *"
                    noun={{ one: 'collection', many: 'collections' }}
                    options={collectionOptions.options}
                    status={collectionOptions.status}
                    onRetry={collectionOptions.retry}
                    selectedIds={form.collectionIds}
                    onChange={ids => { setForm(f => ({ ...f, collectionIds: ids })); clearFieldError('applicableTo'); }}
                    error={errorFor('applicableTo')}
                    disabled={isSaving}
                  />
                )}
              </div>

              {/* ─── Exclusions (only for ALL / CATEGORIES / COLLECTIONS) ──────── */}
              {exclusionsAllowed && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowExclusions(s => !s)}
                    aria-expanded={showExclusions}
                    className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.15em] text-allura-goldDark border-b border-stone-100 pb-1.5"
                  >
                    <span>
                      Exclusions (optional)
                      {form.excludedProducts.length + form.excludedCategories.length > 0 && (
                        <span className="ml-1.5 normal-case tracking-normal font-semibold text-stone-500">
                          · {form.excludedProducts.length + form.excludedCategories.length} excluded
                        </span>
                      )}
                    </span>
                    <ChevronDown size={14} className={`transition-transform ${showExclusions ? 'rotate-180' : ''}`} />
                  </button>
                  {showExclusions && (
                    <>
                      <PromotionItemPicker
                        id="promo-excluded-products"
                        label="Exclude products"
                        noun={{ one: 'product', many: 'products' }}
                        options={productOptions.options}
                        status={productOptions.status}
                        onRetry={productOptions.retry}
                        selectedIds={form.excludedProducts}
                        onChange={ids => { setForm(f => ({ ...f, excludedProducts: ids })); clearFieldError('excludedProducts'); }}
                        error={errorFor('excludedProducts')}
                        disabled={isSaving}
                      />
                      <PromotionItemPicker
                        id="promo-excluded-categories"
                        label="Exclude categories"
                        noun={{ one: 'category', many: 'categories' }}
                        options={categoryOptions.options}
                        status={categoryOptions.status}
                        onRetry={categoryOptions.retry}
                        selectedIds={form.excludedCategories}
                        hiddenIds={form.scopeType === 'CATEGORIES' ? form.categoryIds : undefined}
                        onChange={ids => { setForm(f => ({ ...f, excludedCategories: ids })); clearFieldError('excludedCategories'); }}
                        error={errorFor('excludedCategories')}
                        disabled={isSaving}
                      />
                    </>
                  )}
                </div>
              )}

              <SectionTitle>Schedule</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="promo-start" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                    Starts On *
                  </label>
                  <input
                    id="promo-start"
                    type="date"
                    required
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    disabled={isSaving}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label htmlFor="promo-end" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                    Ends On *
                  </label>
                  <input
                    id="promo-end"
                    type="date"
                    required
                    min={form.startDate}
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    disabled={isSaving}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>
              {errorFor('startsAt', 'expiresAt') && (
                <p className="-mt-2 text-[11px] text-rose-600">{errorFor('startsAt', 'expiresAt')}</p>
              )}

              <div>
                <label htmlFor="promo-priority" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  Priority
                </label>
                <input
                  id="promo-priority"
                  type="number"
                  step={1}
                  placeholder="0"
                  value={form.priority}
                  onChange={e => { setForm({ ...form, priority: e.target.value }); clearFieldError('priority'); }}
                  disabled={isSaving}
                  aria-describedby="promo-priority-help"
                  className={`w-full p-2.5 bg-stone-50 border rounded-xl ${errorFor('priority') ? 'border-rose-300' : 'border-stone-200'}`}
                />
                {errorFor('priority') ? (
                  <p className="mt-1 text-[11px] text-rose-600">{errorFor('priority')}</p>
                ) : (
                  <p id="promo-priority-help" className="mt-1 text-[11px] text-stone-400">
                    Whole number, default 0. Promotions with a higher priority are evaluated first; when several
                    promotions qualify they currently stack rather than replace each other.
                  </p>
                )}
              </div>

              <SectionTitle>Status</SectionTitle>
              <div>
                <span className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Status</span>
                <div className="grid grid-cols-4 gap-2">
                  {PROMOTION_STATUSES.map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setForm({ ...form, status: st })}
                      disabled={isSaving}
                      className={`px-2 py-2 rounded-xl border text-center font-bold transition-colors disabled:opacity-50 ${
                        form.status === st ? 'border-stone-900 bg-stone-50 text-stone-900' : 'border-stone-200 text-stone-500 hover:border-stone-400'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Replaced by Applies to > Categories; no longer used (not rendered, not sent) */}
              {SHOW_LEGACY_ELIGIBLE_CATEGORIES && categories.length > 0 && (
                <div>
                  <span className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Eligible Categories</span>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.name)}
                        disabled={isSaving}
                        className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                          form.eligibleCategories.includes(cat.name)
                            ? 'border-allura-goldDark bg-allura-bgSecondary text-allura-goldDark'
                            : 'border-stone-200 text-stone-500 hover:border-stone-400'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>

              {/* Sticky footer */}
              <div className="flex justify-end gap-2 px-6 sm:px-8 py-4 border-t border-stone-100 bg-white">
                <button
                  type="button"
                  onClick={() => { setIsFormOpen(false); setEditingId(null); }}
                  disabled={isSaving}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl font-bold uppercase tracking-wider shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 size={13} className="animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Promotion'}
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
        title="Delete Promotion"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete Promotion"
        isDestructive
      />
    </div>
  );
};
