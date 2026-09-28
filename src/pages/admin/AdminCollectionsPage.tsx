import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit3, Trash2, RefreshCw, AlertTriangle, Star, ChevronDown, ChevronUp, ImageOff } from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ImageUploadDropzone } from '../../components/admin/ImageUploadDropzone';
import { useShop } from '../../context/ShopContext';
import {
  getAdminCollections,
  createAdminCollection,
  updateAdminCollection,
  deleteAdminCollection,
} from '../../service/collection';
import type { CollectionPayload } from '../../service/collection';
import { resizeImageSource, slugify } from '../../utils/image';
import type { AdminCollection } from '../../types';

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  imageAlt: '',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
  sortOrder: 0,
  isFeatured: false,
  status: 'ACTIVE',
};

type CollectionForm = typeof EMPTY_FORM;

const MAIN_IMAGE_MAX = 1600;
const THUMBNAIL_MAX = 400;

const imageOf = (col: AdminCollection): { url?: string; thumbnailUrl?: string; alt?: string } =>
  typeof col.image === 'string' ? { url: col.image } : col.image || {};

export const AdminCollectionsPage: React.FC = () => {
  const { showToast } = useShop();
  const [collections, setCollections] = useState<AdminCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<CollectionForm>(EMPTY_FORM);
  // Slug follows the name until the admin edits it by hand
  const [slugTouched, setSlugTouched] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  // Existing thumbnail, reused when the image hasn't changed
  const [originalImage, setOriginalImage] = useState<{ url?: string; thumbnailUrl?: string }>({});

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<AdminCollection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCollections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminCollections();
      setCollections(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load collections');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCollections(); }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM, sortOrder: collections.length });
    setSlugTouched(false);
    setShowSeo(false);
    setOriginalImage({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (col: AdminCollection) => {
    const image = imageOf(col);
    setEditingId(col.id);
    setFormData({
      name: col.name || '',
      slug: col.slug || '',
      description: col.description || '',
      imageUrl: image.url || '',
      imageAlt: image.alt || '',
      seoTitle: col.seo?.title || '',
      seoDescription: col.seo?.description || '',
      seoKeywords: Array.isArray(col.seo?.keywords) ? col.seo.keywords.join(', ') : '',
      sortOrder: typeof col.sortOrder === 'number' ? col.sortOrder : 0,
      isFeatured: !!col.isFeatured,
      status: col.status || 'ACTIVE',
    });
    setSlugTouched(true);
    setShowSeo(!!(col.seo?.title || col.seo?.description || col.seo?.keywords?.length));
    setOriginalImage({ url: image.url, thumbnailUrl: image.thumbnailUrl });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (col: AdminCollection) => {
    setDeleteTarget(col);
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAdminCollection(deleteTarget.id);
      setCollections(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error: any) {
      console.error('Failed to delete collection:', error);
      showToast(error?.response?.data?.message || 'Failed to delete collection', 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, showToast]);

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  const buildImage = async (): Promise<CollectionPayload['image']> => {
    const url = formData.imageUrl.trim();
    if (!url) return undefined;
    const alt = formData.imageAlt.trim() || formData.name.trim();

    // Unchanged image: keep what the server already has
    if (url === originalImage.url) {
      return { url, thumbnailUrl: originalImage.thumbnailUrl || url, alt };
    }
    // Uploaded files arrive as full-size base64, so shrink them and derive a thumbnail
    const [mainUrl, thumbnailUrl] = await Promise.all([
      resizeImageSource(url, MAIN_IMAGE_MAX),
      resizeImageSource(url, THUMBNAIL_MAX),
    ]);
    return { url: mainUrl, thumbnailUrl, alt };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSaving(true);

    try {
      const keywords = formData.seoKeywords.split(',').map(k => k.trim()).filter(Boolean);
      const hasSeo = formData.seoTitle.trim() || formData.seoDescription.trim() || keywords.length > 0;

      const payload: CollectionPayload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || slugify(formData.name),
        ...(formData.description.trim() ? { description: formData.description.trim() } : {}),
        ...(formData.imageUrl.trim() ? { image: await buildImage() } : {}),
        ...(hasSeo
          ? {
              seo: {
                ...(formData.seoTitle.trim() ? { title: formData.seoTitle.trim() } : {}),
                ...(formData.seoDescription.trim() ? { description: formData.seoDescription.trim() } : {}),
                ...(keywords.length ? { keywords } : {}),
              },
            }
          : {}),
        sortOrder: Number(formData.sortOrder) || 0,
        isFeatured: formData.isFeatured,
        status: formData.status,
      };

      if (editingId) {
        const updated = await updateAdminCollection(editingId, payload);
        setCollections(collections.map(c => (c.id === editingId ? updated : c)));
        showToast('Collection updated', 'success');
      } else {
        const created = await createAdminCollection(payload);
        setCollections([...collections, created]);
        showToast('Collection created', 'success');
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Failed to save collection:', error);
      const body = error?.response?.data;
      showToast(body?.error?.details?.[0]?.message || body?.message || 'Failed to save collection', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const sorted = [...collections].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            EDITORIAL CURATION
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Store Collections ({collections.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Seasonal edits, festive campaigns, and curated atelier capsule stories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCollections}
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            <span>New Collection</span>
          </button>
        </div>
      </div>

      {/* Collections Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-sans text-stone-500">Loading collections...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-xs font-sans text-rose-600 font-semibold">{error}</p>
              <button
                onClick={fetchCollections}
                className="mt-3 text-xs font-sans text-stone-500 hover:text-stone-900 underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                  <th className="p-4">Collection</th>
                  <th className="p-4">Slug</th>
                  <th className="p-4 text-center">Order</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sorted.map(col => {
                  const image = imageOf(col);
                  const thumb = image.thumbnailUrl || image.url;
                  return (
                    <tr key={col.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {thumb ? (
                            <img src={thumb} alt={image.alt || col.name} className="w-12 h-12 object-cover rounded-lg bg-stone-100" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center text-stone-300">
                              <ImageOff size={16} />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-serif text-sm font-medium text-stone-900">{col.name}</span>
                              {col.isFeatured && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full uppercase">
                                  <Star size={8} className="fill-current" /> Featured
                                </span>
                              )}
                            </div>
                            {col.description && (
                              <p className="text-[11px] text-stone-500 line-clamp-1 max-w-xs">{col.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-stone-500">{col.slug || '—'}</td>
                      <td className="p-4 text-center font-mono text-stone-700">{col.sortOrder ?? 0}</td>
                      <td className="p-4">
                        <StatusBadge status={col.status} size="sm" />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(col)}
                            className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg"
                            title="Edit"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(col)}
                            className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {collections.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-500">
                      No collections found. Click 'New Collection' to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Collection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="font-serif text-xl text-stone-900">
              {editingId ? 'Edit Collection' : 'New Collection'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Collection Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => {
                      const name = e.target.value;
                      setFormData(prev => ({ ...prev, name, slug: slugTouched ? prev.slug : slugify(name) }));
                    }}
                    placeholder="e.g. Summer Collection"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Slug (URL)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={e => {
                      setSlugTouched(true);
                      setFormData({ ...formData, slug: slugify(e.target.value) });
                    }}
                    placeholder="summer-collection"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:outline-none focus:border-stone-800"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">/collections/{formData.slug || 'your-slug'}</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of the collection"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl resize-none focus:outline-none focus:border-stone-800"
                />
              </div>

              {/* Image */}
              <ImageUploadDropzone
                label="Collection Image"
                value={formData.imageUrl}
                onChange={url => setFormData({ ...formData, imageUrl: url })}
                aspectRatioLabel="Recommended: 1200×1500px (portrait) or 1920×800px (banner)"
                helperText="A thumbnail is created automatically for uploaded images."
                presets={[
                  { label: 'Ethnic Anarkali', url: '/images/best-sellers/classic-cream-anarkali.jpeg' },
                  { label: 'Modest Embroidered', url: '/images/best-sellers/aura-cream-embroidered.jpeg' },
                ]}
              />
              {formData.imageUrl && (
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Image Alt Text</label>
                  <input
                    type="text"
                    value={formData.imageAlt}
                    onChange={e => setFormData({ ...formData, imageAlt: e.target.value })}
                    placeholder={formData.name ? `e.g. ${formData.name} lookbook` : 'Describe the image for accessibility & SEO'}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Sort Order</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.sortOrder}
                    onChange={e => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:outline-none focus:border-stone-800"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Lower numbers show first</p>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Featured</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isFeatured: !formData.isFeatured })}
                    className={`w-full p-2.5 rounded-xl border flex items-center gap-2 transition-colors ${
                      formData.isFeatured ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-stone-200 bg-stone-50 text-stone-500'
                    }`}
                  >
                    <Star size={13} className={formData.isFeatured ? 'fill-current' : ''} />
                    {formData.isFeatured ? 'Featured on storefront' : 'Not featured'}
                  </button>
                </div>
              </div>

              {/* SEO */}
              <div className="border border-stone-200 rounded-xl">
                <button
                  type="button"
                  onClick={() => setShowSeo(!showSeo)}
                  className="w-full flex items-center justify-between p-3 text-[10px] uppercase font-bold text-stone-500"
                >
                  <span>SEO (optional)</span>
                  {showSeo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showSeo && (
                  <div className="px-3 pb-3 space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">SEO Title</label>
                      <input
                        type="text"
                        value={formData.seoTitle}
                        onChange={e => setFormData({ ...formData, seoTitle: e.target.value })}
                        placeholder={formData.name || 'SEO Title'}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Meta Description</label>
                        <span className={`text-[10px] ${formData.seoDescription.length > 160 ? 'text-rose-600' : 'text-stone-400'}`}>
                          {formData.seoDescription.length}/160
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={formData.seoDescription}
                        onChange={e => setFormData({ ...formData, seoDescription: e.target.value })}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl resize-none focus:outline-none focus:border-stone-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Keywords</label>
                      <input
                        type="text"
                        value={formData.seoKeywords}
                        onChange={e => setFormData({ ...formData, seoKeywords: e.target.value })}
                        placeholder="fashion, summer (comma separated)"
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-stone-900">
                  Delete Collection
                </h3>
                <p className="text-xs font-sans text-stone-500 mt-1">
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-stone-700">"{deleteTarget.name}"</span>?
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="px-4 py-2 border border-stone-200 rounded-xl text-xs font-sans text-stone-500 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
