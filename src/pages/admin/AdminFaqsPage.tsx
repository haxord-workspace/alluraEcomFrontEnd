import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  X,
  Plus,
  Edit3,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  HelpCircle,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { AdminErrorBanner } from '../../components/admin/AdminErrorBanner';
import { AdminPagination } from '../../components/admin/AdminPagination';
import { AdminFaqFormModal } from '../../components/admin/AdminFaqFormModal';
import {
  getAdminFaqs,
  getAdminFaqCategories,
  patchAdminFaq,
  deleteAdminFaq,
  reorderAdminFaqs,
  faqErrorMessage,
  type AdminFaq,
  type AdminFaqStatus,
} from '../../service/adminFaqs';

const PAGE_SIZES = [10, 25, 50];

export const AdminFaqsPage: React.FC = () => {
  const { hasPermission } = useAdmin();
  const { showToast } = useShop();

  const [faqs, setFaqs] = useState<AdminFaq[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<string[]>([]);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'scheduled' | 'published' | 'unpublished' | 'archived'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Row actions
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminFaq | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create/edit modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<AdminFaq | null>(null);

  // Reorder (within the current page)
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const canCreate = hasPermission('cms', 'create');
  const canEdit = hasPermission('cms', 'edit');
  const canDelete = hasPermission('cms', 'delete');

  // Debounce the search box -> search param (400ms)
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset to page 1 whenever search/filters/page size change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter, pageSize]);

  const fetchFaqs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAdminFaqs({
        page,
        limit: pageSize,
        search: search || undefined,
        category: categoryFilter || undefined,
        status: statusFilter,
      });
      setFaqs(result.faqs);
      setTotal(result.total);
      setOrderedIds(result.faqs.map(f => f.id));
    } catch (err: any) {
      setError(faqErrorMessage(err, 'Could not load FAQs'));
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  useEffect(() => {
    getAdminFaqCategories()
      .then(setCategories)
      .catch(err => console.warn('Could not load FAQ categories:', err));
  }, []);

  const orderedFaqs = useMemo(() => {
    const byId = new Map(faqs.map(f => [f.id, f]));
    return orderedIds.map(id => byId.get(id)).filter((f): f is AdminFaq => !!f);
  }, [faqs, orderedIds]);

  const isOrderDirty = useMemo(
    () => orderedIds.join(',') !== faqs.map(f => f.id).join(','),
    [orderedIds, faqs]
  );

  const hasActiveFilters = !!search || !!categoryFilter || statusFilter !== 'all';

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('all');
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= orderedIds.length) return;
    const next = [...orderedIds];
    [next[index], next[target]] = [next[target], next[index]];
    setOrderedIds(next);
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      await reorderAdminFaqs(orderedIds);
      showToast('FAQ order updated', 'success');
      await fetchFaqs();
    } catch (err: any) {
      showToast(faqErrorMessage(err, 'Could not save the new order'), 'error');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleChangeStatus = async (faq: AdminFaq, next: AdminFaqStatus) => {
    if (next === faq.status) return;
    setToggleBusyId(faq.id);
    const previous = faqs;
    setFaqs(prev => prev.map(f => (f.id === faq.id ? { ...f, status: next } : f)));
    try {
      await patchAdminFaq(faq.id, { status: next });
      showToast(`"${faq.question}" is now ${next.toLowerCase()}`, next === 'PUBLISHED' ? 'success' : 'info');
    } catch (err: any) {
      setFaqs(previous);
      showToast(faqErrorMessage(err, 'Could not update status'), 'error');
    } finally {
      setToggleBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAdminFaq(deleteTarget.id);
      showToast('FAQ deleted', 'info');
      setDeleteTarget(null);
      await fetchFaqs();
    } catch (err: any) {
      showToast(faqErrorMessage(err, 'Could not delete this FAQ'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaved = (_faq: AdminFaq, _isNew: boolean) => {
    fetchFaqs();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            CONTENT & CMS
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5 flex items-center gap-2">
            <HelpCircle size={24} className="text-allura-goldDark" />
            <span>Store FAQs</span>
            <span className="text-sm font-sans font-semibold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
              {total}
            </span>
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Manage the frequently asked questions shown on the storefront help pages.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setEditingFaq(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2.5 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            <span>Add FAQ</span>
          </button>
        )}
      </div>

      {error && <AdminErrorBanner error={error} title="Could not load FAQs" onDismiss={() => setError(null)} />}
      {error && (
        <button
          onClick={fetchFaqs}
          className="text-xs font-sans text-allura-goldDark underline -mt-4"
        >
          Retry
        </button>
      )}

      {/* Filters */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search questions or answers…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-xs font-sans bg-stone-50/60 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white transition-all text-stone-800 placeholder-stone-400"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="text-xs font-sans bg-stone-50/60 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white transition-all"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | 'draft' | 'scheduled' | 'published' | 'unpublished' | 'archived')}
            aria-label="Filter by status"
            className="text-xs font-sans bg-stone-50/60 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
            aria-label="Rows per page"
            className="text-xs font-sans bg-stone-50/60 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white transition-all"
          >
            {PAGE_SIZES.map(size => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 border border-stone-200 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Reorder save bar */}
      {isOrderDirty && (
        <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-sans text-amber-900">
          <span>You changed the order on this page. Save it, or it will be lost when you leave.</span>
          <button
            onClick={handleSaveOrder}
            disabled={isSavingOrder}
            className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-60"
          >
            {isSavingOrder ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span>Save Order</span>
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Order</th>
                <th className="p-4">Question</th>
                <th className="p-4">Category</th>
                <th className="p-4">Status</th>
                <th className="p-4">Updated</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="h-4 w-8 bg-stone-100 rounded" /></td>
                    <td className="p-4"><div className="h-4 w-48 bg-stone-100 rounded" /></td>
                    <td className="p-4"><div className="h-4 w-20 bg-stone-100 rounded" /></td>
                    <td className="p-4"><div className="h-4 w-16 bg-stone-100 rounded" /></td>
                    <td className="p-4"><div className="h-4 w-20 bg-stone-100 rounded" /></td>
                    <td className="p-4 text-right"><div className="h-4 w-16 bg-stone-100 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : orderedFaqs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-stone-400">
                    <p className="font-serif text-base text-stone-700">No FAQs match your filters</p>
                    {hasActiveFilters && (
                      <button onClick={resetFilters} className="mt-3 text-xs font-semibold text-allura-goldDark underline">
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                orderedFaqs.map((faq, index) => (
                  <tr key={faq.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-stone-500 text-[11px] w-5">{faq.sortOrder}</span>
                        <div className="flex flex-col">
                          <button
                            onClick={() => moveRow(index, 'up')}
                            disabled={index === 0}
                            aria-label="Move up"
                            className="text-stone-400 hover:text-stone-900 disabled:opacity-20"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            onClick={() => moveRow(index, 'down')}
                            disabled={index === orderedFaqs.length - 1}
                            aria-label="Move down"
                            className="text-stone-400 hover:text-stone-900 disabled:opacity-20"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 max-w-sm">
                      <p className="font-serif text-sm font-medium text-stone-900 line-clamp-1">{faq.question}</p>
                      <p className="text-[11px] text-stone-400 line-clamp-1">{faq.answer}</p>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[11px] font-semibold border border-stone-200">
                        {faq.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="relative inline-flex items-center">
                        <select
                          value={faq.status}
                          onChange={e => handleChangeStatus(faq, e.target.value as AdminFaqStatus)}
                          disabled={!canEdit || toggleBusyId === faq.id}
                          aria-label={`Status for ${faq.question}`}
                          className={`appearance-none cursor-pointer pl-2.5 pr-6 py-1 rounded-full text-[11px] font-bold uppercase border transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none ${
                            faq.status === 'PUBLISHED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : faq.status === 'SCHEDULED'
                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                : faq.status === 'DRAFT'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : faq.status === 'ARCHIVED'
                                    ? 'bg-stone-200 text-stone-600 border-stone-300'
                                    : 'bg-stone-100 text-stone-500 border-stone-200'
                          }`}
                          title={canEdit ? 'Change status' : undefined}
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="SCHEDULED">Scheduled</option>
                          <option value="PUBLISHED">Published</option>
                          <option value="UNPUBLISHED">Unpublished</option>
                          <option value="ARCHIVED">Archived</option>
                        </select>
                        {toggleBusyId === faq.id && (
                          <Loader2 size={11} className="animate-spin absolute right-1.5 pointer-events-none" />
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-stone-500 whitespace-nowrap">
                      {faq.updatedAt ? new Date(faq.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setEditingFaq(faq);
                              setIsFormOpen(true);
                            }}
                            aria-label={`Edit ${faq.question}`}
                            className="p-1.5 border border-stone-200 hover:bg-stone-100 text-stone-700 rounded-lg transition-colors"
                          >
                            <Edit3 size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget(faq)}
                            aria-label={`Delete ${faq.question}`}
                            className="p-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors"
                          >
                            <Trash2 size={13} />
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

        {!isLoading && (
          <AdminPagination currentPage={page} totalItems={total} pageSize={pageSize} onPageChange={setPage} />
        )}
      </div>

      <AdminFaqFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        faq={editingFaq}
        categories={categories}
        onSaved={handleSaved}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete FAQ"
        message={`Delete "${deleteTarget?.question}"? This cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
        isDestructive
      />
    </div>
  );
};
