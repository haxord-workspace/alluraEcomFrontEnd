import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit3, 
  Copy, 
  Trash2, 
  Eye, 
  CheckSquare, 
  Square, 
  Barcode 
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const AdminProductsPage: React.FC = () => {
  const { products, deleteProduct, duplicateProduct, archiveProduct, hasPermission } = useAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteModalProduct, setDeleteModalProduct] = useState<{ id: string; name: string } | null>(null);

  const categories = ['All', 'Ethnic Wear', 'Modest Wear', 'Party Wear', 'Curated Sets', 'Bridal Edit'];

  const filtered = products.filter(p => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesStock =
      selectedStockStatus === 'All' ||
      (selectedStockStatus === 'InStock' && (p.stockCount ?? 0) > 0) ||
      (selectedStockStatus === 'LowStock' && (p.stockCount ?? 0) > 0 && (p.stockCount ?? 0) <= 6) ||
      (selectedStockStatus === 'OutOfStock' && (p.stockCount ?? 0) === 0);
    const matchesQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesStock && matchesQuery;
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(p => p.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleBulkArchive = () => {
    selectedIds.forEach(id => archiveProduct(id));
    setSelectedIds([]);
  };

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
          <Link
            to="/admin/barcodes"
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-sans font-semibold transition-colors flex items-center gap-1.5"
          >
            <Barcode size={14} />
            <span>Scan / Print Barcodes</span>
          </Link>

          {hasPermission('products', 'create') && (
            <Link
              to="/admin/products/new"
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>Add New Product</span>
            </Link>
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
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-700 focus:outline-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  Category: {cat}
                </option>
              ))}
            </select>

            {/* Stock status filter */}
            <select
              value={selectedStockStatus}
              onChange={e => setSelectedStockStatus(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-700 focus:outline-none"
            >
              <option value="All">Stock: All</option>
              <option value="InStock">In Stock (&gt;0)</option>
              <option value="LowStock">Low Stock (≤6)</option>
              <option value="OutOfStock">Out of Stock (0)</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-stone-900 text-white p-3 rounded-xl flex items-center justify-between text-xs font-sans animate-slide-up">
            <span className="font-semibold">
              {selectedIds.length} item(s) selected
            </span>
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
                <th className="p-4">Category / Occasion</th>
                <th className="p-4">Selling Price</th>
                <th className="p-4">Inventory Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(product => {
                const isChecked = selectedIds.includes(product.id);

                return (
                  <tr key={product.id} className={`hover:bg-stone-50/70 transition-colors ${isChecked ? 'bg-amber-50/20' : ''}`}>
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
                        <img
                          src={product.images.primary}
                          alt={product.name}
                          className="w-12 h-16 object-cover rounded-lg bg-stone-100 flex-shrink-0"
                        />
                        <div className="space-y-0.5">
                          <p className="font-serif text-sm font-medium text-stone-900 leading-tight">
                            {product.name}
                          </p>
                          <p className="font-mono text-[10px] text-stone-400">SKU: {product.sku}</p>
                          <span className="text-[10px] text-stone-500">
                            {product.colors.length} colors • {product.sizes.join(', ')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-stone-700">
                      <p className="font-medium">{product.category}</p>
                      <p className="text-[10px] text-stone-400">{product.occasion}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-stone-900">₹ {product.price.toLocaleString('en-IN')}</p>
                      {product.originalPrice && (
                        <p className="text-[10px] text-stone-400 line-through">
                          ₹ {product.originalPrice.toLocaleString('en-IN')}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block font-bold text-xs ${
                          (product.stockCount ?? 0) === 0
                            ? 'text-rose-700'
                            : (product.stockCount ?? 0) <= 6
                            ? 'text-amber-700'
                            : 'text-emerald-800'
                        }`}
                      >
                        {product.stockCount ?? 10} units in atelier
                      </span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={product.status || 'Active'} size="sm" />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/product/${product.slug}`}
                          target="_blank"
                          title="Preview on Storefront"
                          className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100"
                        >
                          <Eye size={14} />
                        </Link>
                        {hasPermission('products', 'edit') && (
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            title="Edit Product"
                            className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100"
                          >
                            <Edit3 size={14} />
                          </Link>
                        )}
                        {hasPermission('products', 'create') && (
                          <button
                            onClick={() => duplicateProduct(product.id)}
                            title="Duplicate Product"
                            className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100"
                          >
                            <Copy size={14} />
                          </button>
                        )}
                        {hasPermission('products', 'delete') && (
                          <button
                            onClick={() => setDeleteModalProduct({ id: product.id, name: product.name })}
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
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation modal for delete */}
      <ConfirmModal
        isOpen={!!deleteModalProduct}
        onClose={() => setDeleteModalProduct(null)}
        onConfirm={() => {
          if (deleteModalProduct) deleteProduct(deleteModalProduct.id);
        }}
        title="Delete Product from Catalog"
        message={`Are you sure you want to permanently remove "${deleteModalProduct?.name}"? This will archive all variant SKUs and barcodes.`}
        confirmLabel="Delete Product"
        isDestructive
      />
    </div>
  );
};
