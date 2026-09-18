import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminVariantsPage: React.FC = () => {
  const { products } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');

  // Expand all variants across products
  const allVariants = products.flatMap(p => {
    return p.sizes.flatMap(size => {
      return p.colors.map(color => ({
        id: `${p.id}-${size}-${color.name}`,
        productName: p.name,
        category: p.category,
        image: p.images.primary,
        sku: `${p.sku}-${size}-${color.name.slice(0, 2).toUpperCase()}`,
        barcode: `890${Math.floor(100000000 + Math.random() * 900000000)}`,
        size,
        color,
        price: p.price,
        stock: p.stockCount || 6,
        status: p.status || 'Active',
      }));
    });
  });

  const filtered = allVariants.filter(
    v =>
      v.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.barcode.includes(searchQuery)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            SKU & VARIANT MATRIX
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Product Variants ({allVariants.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Granular color/size SKU codes, barcode assignments, and individual price adjustments.
          </p>
        </div>

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
      </div>

      {/* Variants Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Product Ensemble</th>
                <th className="p-4">Variant Attributes</th>
                <th className="p-4">SKU Code</th>
                <th className="p-4">Barcode</th>
                <th className="p-4">Price</th>
                <th className="p-4">Available Stock</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.slice(0, 15).map(v => (
                <tr key={v.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={v.image}
                        alt={v.productName}
                        className="w-9 h-12 object-cover rounded bg-stone-100"
                      />
                      <span className="font-medium text-stone-900 line-clamp-1">{v.productName}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border border-stone-300"
                        style={{ backgroundColor: v.color.hex }}
                      />
                      <span className="font-semibold text-stone-800">{v.size}</span>
                      <span className="text-stone-400">({v.color.name})</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-semibold text-stone-700">{v.sku}</td>
                  <td className="p-4 font-mono text-stone-500">{v.barcode}</td>
                  <td className="p-4 font-bold text-stone-900">₹ {v.price.toLocaleString('en-IN')}</td>
                  <td className="p-4 font-bold text-emerald-800">{v.stock} in atelier</td>
                  <td className="p-4">
                    <StatusBadge status={v.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
