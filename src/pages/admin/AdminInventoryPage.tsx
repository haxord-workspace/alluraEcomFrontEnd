import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  FileText,
  RefreshCw,
  Plus,
  Minus,
  SlidersHorizontal,
  PackagePlus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { StockAdjustModal } from '../../components/admin/StockAdjustModal';
import type { StockOperation } from '../../components/admin/StockAdjustModal';
import { getInventory, getLowStockInventory } from '../../service/adminInventory';
import type { InventoryRecord } from '../../service/adminInventory';
import { getAdminVariants } from '../../service/adminVariants';
import { getAdminProducts } from '../../service/adminProducts';
import type { AdminProduct, AdminProductVariant } from '../../types';

const DEFAULT_LOW_STOCK_THRESHOLD = 6;

type StockFilter = 'All' | 'Low' | 'Out' | 'Untracked';

export const AdminInventoryPage: React.FC = () => {
  const { hasPermission } = useAdmin();
  const canEdit = hasPermission('inventory', 'edit');

  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [lowStock, setLowStock] = useState<InventoryRecord[]>([]);
  const [variants, setVariants] = useState<AdminProductVariant[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('All');
  const [modal, setModal] = useState<{ record: InventoryRecord | null; operation: StockOperation } | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [inventoryData, lowStockData, variantData, productData] = await Promise.all([
        getInventory(),
        getLowStockInventory().catch(() => []),
        // Variants give us every sellable SKU (including ones never stocked) plus names / images
        getAdminVariants().catch(() => []),
        getAdminProducts().catch(() => []),
      ]);
      setInventory(inventoryData);
      setLowStock(lowStockData);
      setVariants(variantData);
      setProducts(productData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load inventory');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const variantMap = useMemo(() => {
    const map: Record<string, AdminProductVariant> = {};
    variants.forEach(v => { map[v.id] = v; });
    return map;
  }, [variants]);

  const productMap = useMemo(() => {
    const map: Record<string, AdminProduct> = {};
    products.forEach(p => { map[p.id] = p; });
    return map;
  }, [products]);

  // Fill in product / variant details the inventory payload may not include
  const enrich = useCallback((record: InventoryRecord): InventoryRecord => {
    const variant = variantMap[record.variantId];
    const productId = record.productId || variant?.productId;
    const product = productId ? productMap[productId] : undefined;
    return {
      ...record,
      productId,
      productName: record.productName || product?.name,
      sku: record.sku || variant?.sku,
      attributes: record.attributes || variant?.attributes,
      image: record.image || product?.images?.find(i => i.isPrimary)?.url || product?.images?.[0]?.url,
    };
  }, [variantMap, productMap]);

  // Every variant gets a row; ones without an inventory record show as "Not stocked"
  const rows = useMemo(() => {
    const byVariant = new Map<string, InventoryRecord>();
    inventory.forEach(r => byVariant.set(r.variantId, enrich(r)));
    variants.forEach(v => {
      if (byVariant.has(v.id)) return;
      byVariant.set(v.id, enrich({
        id: '',
        variantId: v.id,
        productId: v.productId,
        sku: v.sku,
        attributes: v.attributes,
        quantityOnHand: 0,
        quantityReserved: 0,
        quantityAvailable: 0,
        isTracked: false,
      }));
    });
    return Array.from(byVariant.values());
  }, [inventory, variants, enrich]);

  const lowStockIds = useMemo(() => new Set(lowStock.map(r => r.variantId)), [lowStock]);

  const isUntracked = (r: InventoryRecord) => r.isTracked === false;
  const isOut = (r: InventoryRecord) => !isUntracked(r) && r.quantityAvailable === 0;
  const isLow = (r: InventoryRecord) =>
    !isUntracked(r) &&
    r.quantityAvailable > 0 &&
    (r.status === 'LOW_STOCK' ||
      lowStockIds.has(r.variantId) ||
      r.quantityAvailable <= (r.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD));

  const totalUnits = rows.reduce((acc, r) => acc + r.quantityOnHand, 0);
  const lowStockCount = rows.filter(isLow).length;
  const outOfStockCount = rows.filter(isOut).length;
  const untrackedCount = rows.filter(isUntracked).length;
  const healthyCount = rows.length - lowStockCount - outOfStockCount - untrackedCount;

  const filtered = rows.filter(r => {
    const matchesFilter =
      stockFilter === 'All' ||
      (stockFilter === 'Low' && isLow(r)) ||
      (stockFilter === 'Out' && isOut(r)) ||
      (stockFilter === 'Untracked' && isUntracked(r));
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (r.productName || '').toLowerCase().includes(q) ||
      (r.sku || '').toLowerCase().includes(q) ||
      [r.attributes?.color, r.attributes?.size].filter(Boolean).join(' ').toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const openModal = (record: InventoryRecord | null, operation: StockOperation = 'Add') =>
    setModal({ record, operation });

  const handleAdjusted = (updated: InventoryRecord) => {
    setInventory(prev => {
      const exists = prev.some(r => r.variantId === updated.variantId);
      const next = { ...updated, isTracked: true };
      return exists
        ? prev.map(r => (r.variantId === updated.variantId ? { ...r, ...next } : r))
        : [...prev, next];
    });
    // Low-stock membership may have changed, so refresh it from the server
    getLowStockInventory().then(setLowStock).catch(() => {});
  };

  const statCards: { label: string; value: number; tone: string; filter?: StockFilter }[] = [
    { label: 'Total Units On Hand', value: totalUnits, tone: 'text-stone-900' },
    { label: 'Healthy Stock', value: healthyCount, tone: 'text-emerald-800' },
    { label: 'Low Stock', value: lowStockCount, tone: 'text-amber-800', filter: 'Low' },
    { label: 'Out of Stock', value: outOfStockCount, tone: 'text-rose-800', filter: 'Out' },
    { label: 'Not Stocked Yet', value: untrackedCount, tone: 'text-stone-500', filter: 'Untracked' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            ATELIER STOCK CONTROL
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Inventory & Stock Management
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Add new stock, record removals, and correct counts for every variant.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchAll}
            disabled={isLoading}
            className="p-2.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 rounded-xl transition-colors shadow-xs disabled:opacity-50"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <Link
            to="/admin/inventory/transactions"
            className="px-4 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 rounded-xl text-xs font-sans font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileText size={14} />
            <span>Stock History</span>
          </Link>
          {canEdit && (
            <button
              onClick={() => openModal(null, 'Add')}
              disabled={rows.length === 0}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <PackagePlus size={15} />
              <span>Add Stock</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards (click to filter) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(card => {
          const active = card.filter && stockFilter === card.filter;
          const Tag = card.filter ? 'button' : 'div';
          return (
            <Tag
              key={card.label}
              {...(card.filter ? { onClick: () => setStockFilter(active ? 'All' : card.filter!) } : {})}
              className={`text-left bg-white border rounded-2xl p-5 shadow-xs space-y-1 transition-colors ${
                active ? 'border-stone-900' : 'border-stone-200'
              } ${card.filter ? 'hover:border-stone-400 cursor-pointer' : ''}`}
            >
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-400">{card.label}</span>
              <p className={`font-serif text-2xl font-bold ${card.tone}`}>{card.value}</p>
            </Tag>
          );
        })}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAll} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* Table & Filter Toolbar */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search product, SKU, colour or size..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              ['All', 'All'],
              ['Low', 'Low Stock'],
              ['Out', 'Out of Stock'],
              ['Untracked', 'Not Stocked'],
            ] as const).map(([f, label]) => (
              <button
                key={f}
                onClick={() => setStockFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-sans font-semibold transition-colors ${
                  stockFilter === f
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Product / Variant</th>
                <th className="p-4">SKU</th>
                <th className="p-4 text-center">On Hand</th>
                <th className="p-4 text-center">Reserved</th>
                <th className="p-4 text-center">Available</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Update Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-stone-400">Loading inventory…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-stone-400 space-y-2">
                    <p>{rows.length === 0 ? 'No variants yet. Create a product variant first, then add stock here.' : 'No variants match this filter.'}</p>
                    {rows.length === 0 && (
                      <Link to="/admin/variants" className="inline-block font-semibold text-stone-800 underline">Go to Variants</Link>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map(record => {
                  const untracked = isUntracked(record);
                  const low = isLow(record);
                  const out = isOut(record);
                  const variantLabel = [record.attributes?.color, record.attributes?.size].filter(Boolean).join(' / ');

                  return (
                    <tr key={record.variantId} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {record.image ? (
                            <img
                              src={record.image}
                              alt={record.productName || record.sku}
                              className="w-10 h-13 object-cover rounded-lg bg-stone-100"
                            />
                          ) : (
                            <div className="w-10 h-13 rounded-lg bg-stone-100" />
                          )}
                          <div>
                            <p className="font-serif text-sm font-medium text-stone-900">{record.productName || 'Unnamed product'}</p>
                            {variantLabel && <p className="text-[10px] text-stone-500 capitalize">{variantLabel}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-semibold text-stone-700">{record.sku || '—'}</td>
                      <td className="p-4 text-center font-mono font-bold text-stone-800 text-sm">{untracked ? '—' : record.quantityOnHand}</td>
                      <td className="p-4 text-center font-mono text-amber-700 font-semibold">{untracked ? '—' : record.quantityReserved}</td>
                      <td className="p-4 text-center font-mono font-bold text-stone-900 text-sm">{untracked ? '—' : record.quantityAvailable}</td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
                            untracked
                              ? 'bg-stone-100 text-stone-600'
                              : out
                              ? 'bg-rose-100 text-rose-800'
                              : low
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {untracked ? 'Not Stocked' : out ? 'Out of Stock' : low ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="p-4">
                        {canEdit ? (
                          untracked ? (
                            <div className="flex justify-end">
                              <button
                                onClick={() => openModal(record, 'Add')}
                                className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold transition-colors shadow-xs flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <Plus size={13} />
                                Add First Stock
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end items-center gap-1.5">
                              <button
                                onClick={() => openModal(record, 'Remove')}
                                disabled={record.quantityOnHand === 0}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 text-stone-700 hover:border-rose-300 hover:text-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Remove stock"
                                aria-label="Remove stock"
                              >
                                <Minus size={14} />
                              </button>
                              <button
                                onClick={() => openModal(record, 'Add')}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                                title="Add stock"
                                aria-label="Add stock"
                              >
                                <Plus size={14} />
                              </button>
                              <button
                                onClick={() => openModal(record, 'Set')}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-200 text-stone-700 hover:border-stone-400 transition-colors"
                                title="Set exact count"
                                aria-label="Set exact count"
                              >
                                <SlidersHorizontal size={14} />
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="block text-right text-[11px] font-mono text-stone-400">Read-Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Update Modal */}
      <StockAdjustModal
        record={modal?.record ?? null}
        isOpen={!!modal}
        initialOperation={modal?.operation}
        candidates={rows}
        onClose={() => setModal(null)}
        onAdjusted={handleAdjusted}
      />
    </div>
  );
};
