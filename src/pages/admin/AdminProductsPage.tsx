import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
  Barcode,
  RefreshCw,
  ChevronDown,
  Loader2,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Modal } from '../../components/common/Modal';
import { CategorySelect } from '../../components/admin/CategorySelect';
import { AdminPagination } from '../../components/admin/AdminPagination';
import {
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  updateAdminProductStatus,
  deleteAdminProduct,
} from '../../service/adminProducts';
import {
  createAdminVariant,
  updateAdminVariant,
  deleteAdminVariant,
  getAdminVariantsByProduct,
  getAdminVariants,
} from '../../service/adminVariants';
import type { VariantPayload } from '../../service/adminVariants';
import { ProductVariantsEditor, buildVariantSku, normalizeVariantImages } from '../../components/admin/ProductVariantsEditor';
import { ProductImagesEditor } from '../../components/admin/ProductImagesEditor';
import { deleteImage } from '../../service/uploadService';
import type { VariantRow } from '../../components/admin/ProductVariantsEditor';
import { useShop } from '../../context/ShopContext';
import { getDashboardProducts, type ProductAnalyticsResponse } from '../../service/adminDashboard';
import type { AdminProduct, AdminProductVariant } from '../../types';
import { getBackendErrorMessage } from '../../utils/apiResponse';
import { AdminErrorBanner } from '../../components/admin/AdminErrorBanner';
import { SupplierSelect } from '../../components/admin/suppliers/SupplierSelect';
import { SupplierStatusBadge } from '../../components/admin/suppliers/SupplierStatusBadge';
import { toSupplierApiError } from '../../service/adminSuppliers';
import type { ProductSupplierRef } from '../../types/suppliers';

/** Supplier filter value for products without a supplier */
const NO_SUPPLIER_FILTER = 'none';

const SUPPLIER_SAVE_ERRORS: Record<string, string> = {
  SUPPLIER_NOT_ASSIGNABLE: 'This supplier is inactive or blocked. Choose another.',
  INVALID_SUPPLIER: 'This supplier no longer exists.',
};

/** Save responses may return supplierId as a bare id: keep the list row showing the supplier we chose */
const withSupplierRef = (saved: AdminProduct, chosen: ProductSupplierRef | null): AdminProduct => {
  const raw: unknown = saved.supplierId;
  if (raw && typeof raw === 'object') return saved;
  return { ...saved, supplierId: chosen };
};

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
    ...(v.images?.length ? { images: normalizeVariantImages(v.images) } : {}),
  };
};

const apiErrorMessage = (err: any, fallback: string): string =>
  getBackendErrorMessage(err, fallback);

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

const getStatusSelectStyle = (status: string) => {
  const normalized = (status || '').toLowerCase();
  if (
    normalized.includes('delivered') ||
    normalized.includes('paid') ||
    normalized.includes('active') ||
    normalized.includes('captured') ||
    normalized.includes('approved') ||
    normalized.includes('completed') ||
    normalized.includes('published')
  ) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80';
  } else if (
    normalized.includes('pending') ||
    normalized.includes('review') ||
    normalized.includes('draft')
  ) {
    return 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100/80';
  } else if (
    normalized.includes('cancelled') ||
    normalized.includes('failed') ||
    normalized.includes('rejected') ||
    normalized.includes('out of stock') ||
    normalized.includes('archived')
  ) {
    return 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/80';
  }
  return 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200/80';
};

