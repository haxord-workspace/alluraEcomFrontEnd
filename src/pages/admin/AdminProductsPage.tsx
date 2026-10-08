import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
  Barcode,
  RefreshCw,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { CategorySelect } from '../../components/admin/CategorySelect';
import {
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  updateAdminProductStatus,
} from '../../service/adminProducts';
import {
  createAdminVariant,
  updateAdminVariant,
  deleteAdminVariant,
  getAdminVariantsByProduct,
  getAdminVariants,
} from '../../service/adminVariants';
import type { VariantPayload } from '../../service/adminVariants';
import { ProductVariantsEditor, buildVariantSku } from '../../components/admin/ProductVariantsEditor';
import { ProductImagesEditor } from '../../components/admin/ProductImagesEditor';
import type { VariantRow } from '../../components/admin/ProductVariantsEditor';
import { useShop } from '../../context/ShopContext';
import type { AdminProduct, AdminProductVariant } from '../../types';

// Default form state
const EMPTY_FORM = {
  name: '',
  sku: '',
  description: '',
  shortDescription: '',
  categoryId: '',
  pricing: { mrp: 0, sellingPrice: 0, currency: 'INR' },
  status: 'ACTIVE' as AdminProduct['status'],
  images: [] as { url: string; isPrimary?: boolean }[],
  variants: [] as VariantRow[],
};

type ProductPricing = typeof EMPTY_FORM.pricing;

// What we send to the variants API for a row (blank price = inherit the product's)
const toVariantPayload = (v: VariantRow, productSku: string, pricing: ProductPricing): Omit<VariantPayload, 'productId'> => {
  const sellingPrice = v.price ?? pricing.sellingPrice;
  return {
    sku: v.sku.trim() || buildVariantSku(productSku, v.color, v.size),
    attributes: {
      ...(v.color ? { color: v.color } : {}),
      ...(v.size ? { size: v.size } : {}),
    },
    pricing: {
      mrp: v.mrp ?? Math.max(pricing.mrp, sellingPrice),
      sellingPrice,
      currency: pricing.currency,
    },
    // Match the Variants page payload (which the backend accepts): only send images when there are some
    ...(v.images?.length ? { images: v.images } : {}),
  };
};

const apiErrorMessage = (err: any, fallback: string): string =>
  err?.response?.data?.error?.details?.[0]?.message || err?.response?.data?.message || fallback;

// One retry for transient failures (server error, rate limit, network drop)
const withRetry = async <T,>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (err: any) {
    const status = err?.response?.status;
    if (status && status < 500 && status !== 429) throw err;
    await new Promise(resolve => setTimeout(resolve, 800));
    return fn();
  }
};

const variantLabel = (v: VariantRow, sku: string) => [v.color, v.size].filter(Boolean).join(' / ') || sku;

const toVariantRow = (v: AdminProductVariant, pricing: ProductPricing): VariantRow => ({
  id: v.id,
  sku: v.sku || '',
  color: v.attributes?.color || '',
  size: v.attributes?.size || '',
  price: v.pricing?.sellingPrice !== undefined && v.pricing.sellingPrice !== pricing.sellingPrice ? v.pricing.sellingPrice : undefined,
  mrp: v.pricing?.mrp !== undefined && v.pricing.mrp !== pricing.mrp ? v.pricing.mrp : undefined,
  images: v.images || [],
  status: v.status,
});

