import React, { useState } from 'react';
import { 
  Camera, 
  Printer, 
  Search 
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { BarcodeScannerModal } from '../../components/admin/BarcodeScannerModal';

export const AdminBarcodesPage: React.FC = () => {
  const { products } = useAdmin();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const barcodesList = products.map((p, idx) => ({
    id: `bc-${idx + 1}`,
    barcode: p.barcode || `890${Math.floor(100000000 + idx * 8421)}`,
    type: 'EAN-13',
    productName: p.name,
    sku: p.sku,
    category: p.category,
    price: p.price,
    stock: p.stockCount || 10,
    status: 'Assigned',
    created: '12 Sep 2026',
  }));

  const filtered = barcodesList.filter(
    b =>
      b.barcode.includes(searchQuery) ||
      b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrintLabels = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            ATELIER LOGISTICS & SCANNING
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Barcode Management & Scanner
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Generate EAN-13 labels, print atelier garment tags, and scan live camera barcodes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm"
          >
            <Camera size={15} />
            <span>Launch Live Scanner</span>
          </button>

          <button
            onClick={handlePrintLabels}
            className="px-4 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 rounded-xl text-xs font-sans font-semibold transition-colors flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Print Label Sheet</span>
          </button>
        </div>
      </div>

      {/* Barcode Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-400">Total Barcodes</span>
          <p className="font-serif text-2xl font-bold text-stone-900">{barcodesList.length}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-emerald-700">Assigned SKUs</span>
          <p className="font-serif text-2xl font-bold text-emerald-800">{barcodesList.length}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-400">Unassigned Pool</span>
          <p className="font-serif text-2xl font-bold text-stone-900">48</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-400">Barcode Standard</span>
          <p className="font-serif text-2xl font-bold text-allura-goldDark font-mono">EAN-13</p>
        </div>
      </div>

      {/* Barcodes Table & Print Preview */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs space-y-4">
        <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search barcode number, SKU, or name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Visual Barcode Tag</th>
                <th className="p-4">Barcode Number</th>
                <th className="p-4">Linked Product Ensemble</th>
                <th className="p-4">Master SKU</th>
                <th className="p-4">MRP Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4 text-right">Label Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="p-4">
                    {/* Compact simulated barcode */}
                    <div className="w-28 bg-white border border-stone-200 p-1.5 rounded text-center shadow-2xs">
                      <div className="flex justify-center items-center gap-0.5 h-6">
                        {[3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 1, 4, 2].map((w, i) => (
                          <span key={i} className="bg-black h-full" style={{ width: `${w}px` }} />
                        ))}
                      </div>
                      <span className="font-mono text-[9px] text-stone-700 tracking-wider block mt-0.5">
                        {b.barcode}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-bold text-stone-800">{b.barcode}</td>
                  <td className="p-4">
                    <p className="font-medium text-stone-900 font-serif">{b.productName}</p>
                    <p className="text-[10px] text-stone-400">{b.category}</p>
                  </td>
                  <td className="p-4 font-mono text-stone-600 font-semibold">{b.sku}</td>
                  <td className="p-4 font-bold text-stone-900">₹ {b.price.toLocaleString('en-IN')}</td>
                  <td className="p-4 font-bold text-emerald-800">{b.stock} units</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={handlePrintLabels}
                      className="px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-sans text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                    >
                      Print Tag
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barcode Camera Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
};
