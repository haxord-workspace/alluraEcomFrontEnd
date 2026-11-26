import React, { useCallback, useEffect, useState } from 'react';
import { Save, Plus, Trash2, Search, Loader2, Globe, EyeOff, ArrowLeft, TriangleAlert, X } from 'lucide-react';
import { RichTextEditor } from '../../components/admin/richtext/RichTextEditor';
import { detectStrippedFormatting, strippedFormattingMessage } from '../../components/admin/richtext/normalizeHtml';
import { getBackendFieldErrors } from '../../utils/apiResponse';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { AdminErrorBanner } from '../../components/admin/AdminErrorBanner';
import { AdminPagination } from '../../components/admin/AdminPagination';
import {
  getAdminContents,
  getAdminContentById,
  createAdminContent,
  updateAdminContent,
  deleteAdminContent,
  updateAdminContentStatus,
  contentErrorMessage,
  isContentConflict,
} from '../../service/adminContent';
import type { ContentDetail, ContentListItem, ContentStatus, ContentType } from '../../types/content';

const PAGE_SIZE = 10;
const STATUSES: ('All' | ContentStatus)[] = ['All', 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'];
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

export const AdminContentPage: React.FC = () => {
  const { hasPermission } = useAdmin();
  const { showToast } = useShop();
  const canCreate = hasPermission('cms', 'create');
  const canEdit = hasPermission('cms', 'edit');
  const canDelete = hasPermission('cms', 'delete');
  const canPublish = hasPermission('cms', 'publish');

  // List
  const [items, setItems] = useState<ContentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ContentStatus>('All');

  // Selected page / editor
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContentDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Create
  const [isCreating, setIsCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createSlugTouched, setCreateSlugTouched] = useState(false);
  const [createType, setCreateType] = useState<ContentType>('PAGE');
  const [createStatus, setCreateStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [createContent, setCreateContent] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingSubmit, setIsCreatingSubmit] = useState(false);

  // Confirm dialogs
  const [deleteTarget, setDeleteTarget] = useState<ContentListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmUnpublishOpen, setConfirmUnpublishOpen] = useState(false);

  // Rich text editor
  const [contentError, setContentError] = useState<string | null>(null); // backend error for the content field (edit)
  const [createContentError, setCreateContentError] = useState<string | null>(null); // same, for New Page
  const [formatWarning, setFormatWarning] = useState<string | null>(null); // server stripped formatting on save
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null); // waits for "discard unsaved changes?"
  const [mobileShowList, setMobileShowList] = useState(true); // below lg: list or editor, with "Back to pages"

  // Unsaved changes: the editor reports the original string back while the content is unchanged
  const isEditDirty =
    !!detail && !isCreating && (editTitle !== detail.title || editSlug !== detail.slug || editContent !== detail.content);
  const isCreateDirty = isCreating && (createTitle.trim() !== '' || createSlug.trim() !== '' || createContent.trim() !== '');
  const hasUnsavedChanges = isEditDirty || isCreateDirty;

  /** Runs `action` now, or after the admin confirms discarding unsaved changes. */
  const guardUnsaved = (action: () => void) => {
    if (hasUnsavedChanges) setPendingNav(() => action);
    else action();
  };

  // Warn before closing or reloading the tab with unsaved edits
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  const showEditorOnMobile = (isCreating || !!selectedId) && !mobileShowList;

  // Search is sent to the server; wait until typing pauses
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchContents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAdminContents({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: statusFilter === 'All' ? undefined : statusFilter,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(contentErrorMessage(err, 'Failed to load content pages'));
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  // Auto-generate the slug from the title in create mode, until the user edits it directly
  useEffect(() => {
    if (!createSlugTouched) setCreateSlug(slugify(createTitle));
  }, [createTitle, createSlugTouched]);

  const openDetail = async (id: string) => {
    setIsCreating(false);
    setSelectedId(id);
    setDetail(null);
    setDetailError(null);
    setSaveError(null);
    setIsConflict(false);
    setContentError(null);
    setFormatWarning(null);
    setMobileShowList(false);
    setIsDetailLoading(true);
    try {
      const d = await getAdminContentById(id);
      setDetail(d);
      setEditTitle(d.title);
      setEditSlug(d.slug);
      setEditContent(d.content);
    } catch (err) {
      setDetailError(contentErrorMessage(err, 'Failed to load this page'));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const startCreate = () => {
    setSelectedId(null);
    setDetail(null);
    setIsCreating(true);
    setCreateTitle('');
    setCreateSlug('');
    setCreateSlugTouched(false);
    setCreateType('PAGE');
    setCreateStatus('DRAFT');
    setCreateContent('');
    setCreateError(null);
    setCreateContentError(null);
    setFormatWarning(null);
    setMobileShowList(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setIsSaving(true);
    setSaveError(null);
    setIsConflict(false);
    setContentError(null);
    setFormatWarning(null);
    const sentContent = editContent;
    try {
      const updated = await updateAdminContent(detail.id, {
        title: editTitle.trim(),
        slug: editSlug.trim(),
        content: editContent,
        updatedAt: detail.updatedAt,
      });
      // Non-blocking: tell the admin when the server's sanitizer removed formatting
      const lost = updated.content ? detectStrippedFormatting(sentContent, updated.content) : [];
      if (lost.length) setFormatWarning(strippedFormattingMessage(lost));
      setDetail(updated);
      setEditTitle(updated.title);
      setEditSlug(updated.slug);
      setEditContent(updated.content);
      setItems(prev => prev.map(it => (it.id === updated.id ? { ...it, title: updated.title, slug: updated.slug, updatedAt: updated.updatedAt } : it)));
      showToast('Page saved', 'success');
    } catch (err) {
      if (isContentConflict(err)) {
        setIsConflict(true);
        setSaveError('This page was updated by another admin. Reload to get the latest version.');
      } else {
        setSaveError(contentErrorMessage(err, 'Failed to save page'));
        setContentError(getBackendFieldErrors(err).content || null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReload = () => {
    if (detail) openDetail(detail.id);
  };

  const applyStatusChange = async (nextStatus: 'DRAFT' | 'PUBLISHED') => {
    if (!detail) return;
    setIsPublishing(true);
    try {
      const updated = await updateAdminContentStatus(detail.id, { status: nextStatus });
      setDetail(updated);
      setItems(prev => prev.map(it => (it.id === updated.id ? { ...it, status: updated.status, updatedAt: updated.updatedAt } : it)));
      showToast(nextStatus === 'PUBLISHED' ? 'Page published' : 'Page unpublished', 'success');
    } catch (err) {
      showToast(contentErrorMessage(err, 'Failed to update status'), 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleToggleStatus = () => {
    if (!detail) return;
    if (detail.status === 'PUBLISHED') {
      setConfirmUnpublishOpen(true);
    } else {
      applyStatusChange('PUBLISHED');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const title = createTitle.trim();
    const slug = createSlug.trim();
    if (!title) return setCreateError('Title is required.');
    if (!SLUG_RE.test(slug)) return setCreateError('Slug must be lowercase letters/numbers separated by hyphens, e.g. about-us.');
    if (!createContent.trim()) return setCreateError('Content is required.');

    setIsCreatingSubmit(true);
    setCreateContentError(null);
    try {
      const created = await createAdminContent({ title, slug, type: createType, status: createStatus, content: createContent });
      const lost = created.content ? detectStrippedFormatting(createContent, created.content) : [];
      setFormatWarning(lost.length ? strippedFormattingMessage(lost) : null);
      showToast('Page created', 'success');
      setIsCreating(false);
      setPage(1);
      setSearch('');
      setSearchInput('');
      setStatusFilter('All');
      fetchContents();
      setSelectedId(created.id);
      setDetail(created);
      setEditTitle(created.title);
      setEditSlug(created.slug);
      setEditContent(created.content);
    } catch (err: any) {
      if (err?.response?.status === 409) setCreateError('A page with this slug already exists.');
      else setCreateError(contentErrorMessage(err, 'Failed to create page'));
      setCreateContentError(getBackendFieldErrors(err).content || null);
    } finally {
      setIsCreatingSubmit(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAdminContent(deleteTarget.id);
      showToast('Page deleted', 'success');
      if (selectedId === deleteTarget.id) {
        setSelectedId(null);
        setDetail(null);
      }
      if (items.length === 1 && page > 1) {
        setPage(p => p - 1);
      } else {
        fetchContents();
      }
    } catch (err) {
      showToast(contentErrorMessage(err, 'Failed to delete page'), 'error');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Publish / Save buttons of the editor (markup moved here unchanged from the editor header)
  const renderEditActions = (detail: ContentDetail) => (
    <>
      {canPublish && (
        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={isPublishing}
          className="px-3.5 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {isPublishing ? (
            <Loader2 size={13} className="animate-spin" />
          ) : detail.status === 'PUBLISHED' ? (
            <EyeOff size={13} />
          ) : (
            <Globe size={13} />
          )}
          <span>{detail.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</span>
        </button>
      )}
      {canEdit && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          <span>{isSaving ? 'Saving…' : 'Save Page'}</span>
        </button>
      )}
    </>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            CMS & STORE POLICIES
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Content Management ({total})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Publish brand story narratives, sustainability manifestos, and legal shipping/return policies.
          </p>
        </div>
        {canCreate && (
          <button
            // Previously: onClick={startCreate} — now asks first when there are unsaved changes
            onClick={() => guardUnsaved(startCreate)}
            className="px-4 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs flex items-center gap-1.5 self-start sm:self-center"
          >
            <Plus size={14} />
            <span>New Page</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchContents} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* Grid: Pages list & Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Pages List (1 Col) — below lg it is hidden while a page is open in the editor ("Back to pages" shows it) */}
        <div
          className={`bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3 text-xs font-sans ${
            showEditorOnMobile ? 'hidden lg:block' : ''
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">STORE PAGES</span>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {STATUSES.map(st => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-sans font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === st ? 'bg-[#561C08] text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {st === 'All' ? 'All' : String(st)}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {isLoading && items.length === 0 ? (
              <p className="text-stone-400 text-center py-6">Loading pages…</p>
            ) : items.length === 0 ? (
              <p className="text-stone-400 text-center py-6">
                {search || statusFilter !== 'All' ? 'No pages match these filters.' : 'No pages yet.'}
              </p>
            ) : (
              items.map(p => (
                <div
                  key={p.id}
                  // Previously: onClick={() => openDetail(p.id)} — now asks first when there are unsaved
                  // changes; re-selecting the open page only switches back to the editor on mobile
                  onClick={() => {
                    if (p.id === selectedId && !isCreating && detail) setMobileShowList(false);
                    else guardUnsaved(() => openDetail(p.id));
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedId === p.id ? 'border-stone-900 bg-stone-50 shadow-xs' : 'border-stone-100 hover:border-stone-200'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-serif text-sm font-bold text-stone-900 truncate">{p.title || '—'}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusBadge status={p.status} size="sm" />
                      {canDelete && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setDeleteTarget(p);
                          }}
                          title="Delete page"
                          className="p-1 text-stone-400 hover:text-rose-700 rounded-md hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-400 font-mono mt-1">
                    /{p.slug || '—'} · {p.type} · Updated {formatDateTime(p.updatedAt)}
                  </p>
                </div>
              ))
            )}
          </div>

          <AdminPagination currentPage={page} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>

        {/* Content Editor (2 Cols) — below lg it replaces the list while a page is open */}
        <div
          className={`lg:col-span-2 min-w-0 bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5 text-xs font-sans ${
            showEditorOnMobile ? '' : 'hidden lg:block'
          }`}
        >
          {showEditorOnMobile && (
            <button
              type="button"
              onClick={() => {
                setMobileShowList(true);
                window.scrollTo({ top: 0 });
              }}
              className="lg:hidden -mt-1 inline-flex items-center gap-1.5 min-h-11 pr-3 text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-stone-900"
            >
              <ArrowLeft size={15} />
              Back to pages
            </button>
          )}
          {isCreating ? (
            <>
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <h3 className="font-serif text-xl font-normal text-stone-900">New Page</h3>
              </div>

              {createError && <AdminErrorBanner error={createError} onDismiss={() => setCreateError(null)} title="Could not create page" />}

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">Page Title</label>
                  <input
                    type="text"
                    maxLength={150}
                    value={createTitle}
                    onChange={e => setCreateTitle(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-serif text-base font-bold text-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">Slug</label>
                  <input
                    type="text"
                    value={createSlug}
                    onChange={e => {
                      setCreateSlug(e.target.value);
                      setCreateSlugTouched(true);
                    }}
                    placeholder="about-us"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-xs text-stone-800"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Lowercase letters and numbers, separated by hyphens.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">Type</label>
                    <select
                      value={createType}
                      onChange={e => setCreateType(e.target.value as ContentType)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
                    >
                      <option value="PAGE">PAGE</option>
                      <option value="POLICY">POLICY</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">Initial Status</label>
                    <select
                      value={createStatus}
                      onChange={e => setCreateStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="PUBLISHED">PUBLISHED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label id="cms-create-content-label" htmlFor="cms-create-content" className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
                    Editorial Content
                  </label>
                  {/* Replaced by the rich text editor (same createContent state; falls back to this textarea if the editor cannot load):
                  <textarea
                    rows={10}
                    value={createContent}
                    onChange={e => setCreateContent(e.target.value)}
                    className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans leading-relaxed text-stone-800"
                  />
                  */}
                  <RichTextEditor
                    id="cms-create-content"
                    labelledBy="cms-create-content-label"
                    resetKey="create"
                    value={createContent}
                    onChange={setCreateContent}
                    error={createContentError}
                    previewTitle={createTitle}
                    placeholder="Write the page content…"
                  />
                </div>

                {/* Below lg the buttons stick to the bottom of the screen */}
                <div className="flex items-center gap-2 max-lg:sticky max-lg:bottom-0 max-lg:z-20 max-lg:-mx-4 sm:max-lg:-mx-6 max-lg:px-4 sm:max-lg:px-6 max-lg:py-3 max-lg:bg-white/95 max-lg:backdrop-blur-sm max-lg:border-t max-lg:border-stone-100 max-lg:[&>button]:min-h-11">
                  <button
                    type="submit"
                    disabled={isCreatingSubmit}
                    className="px-5 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isCreatingSubmit ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>{isCreatingSubmit ? 'Creating…' : 'Create Page'}</span>
                  </button>
                  <button
                    type="button"
                    // Previously: onClick={() => setIsCreating(false)} — now asks first when there are unsaved changes
                    onClick={() =>
                      guardUnsaved(() => {
                        setIsCreating(false);
                        setMobileShowList(true);
                      })
                    }
                    className="px-5 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl font-bold uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          ) : isDetailLoading ? (
            <div className="flex flex-col items-center gap-2 py-16 text-stone-400">
              <Loader2 size={22} className="animate-spin" />
              <span>Loading page…</span>
            </div>
          ) : detailError ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
              <span>{detailError}</span>
              {selectedId && (
                <button onClick={() => openDetail(selectedId)} className="font-bold underline">Retry</button>
              )}
            </div>
          ) : detail ? (
            <>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-stone-100 pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-xl font-normal text-stone-900">Page Content Editor</h3>
                    <StatusBadge status={detail.status} size="sm" />
                    <span className="text-[10px] font-sans font-semibold text-stone-400 uppercase">{detail.type}</span>
                    {isEditDirty && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                        Unsaved changes
                      </span>
                    )}
                  </div>
                  <p className="text-stone-400 font-mono text-[11px]">/{detail.slug}</p>
                </div>

                {/* Publish / Save — the button markup is unchanged, moved into renderEditActions() so the
                    same buttons can also be shown in the sticky bottom bar below lg */}
                <div className="hidden lg:flex items-center gap-2">{renderEditActions(detail)}</div>
              </div>

              {saveError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center justify-between gap-3">
                  <span>{saveError}</span>
                  {isConflict && (
                    <button onClick={handleReload} className="font-bold underline shrink-0">Reload</button>
                  )}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                {/* min-w-0: a fieldset is min-content wide by default, which would stop the editor toolbar from scrolling on phones */}
                <fieldset disabled={!canEdit} className="space-y-4 min-w-0">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">Page Title</label>
                    <input
                      type="text"
                      maxLength={150}
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-serif text-base font-bold text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">Slug</label>
                    <input
                      type="text"
                      value={editSlug}
                      onChange={e => setEditSlug(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-xs text-stone-800"
                    />
                  </div>

                  <div>
                    <label id="cms-edit-content-label" htmlFor="cms-edit-content" className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
                      Editorial Content
                    </label>
                    {/* Replaced by the rich text editor (same editContent state; falls back to this textarea if the editor cannot load):
                    <textarea
                      rows={10}
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans leading-relaxed text-stone-800"
                    />
                    */}
                    <RichTextEditor
                      id="cms-edit-content"
                      labelledBy="cms-edit-content-label"
                      // A different page, or the version returned by a save, loads fresh (no leftover undo history)
                      resetKey={`${detail.id}:${detail.updatedAt}`}
                      value={editContent}
                      onChange={setEditContent}
                      disabled={!canEdit}
                      error={contentError}
                      previewTitle={editTitle}
                    />
                  </div>
                </fieldset>
              </form>

              {formatWarning && (
                <div role="status" className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start justify-between gap-3">
                  <span className="flex items-start gap-1.5">
                    <TriangleAlert size={14} className="shrink-0 mt-px" />
                    {formatWarning}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormatWarning(null)}
                    aria-label="Dismiss"
                    className="shrink-0 p-1 -m-1 rounded-md hover:bg-amber-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <p className="text-[10px] text-stone-400">
                Created {formatDateTime(detail.createdAt)} · Last updated {formatDateTime(detail.updatedAt)}
              </p>

              {/* Below lg: Publish / Save stay at the bottom of the screen */}
              {(canPublish || canEdit) && (
                <div className="lg:hidden sticky bottom-0 z-20 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 py-3 bg-white/95 backdrop-blur-sm border-t border-stone-100 rounded-b-2xl flex items-center justify-end gap-2 [&>button]:min-h-11 [&>button]:flex-1 sm:[&>button]:flex-none">
                  {isEditDirty && <span className="sr-only">Unsaved changes</span>}
                  {renderEditActions(detail)}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-stone-400 gap-2">
              <span>Select a page from the list to edit, or create a new one.</span>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirmed}
        title="Delete this page?"
        message={`"${deleteTarget?.title}" will be removed from the store. This can be undone by the backend team if needed, but it will disappear from this list immediately.`}
        confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
        isDestructive
      />

      <ConfirmModal
        isOpen={confirmUnpublishOpen}
        onClose={() => setConfirmUnpublishOpen(false)}
        onConfirm={() => applyStatusChange('DRAFT')}
        title="Unpublish this page?"
        message="This page will stop showing on the live storefront until it's published again."
        confirmLabel="Unpublish"
        isDestructive
      />

      <ConfirmModal
        isOpen={!!pendingNav}
        onClose={() => setPendingNav(null)}
        onConfirm={() => pendingNav?.()}
        title="Discard unsaved changes?"
        message="You have changes on this page that have not been saved. If you continue, they will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        isDestructive
      />
    </div>
  );
};