export const AdminProductsPage: React.FC = () => {
  const { hasPermission } = useAdmin();
  const { showToast } = useShop();

  // ── API state ──────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // ── Bulk selection ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Delete confirm ─────────────────────────────────────────────────────────
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);

  // ── Create / Edit modal ────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  // Snapshot of the variants as loaded, to work out what to create / update / delete on save
  const [originalVariants, setOriginalVariants] = useState<Record<string, string>>({});
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────
  // Variant prices per product, to flag products whose variants are priced differently
  const [variantPrices, setVariantPrices] = useState<Record<string, number[]>>({});

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, variants] = await Promise.all([getAdminProducts(), getAdminVariants().catch(() => [])]);
      setProducts(data);
      const byProduct: Record<string, number[]> = {};
      variants.forEach(v => {
        const price = v.pricing?.sellingPrice;
        if (v.productId && typeof price === 'number') (byProduct[v.productId] ||= []).push(price);
      });
      setVariantPrices(byProduct);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // ── Filtered view ──────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const matchesStatus = selectedStatus === 'All' || p.status === selectedStatus;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  // ── Selection helpers ──────────────────────────────────────────────────────
  const handleSelectAll = () => {
    setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(p => p.id));
  };
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // ── Bulk status change ─────────────────────────────────────────────────────
  const handleBulkArchive = async () => {
    await Promise.all(selectedIds.map(id => updateAdminProductStatus(id, 'ARCHIVED')));
    setSelectedIds([]);
    fetchProducts();
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await updateAdminProductStatus(deleteModal.id, 'ARCHIVED');
      setProducts(products.filter(p => p.id !== deleteModal.id));
    } catch (err) {
      console.error('Failed to archive product:', err);
    } finally {
      setDeleteModal(null);
    }
  };

  // ── Open add / edit ────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setOriginalVariants({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: AdminProduct) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      shortDescription: product.shortDescription || '',
      categoryId: product.categoryId || '',
      pricing: {
        mrp: product.pricing.mrp,
        sellingPrice: product.pricing.sellingPrice,
        currency: product.pricing.currency || 'INR',
      },
      status: product.status,
      images: product.images || [],
      variants: [],
    });
    setOriginalVariants({});
    setIsModalOpen(true);

    // Load this product's existing colour / size variants
    const pricing = { mrp: product.pricing.mrp, sellingPrice: product.pricing.sellingPrice, currency: product.pricing.currency || 'INR' };
    setIsLoadingVariants(true);
    getAdminVariantsByProduct(product.id)
      .then(list => {
        const rows = list.map(v => toVariantRow(v, pricing));
        setFormData(prev => ({ ...prev, variants: rows }));
        setOriginalVariants(
          Object.fromEntries(rows.map(r => [r.id!, JSON.stringify(toVariantPayload(r, product.sku, pricing))]))
        );
      })
      .catch(err => {
        console.error('Failed to load variants:', err);
        showToast('Could not load this product\'s variants', 'error');
      })
      .finally(() => setIsLoadingVariants(false));
  };

  // Creates new rows, patches changed ones and deletes removed ones. Returns the error messages.
  // Saves variants ONE AT A TIME (the backend fails when several are created for a product in parallel).
  // Returns the rows with the ids of newly created variants filled in, so a retry never duplicates them.
  const syncVariants = async (productId: string, productSku: string, pricing: ProductPricing, rows: VariantRow[]) => {
    const snapshot = { ...originalVariants };
    const errors: string[] = [];
    const currentIds = new Set(rows.filter(r => r.id).map(r => r.id!));
    const toDelete = Object.keys(originalVariants).filter(id => !currentIds.has(id));
    const toSave = rows.filter(r => !r.id || snapshot[r.id] !== JSON.stringify(toVariantPayload(r, productSku, pricing)));
    const total = toDelete.length + toSave.length;
    let done = 0;
    const tick = () => setSaveProgress(`Saving variants ${++done}/${total}…`);

    for (const id of toDelete) {
      tick();
      try {
        await withRetry(() => deleteAdminVariant(id));
        delete snapshot[id];
      } catch (err) {
        errors.push(`Delete failed: ${apiErrorMessage(err, 'server error')}`);
      }
    }

    const nextRows: VariantRow[] = [];
    for (const r of rows) {
      const payload = toVariantPayload(r, productSku, pricing);
      const key = JSON.stringify(payload);
      if (r.id && snapshot[r.id] === key) {
        nextRows.push(r);
        continue;
      }
      tick();
      try {
        if (!r.id) {
          const created = await withRetry(() => createAdminVariant({ productId, ...payload, status: 'ACTIVE' }));
          const row = { ...r, id: created?.id, sku: payload.sku };
          if (row.id) snapshot[row.id] = key;
          nextRows.push(row);
        } else {
          await withRetry(() => updateAdminVariant(r.id!, payload));
          snapshot[r.id] = key;
          nextRows.push(r);
        }
      } catch (err) {
        errors.push(`${variantLabel(r, payload.sku)}: ${apiErrorMessage(err, 'server error')}`);
        nextRows.push(r);
      }
    }

    return { rows: nextRows, snapshot, errors };
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { variants, ...productPayload } = formData;

      let saved: AdminProduct;
      if (editingId) {
        saved = await updateAdminProduct(editingId, productPayload);
        setProducts(products.map(p => (p.id === editingId ? saved : p)));
      } else {
        saved = await createAdminProduct(productPayload);
        setProducts([saved, ...products]);
      }

      const result = await syncVariants(saved.id, saved.sku || formData.sku, formData.pricing, variants);
      // Remember what now exists on the server so "Save" again only retries what failed
      setOriginalVariants(result.snapshot);
      setFormData(prev => ({ ...prev, variants: result.rows }));
      if (result.errors.length > 0) {
        if (!editingId) setEditingId(saved.id);
        showToast(
          `Product saved, but ${result.errors.length} variant(s) failed. Click Save again to retry. ${result.errors[0]}`,
          'error'
        );
        return;
      }

      showToast(editingId ? 'Product updated' : 'Product created', 'success');
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save product:', err);
      showToast(err?.response?.data?.error?.details?.[0]?.message || err?.response?.data?.message || 'Failed to save product', 'error');
    } finally {
      setIsSaving(false);
      setSaveProgress('');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            CATALOG MANAGEMENT
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Products ({products.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Create, edit, pricing, SKU barcodes, and multi-variant combinations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProducts}
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <Link
            to="/admin/barcodes"
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-sans font-semibold transition-colors flex items-center gap-1.5"
          >
            <Barcode size={14} />
            <span>Scan / Print Barcodes</span>
          </Link>

          {hasPermission('products', 'create') && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>Add New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-700 focus:outline-none"
            >
              <option value="All">Status: All</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-stone-900 text-white p-3 rounded-xl flex items-center justify-between text-xs font-sans animate-slide-up">
            <span className="font-semibold">{selectedIds.length} item(s) selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkArchive}
                className="px-3 py-1 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-200"
              >
                Archive Selected
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1 text-stone-400 hover:text-white"
              >
                Deselect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-sans text-stone-500">Loading products from catalog...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-xs font-sans text-rose-600 font-semibold">{error}</p>
              <button
                onClick={fetchProducts}
                className="mt-3 text-xs font-sans text-stone-500 hover:text-stone-900 underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                  <th className="p-4 w-10">
                    <button onClick={handleSelectAll} className="p-0.5">
                      {selectedIds.length > 0 && selectedIds.length === filtered.length ? (
                        <CheckSquare size={16} className="text-stone-900" />
                      ) : (
                        <Square size={16} className="text-stone-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Product Details</th>
                  <th className="p-4">Selling Price</th>
                  <th className="p-4">MRP</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(product => {
                  const isChecked = selectedIds.includes(product.id);
                  const primaryImage = product.images?.find(img => img.isPrimary)?.url
                    || product.images?.[0]?.url;

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-stone-50/70 transition-colors ${isChecked ? 'bg-amber-50/20' : ''}`}
                    >
                      <td className="p-4">
                        <button onClick={() => handleToggleSelect(product.id)} className="p-0.5">
                          {isChecked ? (
                            <CheckSquare size={16} className="text-stone-900" />
                          ) : (
                            <Square size={16} className="text-stone-300" />
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {primaryImage ? (
                            <img
                              src={primaryImage}
                              alt={product.name}
                              className="w-12 h-16 object-cover rounded-lg bg-stone-100 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-16 rounded-lg bg-stone-100 flex-shrink-0 flex items-center justify-center">
                              <span className="text-[8px] text-stone-400 font-mono">NO IMG</span>
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <p className="font-serif text-sm font-medium text-stone-900 leading-tight">
                              {product.name}
                            </p>
                            <p className="font-mono text-[10px] text-stone-400">SKU: {product.sku}</p>
                            {product.shortDescription && (
                              <p className="text-[10px] text-stone-500 max-w-xs truncate">
                                {product.shortDescription}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-stone-900">
                          {product.pricing.currency === 'INR' ? '₹' : product.pricing.currency}{' '}
                          {product.pricing.sellingPrice.toLocaleString('en-IN')}
                        </p>
                        {(() => {
                          const different = [...new Set(variantPrices[product.id] || [])].filter(p => p !== product.pricing.sellingPrice);
                          if (different.length === 0) return null;
                          const min = Math.min(...different);
                          const max = Math.max(...different);
                          return (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(product)}
                              className="mt-1 text-left text-[10px] font-semibold text-amber-700 hover:underline"
                              title="Customers are charged the variant price. Click to review."
                            >
                              ⚠ Variants: ₹{min.toLocaleString('en-IN')}{max !== min ? `–₹${max.toLocaleString('en-IN')}` : ''}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <p className="text-stone-400 line-through text-[11px]">
                          {product.pricing.currency === 'INR' ? '₹' : product.pricing.currency}{' '}
                          {product.pricing.mrp.toLocaleString('en-IN')}
                        </p>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={product.status} size="sm" />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasPermission('products', 'edit') && (
                            <button
                              onClick={() => handleOpenEdit(product)}
                              title="Edit Product"
                              className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100"
                            >
                              <Edit3 size={14} />
                            </button>
                          )}
                          {hasPermission('products', 'delete') && (
                            <button
                              onClick={() => setDeleteModal({ id: product.id, name: product.name })}
                              title="Archive Product"
                              className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-stone-500">
                      No products found. {searchQuery && 'Try clearing your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto py-10">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl h-max my-auto">
            <h3 className="font-serif text-xl text-stone-900">
              {editingId ? 'Edit Product' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4 text-xs font-sans">

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Product Name *</label>
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">SKU *</label>
                  <input
                    required
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:outline-none focus:border-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Short Description</label>
                <input
                  value={formData.shortDescription}
                  onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Category</label>
                <CategorySelect
                  value={formData.categoryId}
                  onChange={categoryId => setFormData({ ...formData, categoryId })}
                  placeholder="Select a category"
                />
              </div>

              {/* Pricing */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-2">Pricing</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-stone-400 mb-1">MRP *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={0.01}
                      value={formData.pricing.mrp}
                      onChange={e => setFormData({
                        ...formData,
                        pricing: { ...formData.pricing, mrp: parseFloat(e.target.value) || 0 },
                      })}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:outline-none focus:border-stone-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-400 mb-1">Selling Price *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={0.01}
                      value={formData.pricing.sellingPrice}
                      onChange={e => setFormData({
                        ...formData,
                        pricing: { ...formData.pricing, sellingPrice: parseFloat(e.target.value) || 0 },
                      })}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:outline-none focus:border-stone-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-400 mb-1">Currency</label>
                    <select
                      value={formData.pricing.currency}
                      onChange={e => setFormData({
                        ...formData,
                        pricing: { ...formData.pricing, currency: e.target.value },
                      })}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="AED">AED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Images: main + gallery */}
              <ProductImagesEditor
                images={formData.images || []}
                onChange={images => setFormData(prev => ({ ...prev, images }))}
              />

              {/* Colours & sizes */}
              <ProductVariantsEditor
                variants={formData.variants}
                onChange={variants => setFormData(prev => ({ ...prev, variants }))}
                productSku={formData.sku}
                isLoading={isLoadingVariants}
                productPrice={formData.pricing.sellingPrice}
              />

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as AdminProduct['status'] })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500 hover:bg-stone-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {isSaving ? saveProgress || 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation modal for archive */}
      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title="Archive Product"
        message={`Are you sure you want to archive "${deleteModal?.name}"? The product will be hidden from the storefront.`}
        confirmLabel="Archive Product"
        isDestructive
      />
    </div>
  );
};
