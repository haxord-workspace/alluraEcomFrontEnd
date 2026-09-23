import React, { useState, useEffect } from 'react';
import {
  Camera,
  Printer,
  Search,
  Sparkles,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { BarcodeScannerModal } from '../../components/admin/BarcodeScannerModal';
import { getAdminProducts } from '../../service/adminProducts';
import { getAdminVariants, getVariantBarcodePrintImage } from '../../service/adminVariants';
import { generateBarcode, validateBarcode } from '../../service/barcode';
import type { AdminProduct, AdminProductVariant } from '../../types';

export const AdminBarcodesPage: React.FC = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [variants, setVariants] = useState<AdminProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Generate & validate tool
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatorType, setGeneratorType] = useState('EAN13');
  const [generatedValue, setGeneratedValue] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

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
      setError(err?.response?.data?.message || 'Failed to load barcode data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const assigned = variants.filter(v => v.barcode?.value);
  const unassigned = variants.filter(v => !v.barcode?.value);

  const filtered = assigned.filter(v => {
    const q = searchQuery.toLowerCase();
    const productName = productMap[v.productId]?.name || '';
    return (
      (v.barcode?.value || '').toLowerCase().includes(q) ||
      productName.toLowerCase().includes(q) ||
      v.sku.toLowerCase().includes(q)
    );
  });

  const handlePrintTag = async (variantId: string) => {
    setBusyId(variantId);
    try {
      const url = await getVariantBarcodePrintImage(variantId);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to load barcode image:', err);
    } finally {
      setBusyId(null);
    }
  };

  const handlePrintLabels = () => {
    window.print();
  };

  const handleOpenGenerator = () => {
    setGeneratedValue(null);
    setValidation(null);
    setIsGeneratorOpen(true);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setValidation(null);
    try {
      const result = await generateBarcode(generatorType);
      setGeneratedValue(result.value);
    } catch (err) {
      console.error('Failed to generate barcode:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleValidate = async () => {
    if (!generatedValue) return;
    setIsValidating(true);
    try {
      const result = await validateBarcode(generatedValue, generatorType);
      setValidation({ valid: !!result.valid });
    } catch (err) {
      console.error('Failed to validate barcode:', err);
      setValidation({ valid: false });
    } finally {
      setIsValidating(false);
    }
  };

  const handleCopy = () => {
    if (generatedValue) navigator.clipboard.writeText(generatedValue);
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
            Generate, validate, scan, and print barcode labels for variant SKUs.
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

          <button
            onClick={handleOpenGenerator}
            className="px-4 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 rounded-xl text-xs font-sans font-semibold transition-colors flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            <span>Generate Barcode</span>
          </button>

          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm"
          >
            <Camera size={15} />
            <span>Launch Scanner</span>
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
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-400">Total Variants</span>
          <p className="font-serif text-2xl font-bold text-stone-900">{variants.length}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-emerald-700">Assigned Barcodes</span>
          <p className="font-serif text-2xl font-bold text-emerald-800">{assigned.length}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-400">Unassigned</span>
          <p className="font-serif text-2xl font-bold text-stone-900">{unassigned.length}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-400">Barcode Standard</span>
          <p className="font-serif text-2xl font-bold text-allura-goldDark font-mono">EAN13</p>
        </div>
      </div>

      {/* Barcodes Table */}
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
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-sans text-stone-500">Loading barcodes...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-xs font-sans text-rose-600 font-semibold">{error}</p>
              <button onClick={fetchAll} className="mt-3 text-xs font-sans text-stone-500 hover:text-stone-900 underline">
                Try again
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                  <th className="p-4">Barcode Number</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Linked Product Ensemble</th>
                  <th className="p-4">Master SKU</th>
                  <th className="p-4">Selling Price</th>
                  <th className="p-4 text-right">Label Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(v => {
                  const product = productMap[v.productId];
                  return (
                    <tr key={v.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-4 font-mono font-bold text-stone-800">{v.barcode?.value}</td>
                      <td className="p-4 font-mono text-stone-500">{v.barcode?.type}</td>
                      <td className="p-4">
                        <p className="font-medium text-stone-900 font-serif">{product?.name || v.productId}</p>
                      </td>
                      <td className="p-4 font-mono text-stone-600 font-semibold">{v.sku}</td>
                      <td className="p-4 font-bold text-stone-900">
                        {v.pricing?.currency} {v.pricing?.sellingPrice?.toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handlePrintTag(v.id)}
                          disabled={busyId === v.id}
                          className="px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-sans text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors disabled:opacity-50"
                        >
                          {busyId === v.id ? 'Loading...' : 'Print Tag'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-stone-500">
                      No assigned barcodes found. {searchQuery && 'Try clearing your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Generate & Validate Barcode Modal */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h3 className="font-serif text-xl text-stone-900">Generate Barcode</h3>
            <p className="text-xs font-sans text-stone-500">
              Create a unique barcode value to assign to a new product variant.
            </p>

            <div className="space-y-3 text-xs font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Type</label>
                <select
                  value={generatorType}
                  onChange={e => { setGeneratorType(e.target.value); setGeneratedValue(null); setValidation(null); }}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                >
                  <option value="EAN13">EAN13</option>
                  <option value="CODE128">CODE128</option>
                  <option value="QR">QR</option>
                </select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>{isGenerating ? 'Generating...' : 'Generate'}</span>
              </button>

              {generatedValue && (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-stone-900 text-sm">{generatedValue}</span>
                    <button onClick={handleCopy} title="Copy" className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg">
                      <Copy size={14} />
                    </button>
                  </div>

                  <button
                    onClick={handleValidate}
                    disabled={isValidating}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-stone-700 hover:bg-stone-100 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isValidating ? <Loader2 size={13} className="animate-spin" /> : null}
                    <span>{isValidating ? 'Validating...' : 'Validate'}</span>
                  </button>

                  {validation && (
                    <div className={`flex items-center gap-1.5 text-[11px] font-bold ${validation.valid ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {validation.valid ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      <span>{validation.valid ? 'Valid barcode' : 'Invalid barcode'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsGeneratorOpen(false)}
                className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500 hover:bg-stone-50 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
};
