import React, { useState } from 'react';
import { 
  Search, 
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { StockAdjustModal } from '../../components/admin/StockAdjustModal';
import type { Product } from '../../types';

export const AdminInventoryPage: React.FC = () => {
  const { products, hasPermission } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'All' | 'Low' | 'Out'>('All');
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);

  const totalUnits = products.reduce((acc, p) => acc + (p.stockCount ?? 0), 0);
  const lowStockCount = products.filter(p => (p.stockCount ?? 0) > 0 && (p.stockCount ?? 0) <= 6).length;
  const outOfStockCount = products.filter(p => (p.stockCount ?? 0) === 0).length;

  const filtered = products.filter(p => {
    const matchesFilter =
      stockFilter === 'All' ||
      (stockFilter === 'Low' && (p.stockCount ?? 0) > 0 && (p.stockCount ?? 0) <= 6) ||
      (stockFilter === 'Out' && (p.stockCount ?? 0) === 0);
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
            Real-time physical inventory, low stock thresholds, and rapid cycle adjustments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/inventory/transactions"
            className="px-4 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 rounded-xl text-xs font-sans font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileText size={14} />
            <span>Transactions Audit Ledger</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-400">Total Garment Units</span>
          <p className="font-serif text-2xl font-bold text-stone-900">{totalUnits}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-emerald-700">Healthy Stock</span>
          <p className="font-serif text-2xl font-bold text-emerald-800">{products.length - lowStockCount - outOfStockCount}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-amber-700">Low Stock Alert (≤6)</span>
          <p className="font-serif text-2xl font-bold text-amber-800">{lowStockCount}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-rose-700">Out of Stock (0)</span>
          <p className="font-serif text-2xl font-bold text-rose-800">{outOfStockCount}</p>
        </div>
      </div>

      {/* Table & Filter Toolbar */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs space-y-4">
        <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Filter by product name or SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
            />
          </div>

          <div className="flex gap-2">
            {(['All', 'Low', 'Out'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStockFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-sans font-semibold transition-colors ${
                  stockFilter === f
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {f === 'All' ? 'All Stock' : f === 'Low' ? 'Low Stock' : 'Out of Stock'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Product Ensemble</th>
                <th className="p-4">SKU / Barcode</th>
                <th className="p-4">On Hand</th>
                <th className="p-4">Reserved</th>
                <th className="p-4">Available</th>
                <th className="p-4">Stock Health</th>
                <th className="p-4 text-right">Adjustment Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(product => {
                const onHand = product.stockCount ?? 10;
                const reserved = onHand > 3 ? 1 : 0;
                const available = Math.max(0, onHand - reserved);

                return (
                  <tr key={product.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images.primary}
                          alt={product.name}
                          className="w-10 h-13 object-cover rounded-lg bg-stone-100"
                        />
                        <div>
                          <p className="font-serif text-sm font-medium text-stone-900">{product.name}</p>
                          <p className="text-[10px] text-stone-400">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono">
                      <p className="font-semibold text-stone-700">{product.sku}</p>
                      <p className="text-[10px] text-stone-400">{product.barcode || '8901234567890'}</p>
                    </td>
                    <td className="p-4 font-mono font-bold text-stone-800">{onHand}</td>
                    <td className="p-4 font-mono text-amber-700 font-semibold">{reserved}</td>
                    <td className="p-4 font-mono font-bold text-stone-900 text-sm">{available}</td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          available === 0
                            ? 'bg-rose-100 text-rose-800'
                            : available <= 6
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {available === 0 ? 'Out of Stock' : available <= 6 ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {hasPermission('inventory', 'edit') ? (
                        <button
                          onClick={() => setSelectedProductForAdjust(product)}
                          className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors shadow-xs"
                        >
                          Adjust Stock
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-stone-400">
                          Read-Only
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      <StockAdjustModal
        product={selectedProductForAdjust}
        isOpen={!!selectedProductForAdjust}
        onClose={() => setSelectedProductForAdjust(null)}
      />
    </div>
  );
};
