import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, RefreshCw, Power, Printer } from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { getAdminProducts } from '../../service/adminProducts';
import {
  getAdminVariants,
  createAdminVariant,
  updateAdminVariant,
  deleteAdminVariant,
  activateAdminVariant,
  deactivateAdminVariant,
  getVariantBarcodePrintImage,
} from '../../service/adminVariants';
import type { AdminProduct, AdminProductVariant } from '../../types';

const EMPTY_FORM = {
  productId: '',
  sku: '',
  barcodeValue: '',
  barcodeType: 'EAN13',
  color: '',
  size: '',
  mrp: 0,
  sellingPrice: 0,
  currency: 'USD',
  status: 'ACTIVE',
};

export const AdminVariantsPage: React.FC = () => {
  const [variants, setVariants] = useState<AdminProductVariant[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [deleteModal, setDeleteModal] = useState<{ id: string; sku: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const productMap = React.useMemo(() => {
    const map: Record<string, AdminProduct> = {};
    products.forEach(p => { map[p.id] = p; });
    return map;
  }, [products]);

  const fetchAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [variantData, productData] = await Promise.all([
        getAdminVariants(),
        getAdminProducts(),
      ]);
      setVariants(variantData);
      setProducts(productData);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load product variants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = variants.filter(v => {
    const q = searchQuery.toLowerCase();
    const productName = productMap[v.productId]?.name || '';
    return (
      v.sku.toLowerCase().includes(q) ||
      (v.barcode?.value || '').toLowerCase().includes(q) ||
      productName.toLowerCase().includes(q)
    );
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: AdminProductVariant) => {
    setEditingId(v.id);
    setFormData({
      productId: v.productId,
      sku: v.sku,
      barcodeValue: v.barcode?.value || '',
      barcodeType: v.barcode?.type || 'EAN13',
      color: v.attributes?.color || '',
      size: v.attributes?.size || '',
      mrp: v.pricing?.mrp ?? 0,
      sellingPrice: v.pricing?.sellingPrice ?? 0,
      currency: v.pricing?.currency || 'USD',
      status: v.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || !formData.sku) return;
    setIsSaving(true);

    const payload = {
      productId: formData.productId,
      sku: formData.sku,
      ...(formData.barcodeValue
        ? { barcode: { value: formData.barcodeValue, type: formData.barcodeType } }
        : {}),
      attributes: { color: formData.color, size: formData.size },
      pricing: {
        mrp: Number(formData.mrp),
        sellingPrice: Number(formData.sellingPrice),
        currency: formData.currency,
      },
      status: formData.status,
    };

    try {
      if (editingId) {
        const updated = await updateAdminVariant(editingId, payload);
        setVariants(variants.map(v => (v.id === editingId ? updated : v)));
      } else {
        const created = await createAdminVariant(payload);
        setVariants([created, ...variants]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save variant:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteAdminVariant(deleteModal.id);
      setVariants(variants.filter(v => v.id !== deleteModal.id));
    } catch (err) {
      console.error('Failed to delete variant:', err);
    } finally {
      setDeleteModal(null);
    }
  };

  const handleToggleStatus = async (v: AdminProductVariant) => {
    setBusyId(v.id);
    try {
      const updated = v.status === 'ACTIVE'
        ? await deactivateAdminVariant(v.id)
        : await activateAdminVariant(v.id);
      setVariants(variants.map(item => (item.id === v.id ? updated : item)));
    } catch (err) {
      console.error('Failed to update variant status:', err);
    } finally {
      setBusyId(null);
    }
  };

  const handlePrintBarcode = async (v: AdminProductVariant) => {
    setBusyId(v.id);
    try {
      const url = await getVariantBarcodePrintImage(v.id);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to load barcode image:', err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            SKU & VARIANT MATRIX
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Product Variants ({variants.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Granular color/size SKU codes, barcode assignments, and individual price adjustments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAll}
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search variant SKU or barcode..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            <span>New Variant</span>
          </button>
        </div>
      </div>

      {/* Variants Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-sans text-stone-500">Loading product variants...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-xs font-sans text-rose-600 font-semibold">{error}</p>
              <button
                onClick={fetchAll}
                className="mt-3 text-xs font-sans text-stone-500 hover:text-stone-900 underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                  <th className="p-4">Product</th>
                  <th className="p-4">Attributes</th>
                  <th className="p-4">SKU Code</th>
                  <th className="p-4">Barcode</th>
                  <th className="p-4">Pricing</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(v => {
                  const product = productMap[v.productId];
                  const primaryImage = product?.images?.find(img => img.isPrimary)?.url || product?.images?.[0]?.url;
                  return (
                    <tr key={v.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {primaryImage ? (
                            <img src={primaryImage} alt={product?.name} className="w-9 h-12 object-cover rounded bg-stone-100" />
                          ) : (
                            <div className="w-9 h-12 rounded bg-stone-100 flex-shrink-0" />
                          )}
                          <span className="font-medium text-stone-900 line-clamp-1">
                            {product?.name || v.productId}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-stone-800">{v.attributes?.size || '—'}</span>
                        <span className="text-stone-400"> ({v.attributes?.color || '—'})</span>
                      </td>
                      <td className="p-4 font-mono font-semibold text-stone-700">{v.sku}</td>
                      <td className="p-4 font-mono text-stone-500">
                        {v.barcode?.value ? `${v.barcode.value} (${v.barcode.type})` : '—'}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-stone-900">
                          {v.pricing?.currency} {v.pricing?.sellingPrice?.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-stone-400 line-through">
                          {v.pricing?.currency} {v.pricing?.mrp?.toLocaleString()}
                        </p>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={v.status} size="sm" />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handlePrintBarcode(v)}
                            disabled={busyId === v.id}
                            title="Print Barcode"
                            className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100 disabled:opacity-50"
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(v)}
                            disabled={busyId === v.id}
                            title={v.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            className={`p-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-50 ${
                              v.status === 'ACTIVE' ? 'text-emerald-600 hover:text-emerald-800' : 'text-stone-400 hover:text-stone-800'
                            }`}
                          >
                            <Power size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(v)}
                            title="Edit Variant"
                            className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ id: v.id, sku: v.sku })}
                            title="Delete Variant"
                            className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-stone-500">
                      No variants found. {searchQuery && 'Try clearing your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Variant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-serif text-xl text-stone-900">
              {editingId ? 'Edit Variant' : 'New Variant'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Product *</label>
                <select
                  required
                  value={formData.productId}
                  onChange={e => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                >
                  <option value="">Select a product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Color</label>
                  <input
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Size</label>
                  <input
                    value={formData.size}
                    onChange={e => setFormData({ ...formData, size: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Barcode Value</label>
                  <input
                    value={formData.barcodeValue}
                    onChange={e => setFormData({ ...formData, barcodeValue: e.target.value })}
                    placeholder="8901234567890"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:outline-none focus:border-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Barcode Type</label>
                  <select
                    value={formData.barcodeType}
                    onChange={e => setFormData({ ...formData, barcodeType: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                  >
                    <option value="EAN13">EAN13</option>
                    <option value="CODE128">CODE128</option>
                    <option value="QR">QR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">MRP *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={0.01}
                    value={formData.mrp}
                    onChange={e => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:outline-none focus:border-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Selling Price *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={0.01}
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:outline-none focus:border-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500 hover:bg-stone-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Variant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title="Delete Variant"
        message={`Are you sure you want to delete variant "${deleteModal?.sku}"? This cannot be undone.`}
        confirmLabel="Delete Variant"
        isDestructive
      />
    </div>
  );
};