export const AdminProductsPage: React.FC = () => {
  const { can } = usePermissions();
  const { showToast } = useShop();
  const canCreate = can('products_catalog', 'create');
  const canEdit = can('products_catalog', 'edit');
  const canDelete = can('products_catalog', 'delete');

  // ── API state ──────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [catalogAnalytics, setCatalogAnalytics] = useState<ProductAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filters, Sort & Pagination ─────────────────────────────────────────────
  const PAGE_SIZE = 15;
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  // '' = all, 'none' = without a supplier, otherwise a supplier id (also accepts ?supplierId= / ?supplier=none links)
  const [selectedSupplier, setSelectedSupplier] = useState(
    () => searchParams.get('supplierId') || searchParams.get('supplier') || ''
  );
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'price-desc' | 'price-asc'>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // ── Bulk selection ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busyStatusId, setBusyStatusId] = useState<string | null>(null);

  // ── Delete confirm ─────────────────────────────────────────────────────────
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);

  // ── Create / Edit modal ────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  // Snapshot of the variants as loaded, to work out what to create / update / delete on save
  const [originalVariants, setOriginalVariants] = useState<Record<string, string>>({});
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');
  // Baseline snapshot captured once the modal's initial data (incl. async variants) has
  // loaded, so the dirty check doesn't fire while that load is still in flight.
  const initialSnapshotRef = useRef('');
  // Supplier is tracked apart from formData so it is only sent when the rules below allow
  const [supplierId, setSupplierId] = useState('');
  const [chosenSupplier, setChosenSupplier] = useState<ProductSupplierRef | null>(null);
  const [originalSupplier, setOriginalSupplier] = useState<ProductSupplierRef | null>(null);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const [supplierReloadToken, setSupplierReloadToken] = useState(0);
  const [pendingDeletePublicIds, setPendingDeletePublicIds] = useState<string[]>([]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  // Variant prices per product, to flag products whose variants are priced differently
  const [variantPrices, setVariantPrices] = useState<Record<string, number[]>>({});

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, variants, dashboardCatalog] = await Promise.all([
        getAdminProducts(),
        getAdminVariants().catch(() => []),
        getDashboardProducts().catch(() => null),
      ]);
      setProducts(data);
      if (dashboardCatalog) setCatalogAnalytics(dashboardCatalog);
      const byProduct: Record<string, number[]> = {};
      variants.forEach(v => {
        const price = v.pricing?.sellingPrice;
        if (v.productId && typeof price === 'number') (byProduct[v.productId] ||= []).push(price);
      });
      setVariantPrices(byProduct);
    } catch (err: any) {
      setError(getBackendErrorMessage(err, 'Failed to load products'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // ── Filtered and Sorted view ──────────────────────────────────────────────
  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = products.filter(p => {
      const matchesStatus = selectedStatus === 'All' || p.status === selectedStatus;
      const matchesQuery =
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.category?.name || '').toLowerCase().includes(q) ||
        (p.supplierId?.name || '').toLowerCase().includes(q);
      const matchesSupplier =
        !selectedSupplier ||
        (selectedSupplier === NO_SUPPLIER_FILTER ? !p.supplierId : p.supplierId?._id === selectedSupplier);
      return matchesStatus && matchesQuery && matchesSupplier;
    });

    list.sort((a, b) => {
      if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'price-desc') {
        const pa = a.pricing?.sellingPrice ?? a.pricing?.mrp ?? 0;
        const pb = b.pricing?.sellingPrice ?? b.pricing?.mrp ?? 0;
        return pb - pa;
      }
      if (sortBy === 'price-asc') {
        const pa = a.pricing?.sellingPrice ?? a.pricing?.mrp ?? 0;
        const pb = b.pricing?.sellingPrice ?? b.pricing?.mrp ?? 0;
        return pa - pb;
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      // default: newest
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return list;
  }, [products, selectedStatus, searchQuery, sortBy, selectedSupplier]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, sortBy, selectedSupplier]);

  // Supplier filter options: the suppliers linked to the loaded products
  const supplierFilterOptions = useMemo(() => {
    const map = new Map<string, ProductSupplierRef>();
    products.forEach(p => {
      if (p.supplierId?._id) map.set(p.supplierId._id, p.supplierId);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSorted.slice(start, start + PAGE_SIZE);
  }, [filteredAndSorted, currentPage]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const handleSelectAll = () => {
    setSelectedIds(selectedIds.length === filteredAndSorted.length ? [] : filteredAndSorted.map(p => p.id));
  };
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // ── Interactive single product status change ──────────────────────────────
  const handleStatusChange = async (productId: string, newStatus: AdminProduct['status']) => {
    setBusyStatusId(productId);
    try {
      const updated = await updateAdminProductStatus(productId, newStatus);
      const effectiveStatus = updated?.status || newStatus;
      setProducts(prev =>
        prev.map(p => (p.id === productId ? { ...p, status: effectiveStatus } : p))
      );
      showToast(updated?._message || `Product status changed to ${effectiveStatus}`, 'success');
    } catch (err: any) {
      console.error('Failed to update product status:', err);
      showToast(getBackendErrorMessage(err, 'Failed to update product status'), 'error');
    } finally {
      setBusyStatusId(null);
    }
  };

  // ── Bulk status change ─────────────────────────────────────────────────────
  const handleBulkArchive = async () => {
    try {
      await Promise.all(selectedIds.map(id => updateAdminProductStatus(id, 'ARCHIVED')));
      setProducts(prev =>
        prev.map(p => (selectedIds.includes(p.id) ? { ...p, status: 'ARCHIVED' } : p))
      );
      setSelectedIds([]);
      showToast(`${selectedIds.length} product(s) archived`, 'success');
    } catch (err: any) {
      console.error('Failed to bulk archive:', err);
      showToast(apiErrorMessage(err, 'Failed to archive products'), 'error');
    }
  };

  // ── Delete product ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      const msg = await deleteAdminProduct(deleteModal.id);
      setProducts(prev => prev.filter(p => p.id !== deleteModal.id));
      showToast(msg || `Product "${deleteModal.name}" deleted successfully`, 'success');
    } catch (err: any) {
      console.error('Failed to delete product:', err);
      showToast(getBackendErrorMessage(err, 'Failed to delete product'), 'error');
    } finally {
      setDeleteModal(null);
    }
  };

  // ── Bulk delete ────────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} product(s)?`)) return;
    try {
      await Promise.all(selectedIds.map(id => deleteAdminProduct(id)));
      setProducts(prev => prev.filter(p => !selectedIds.includes(p.id)));
      showToast(`${selectedIds.length} product(s) deleted successfully`, 'success');
      setSelectedIds([]);
    } catch (err: any) {
      console.error('Failed to delete selected products:', err);
      showToast(apiErrorMessage(err, 'Failed to delete selected products'), 'error');
    }
  };

  // ── Open add / edit ────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormError(null);
    setFormData(EMPTY_FORM);
    setOriginalVariants({});
    setSupplierId('');
    setChosenSupplier(null);
    setOriginalSupplier(null);
    setSupplierError(null);
    setPendingDeletePublicIds([]);
    setIsModalOpen(true);
    initialSnapshotRef.current = JSON.stringify({ formData: EMPTY_FORM, supplierId: '' });
  };

  const handleOpenEdit = (product: AdminProduct) => {
    setEditingId(product.id);
    setFormError(null);
    const initialFormData = {
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
      variants: [] as VariantRow[],
    };
    setFormData(initialFormData);
    setOriginalVariants({});
    const currentSupplier = product.supplierId ?? null;
    const initialSupplierId = currentSupplier?._id ?? '';
    setSupplierId(initialSupplierId);
    setChosenSupplier(currentSupplier);
    setOriginalSupplier(currentSupplier);
    setSupplierError(null);
    setPendingDeletePublicIds([]);
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
        initialSnapshotRef.current = JSON.stringify({
          formData: { ...initialFormData, variants: rows },
          supplierId: initialSupplierId,
        });
      })
      .catch(err => {
        console.error('Failed to load variants:', err);
        showToast('Could not load this product\'s variants', 'error');
        initialSnapshotRef.current = JSON.stringify({ formData: initialFormData, supplierId: initialSupplierId });
      })
      .finally(() => setIsLoadingVariants(false));
  };

  // Deep-link support: e.g. the command search sends ?edit=<productId> to open
  // that product's edit modal directly, once its data has finished loading.
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || isLoading) return;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('edit');
      return next;
    }, { replace: true });
    const product = products.find(p => p.id === editId);
    if (product && canEdit) handleOpenEdit(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoading, products, canEdit]);

  // Deep-link support: e.g. the dashboard's "Add New Product" button sends
  // ?add=1 to open the add-product modal directly on arrival.
  useEffect(() => {
    if (!searchParams.get('add')) return;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('add');
      return next;
    }, { replace: true });
    if (canCreate) handleOpenAdd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canCreate]);

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
    setFormError(null);
    setSupplierError(null);
    try {
      const { variants, ...productPayload } = formData;
      const supplierRef = supplierId ? chosenSupplier : null;

      let saved: AdminProduct;
      if (editingId) {
        // Edit: a changed supplier is sent as its id, a removed one as null; unchanged → left out
        const supplierChanged = supplierId !== (originalSupplier?._id ?? '');
        saved = await updateAdminProduct(editingId, {
          ...productPayload,
          ...(supplierChanged ? { supplierId: supplierId || null } : {}),
        });
        saved = withSupplierRef(saved, supplierRef);
        if (formData.status) {
          try {
            const statusUpdated = await updateAdminProductStatus(editingId, formData.status);
            if (statusUpdated?.status) saved.status = statusUpdated.status;
          } catch (statusErr) {
            console.warn('Status update via endpoint failed:', statusErr);
          }
        }
        setProducts(products.map(p => (p.id === editingId ? saved : p)));
      } else {
        // Create: send supplierId only when one is picked; never null
        saved = await createAdminProduct({
          ...productPayload,
          ...(supplierId ? { supplierId } : {}),
        });
        saved = withSupplierRef(saved, supplierRef);
        setProducts([saved, ...products]);
      }
      // The product now has this supplier: a retry (variant failures) must diff against it
      setOriginalSupplier(supplierRef);

      const result = await syncVariants(saved.id, saved.sku || formData.sku, formData.pricing, variants);
      // Remember what now exists on the server so "Save" again only retries what failed
      setOriginalVariants(result.snapshot);
      setFormData(prev => ({ ...prev, variants: result.rows }));
      if (result.errors.length > 0) {
        if (!editingId) setEditingId(saved.id);
        const variantErrMsg = `Product saved, but ${result.errors.length} variant(s) failed: ${result.errors.join(' • ')}`;
        setFormError(variantErrMsg);
        showToast(
          `Product saved, but ${result.errors.length} variant(s) failed. Click Save again to retry. ${result.errors[0]}`,
          'error'
        );
        return;
      }

      // Trigger deferred deletion of removed R2 images now that product saved successfully
      if (pendingDeletePublicIds.length > 0) {
        pendingDeletePublicIds.forEach(id => void deleteImage(id));
        setPendingDeletePublicIds([]);
      }

      showToast(saved._message || (editingId ? 'Product updated successfully' : 'Product created successfully'), 'success');
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save product:', err);
      const apiError = toSupplierApiError(err, 'Failed to save product');
      const supplierMsg = apiError.code ? SUPPLIER_SAVE_ERRORS[apiError.code] : undefined;
      if (supplierMsg) {
        // The supplier was deactivated or deleted after the list loaded: flag the field and reload options
        setSupplierError(supplierMsg);
        setSupplierReloadToken(t => t + 1);
        showToast(supplierMsg, 'error');
        return;
      }
      const errText = getBackendErrorMessage(err, 'Failed to save product');
      setFormError(errText);
      showToast(errText, 'error');
    } finally {
      setIsSaving(false);
      setSaveProgress('');
    }
  };

  const isFormDirty =
    isModalOpen &&
    !isLoadingVariants &&
    initialSnapshotRef.current !== '' &&
    initialSnapshotRef.current !== JSON.stringify({ formData, supplierId });

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

          {canCreate && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>Add New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Catalog KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-stone-400">Total Catalog</span>
          <p className="font-serif text-2xl font-bold text-[#561C08]">
            {catalogAnalytics?.totalProducts ?? products.length}
          </p>
          <p className="text-[11px] text-stone-500 font-sans">
            {catalogAnalytics?.totalVariants ?? '—'} Sellable SKUs
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-emerald-700">Active Live</span>
          <p className="font-serif text-2xl font-bold text-emerald-800">
            {catalogAnalytics?.activeProducts ?? products.filter(p => p.status === 'ACTIVE').length}
          </p>
          <p className="text-[11px] text-emerald-700 font-sans">Visible on boutique</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-stone-400">Drafts & Archived</span>
          <p className="font-serif text-2xl font-bold text-[#561C08]">
            {catalogAnalytics?.inactiveProducts ?? products.filter(p => p.status !== 'ACTIVE').length}
          </p>
          <p className="text-[11px] text-stone-500 font-sans">Unpublished items</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-allura-goldDark">Best Sellers</span>
          <p className="font-serif text-2xl font-bold text-allura-darkBrown">
            {catalogAnalytics?.bestSellingProducts?.length ?? 0}
          </p>
          <p className="text-[11px] text-stone-500 font-sans">High velocity pieces</p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-700 focus:outline-none cursor-pointer"
            >
              <option value="All">Status: All</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            <select
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
              aria-label="Filter by supplier"
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-700 focus:outline-none cursor-pointer max-w-[200px]"
            >
              <option value="">Supplier: All</option>
              <option value={NO_SUPPLIER_FILTER}>No supplier</option>
              {supplierFilterOptions.map(s => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.supplierCode})
                </option>
              ))}
              {selectedSupplier &&
                selectedSupplier !== NO_SUPPLIER_FILTER &&
                !supplierFilterOptions.some(s => s._id === selectedSupplier) && (
                  <option value={selectedSupplier}>Selected supplier</option>
                )}
            </select>

            <div className="flex items-center gap-1.5 border border-stone-200 rounded-xl px-2.5 py-1.5 bg-stone-50 text-xs text-stone-700">
              <ArrowUpDown size={13} className="text-stone-400" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="price-asc">Price: Low to High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (canEdit || canDelete) && (
          <div className="bg-stone-900 text-white p-3 rounded-xl flex items-center justify-between text-xs font-sans animate-slide-up">
            <span className="font-semibold">{selectedIds.length} item(s) selected</span>
            <div className="flex items-center gap-2">
              {canDelete && (
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 bg-rose-700 hover:bg-rose-800 rounded-lg text-white font-medium transition-colors"
                >
                  Delete Selected
                </button>
              )}
              {canEdit && (
                <button
                  onClick={handleBulkArchive}
                  className="px-3 py-1 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-200 transition-colors"
                >
                  Archive Selected
                </button>
              )}
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
            <table className="w-full min-w-[720px] text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                  <th className="p-4 w-10">
                    <button onClick={handleSelectAll} className="p-0.5">
                      {selectedIds.length > 0 && selectedIds.length === filteredAndSorted.length ? (
                        <CheckSquare size={16} className="text-stone-900" />
                      ) : (
                        <Square size={16} className="text-stone-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Product Details</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Selling Price</th>
                  <th className="p-4">MRP</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedProducts.map(product => {
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
                        {product.supplierId ? (
                          <div className="space-y-0.5 max-w-[160px]">
                            <p className="text-stone-900 truncate" title={product.supplierId.companyName ? `${product.supplierId.name} · ${product.supplierId.companyName}` : product.supplierId.name}>{product.supplierId.name}</p>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-stone-400">{product.supplierId.supplierCode}</span>
                              {product.supplierId.status !== 'ACTIVE' && (
                                <SupplierStatusBadge status={product.supplierId.status} />
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-[#561C08]">
                          {product.pricing.currency === 'INR' ? '₹' : product.pricing.currency}{' '}
                          {product.pricing.sellingPrice.toLocaleString('en-IN')}
                        </p>
                        {(() => {
                          const different = [...new Set(variantPrices[product.id] || [])].filter(p => p !== product.pricing.sellingPrice);
                          if (different.length === 0) return null;
                          const min = Math.min(...different);
                          const max = Math.max(...different);
                          if (!canEdit) {
                            return (
                              <p className="mt-1 text-left text-[10px] font-semibold text-amber-700">
                                ⚠ Variants: ₹{min.toLocaleString('en-IN')}{max !== min ? `–₹${max.toLocaleString('en-IN')}` : ''}
                              </p>
                            );
                          }
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
                        {canEdit ? (
                          <div className="relative inline-flex items-center">
                            <select
                              value={product.status || 'DRAFT'}
                              disabled={busyStatusId === product.id}
                              onChange={e => handleStatusChange(product.id, e.target.value as AdminProduct['status'])}
                              title="Click to change product status"
                              className={`appearance-none cursor-pointer pl-5 pr-6 py-0.5 text-[10px] font-sans font-semibold rounded-full border transition-all focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-60 disabled:cursor-not-allowed ${getStatusSelectStyle(
                                product.status
                              )}`}
                            >
                              <option value="ACTIVE" className="bg-white text-stone-900 py-1 font-sans">
                                ACTIVE
                              </option>
                              <option value="DRAFT" className="bg-white text-stone-900 py-1 font-sans">
                                DRAFT
                              </option>
                              <option value="ARCHIVED" className="bg-white text-stone-900 py-1 font-sans">
                                ARCHIVED
                              </option>
                            </select>
                            <span className="absolute left-2 pointer-events-none flex items-center justify-center">
                              {busyStatusId === product.id ? (
                                <Loader2 size={10} className="animate-spin text-current" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
                              )}
                            </span>
                            <ChevronDown
                              size={11}
                              className="absolute right-1.5 pointer-events-none text-current opacity-60"
                            />
                          </div>
                        ) : (
                          <StatusBadge status={product.status} size="sm" />
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(product)}
                              title="Edit Product"
                              className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100"
                            >
                              <Edit3 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteModal({ id: product.id, name: product.name })}
                              title="Delete Product"
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
                {!isLoading && filteredAndSorted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-stone-500 space-y-2">
                      <p>No products found matching your search and filter criteria.</p>
                      {(searchQuery || selectedStatus !== 'All' || selectedSupplier) && (
                        <button
                          onClick={() => { setSearchQuery(''); setSelectedStatus('All'); setSelectedSupplier(''); }}
                          className="text-xs font-semibold text-stone-800 underline inline-block"
                        >
                          Clear search and filters
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar (Limit 15) */}
        {!isLoading && !error && (
          <AdminPagination
            currentPage={currentPage}
            totalItems={filteredAndSorted.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isBusy={isSaving}
        isDirty={isFormDirty}
        discardConfirmMessage="You have unsaved changes to this product. Discard them?"
        closeButtonClassName="absolute top-3 right-3 z-20 w-10 h-10 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors disabled:opacity-40"
        backdropClassName="fixed inset-0 z-50 flex justify-center p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto py-10"
        panelClassName="relative bg-white border border-stone-200 rounded-2xl w-full max-w-2xl shadow-2xl h-max my-auto max-h-[90vh] flex flex-col focus:outline-none"
      >
        <div className="overflow-y-auto p-6 space-y-5">
          <h3 className="font-serif text-xl text-stone-900 pr-8">
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h3>

          {formError && (
            <AdminErrorBanner
              title="Product Save Failed"
              error={formError}
              onDismiss={() => setFormError(null)}
            />
          )}

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Category</label>
                <CategorySelect
                  value={formData.categoryId}
                  onChange={categoryId => setFormData({ ...formData, categoryId })}
                  placeholder="Select a category"
                />
              </div>
              <div>
                <label htmlFor="product-supplier" className="block text-[10px] uppercase font-bold text-stone-500 mb-1">
                  Supplier <span className="normal-case font-normal text-stone-400">(optional)</span>
                </label>
                <SupplierSelect
                  id="product-supplier"
                  value={supplierId}
                  currentSupplier={originalSupplier}
                  error={supplierError ?? undefined}
                  reloadToken={supplierReloadToken}
                  onChange={(id, supplier) => {
                    setSupplierId(id);
                    setChosenSupplier(supplier ?? null);
                    setSupplierError(null);
                  }}
                />
              </div>
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
                    step={1}
                    value={formData.pricing.mrp === 0 ? '' : formData.pricing.mrp}
                    onChange={e => setFormData({
                      ...formData,
                      pricing: { ...formData.pricing, mrp: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 },
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
                    step={1}
                    value={formData.pricing.sellingPrice === 0 ? '' : formData.pricing.sellingPrice}
                    onChange={e => setFormData({
                      ...formData,
                      pricing: { ...formData.pricing, sellingPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 },
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
                    {/* <option value="USD">USD ($)</option>
                      <option value="AED">AED</option> */}
                  </select>
                </div>
              </div>
            </div>

            {/* Images: main + gallery */}
            <ProductImagesEditor
              images={formData.images || []}
              productName={formData.name}
              onChange={images => setFormData(prev => ({ ...prev, images }))}
              onRemoveExisting={publicId => setPendingDeletePublicIds(prev => [...prev, publicId])}
            />

            {/* Colours & sizes */}
            <ProductVariantsEditor
              variants={formData.variants}
              onChange={variants => setFormData(prev => ({ ...prev, variants }))}
              productSku={formData.sku}
              isLoading={isLoadingVariants}
              productPrice={formData.pricing.sellingPrice}
              productImages={formData.images || []}
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
                className="px-5 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isSaving && <Loader2 size={13} className="animate-spin" />}
                <span>{isSaving ? saveProgress || 'Saving...' : 'Save Product'}</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Confirmation modal for delete */}
      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to permanently delete "${deleteModal?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Product"
        isDestructive
      />
    </div>
  );
};
