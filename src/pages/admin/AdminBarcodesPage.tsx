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
  PackageSearch,
  ExternalLink,
  X,
} from 'lucide-react';
import { BarcodeScannerModal } from '../../components/admin/BarcodeScannerModal';
import { PrintTagDialog, type PrintTagTarget } from '../../components/admin/barcodes/PrintTagDialog';
import { BulkPrintDialog, type BulkPrintProduct, type BulkPrintSource } from '../../components/admin/barcodes/BulkPrintDialog';
import { ProductPickerDialog, type PickerProduct } from '../../components/admin/barcodes/ProductPickerDialog';
import { getAdminProducts } from '../../service/adminProducts';
import { getAdminVariants } from '../../service/adminVariants';
import { generateBarcode, validateBarcode } from '../../service/barcode';
import { releaseLabelPdfUrl, type PrintLabelPdfOptions } from '../../service/barcodeLabels';
import type { AdminProduct, AdminProductVariant } from '../../types';
import { getBackendErrorMessage } from '../../utils/apiResponse';
import { useShop } from '../../context/ShopContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useLabelPresets } from '../../hooks/useLabelPresets';

/** The last label PDF, kept for an "Open PDF" link (Safari / popup-blocked fallback) */
interface LastLabelPdf {
  url: string;
  blocked: boolean;
}

/** The print iframe may still be reading the PDF; free it only after that has finished */
const PDF_RELEASE_DELAY_MS = 60_000;

export const AdminBarcodesPage: React.FC = () => {
  const { showToast } = useShop();
  const { can } = usePermissions();
  // Backend: products_catalog:view or inventory_stock:view may print labels
  const canPrintLabels = can('products', 'view') || can('inventory', 'view');
  const labelPresets = useLabelPresets(canPrintLabels);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [variants, setVariants] = useState<AdminProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Label printing
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [printTagTarget, setPrintTagTarget] = useState<PrintTagTarget | null>(null);
  const [bulkSource, setBulkSource] = useState<BulkPrintSource | null>(null);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [lastPdf, setLastPdf] = useState<LastLabelPdf | null>(null);
  const lastPdfUrlRef = React.useRef<string | null>(null);

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
      // Drop selections for variants that no longer exist
      const ids = new Set(variantData.map(v => v.id));
      setSelectedIds(prev => {
        const kept = [...prev].filter(id => ids.has(id));
        return kept.length === prev.size ? prev : new Set(kept);
      });
    } catch (err: any) {
      setError(getBackendErrorMessage(err, 'Failed to load barcode data'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const assigned = variants.filter(v => v.barcode?.value);
  const unassigned = variants.filter(v => !v.barcode?.value);

  // By default the table lists assigned barcodes only (as before); "Show unassigned" adds the rest
  const tableVariants = showUnassigned ? variants : assigned;
  const filtered = tableVariants.filter(v => {
    const q = searchQuery.toLowerCase();
    const productName = productMap[v.productId]?.name || '';
    return (
      (v.barcode?.value || '').toLowerCase().includes(q) ||
      productName.toLowerCase().includes(q) ||
      v.sku.toLowerCase().includes(q)
    );
  });

  // ─── Label printing ─────────────────────────────────────────────────────────

  // Free the last PDF when the page goes away (after the print iframe is done with it)
  useEffect(() => () => {
    const url = lastPdfUrlRef.current;
    if (url) window.setTimeout(() => releaseLabelPdfUrl(url), PDF_RELEASE_DELAY_MS);
  }, []);

  const keepLastPdf = (url: string, blocked: boolean) => {
    const previous = lastPdfUrlRef.current;
    if (previous && previous !== url) window.setTimeout(() => releaseLabelPdfUrl(previous), PDF_RELEASE_DELAY_MS);
    lastPdfUrlRef.current = url;
    setLastPdf({ url, blocked });
  };

  const dismissLastPdf = () => {
    const url = lastPdfUrlRef.current;
    if (url) window.setTimeout(() => releaseLabelPdfUrl(url), PDF_RELEASE_DELAY_MS);
    lastPdfUrlRef.current = null;
    setLastPdf(null);
  };

  const pdfHandlers: PrintLabelPdfOptions = {
    onPdfReady: url => keepLastPdf(url, false),
    onFallback: ({ url, opened }) => {
      keepLastPdf(url, !opened);
      showToast(
        opened
          ? 'Opened the label PDF in a new tab. Print it from there.'
          : 'Your browser blocked the print window. Use "Open PDF" above the table to print the labels.',
        opened ? 'info' : 'error'
      );
    },
  };

  const handleLabelsPrinted = (message: string) => showToast(message, 'success');

  const toBulkRow = (v: AdminProductVariant) => ({
    variantId: v.id,
    sku: v.sku,
    productName: productMap[v.productId]?.name || v.productId,
    barcode: v.barcode?.value || null,
  });

  const openPrintTag = (v: AdminProductVariant) => {
    if (!canPrintLabels || !v.barcode?.value) return;
    setPrintTagTarget({
      variantId: v.id,
      sku: v.sku,
      productName: productMap[v.productId]?.name || v.productId,
      barcode: v.barcode.value,
    });
  };

  const selectedVariants = variants.filter(v => selectedIds.has(v.id));
  const hiddenSelectedCount = selectedVariants.filter(v => !filtered.some(f => f.id === v.id)).length;

  const openBulkForSelection = () => {
    if (selectedVariants.length === 0) return;
    setBulkSource({ kind: 'variants', rows: selectedVariants.map(toBulkRow) });
  };

  // "Print Label Sheet": the new PDF bulk print. Uses the selected rows, or every listed row with a barcode.
  const handlePrintLabels = () => {
    if (!canPrintLabels) return;
    if (selectedVariants.length > 0) {
      openBulkForSelection();
      return;
    }
    const rows = filtered.filter(v => v.barcode?.value);
    if (rows.length === 0) {
      showToast('No barcodes to print. Assign barcodes or clear your search first.', 'info');
      return;
    }
    setBulkSource({ kind: 'variants', rows: rows.map(toBulkRow) });
  };

  const pickerProducts: PickerProduct[] = React.useMemo(() => {
    const counts: Record<string, number> = {};
    variants.forEach(v => { counts[v.productId] = (counts[v.productId] || 0) + 1; });
    return products
      .map(p => ({ id: p.id, name: p.name, sku: p.sku || '', status: p.status || '', variantCount: counts[p.id] || 0 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, variants]);

  const handleProductsChosen = (chosen: BulkPrintProduct[]) => {
    setIsProductPickerOpen(false);
    setBulkSource({ kind: 'products', products: chosen });
  };

  const toggleSelected = (variantId: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });

  // "Select all" = the rows currently listed (after search / filter). Other selections are kept.
  const allVisibleSelected = filtered.length > 0 && filtered.every(v => selectedIds.has(v.id));
  const someVisibleSelected = filtered.some(v => selectedIds.has(v.id));
  const toggleAllVisible = () =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      filtered.forEach(v => (allVisibleSelected ? next.delete(v.id) : next.add(v.id)));
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set());

  const tableColumnCount = canPrintLabels ? 7 : 6;

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

        <div className="flex flex-wrap items-center gap-3">
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
            disabled={!canPrintLabels || isLoading}
            title={
              canPrintLabels
                ? selectedIds.size > 0
                  ? `Print labels for the ${selectedIds.size} selected variant(s)`
                  : 'Print labels for every listed barcode'
                : "You don't have permission to print labels"
            }
            className="px-4 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 rounded-xl text-xs font-sans font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <p className="font-serif text-2xl font-bold text-[#561C08]">{variants.length}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-emerald-700">Assigned Barcodes</span>
          <p className="font-serif text-2xl font-bold text-emerald-800">{assigned.length}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-400">Unassigned</span>
          <p className="font-serif text-2xl font-bold text-[#561C08]">{unassigned.length}</p>
          <p className="text-[10px] font-sans text-stone-400 leading-snug">Assign barcodes to print labels for these.</p>
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

          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
            <label className="flex items-center gap-2 text-xs font-sans text-stone-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showUnassigned}
                onChange={e => setShowUnassigned(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#561C08]"
              />
              <span>Show unassigned</span>
            </label>
            {canPrintLabels && (
              <button
                type="button"
                onClick={() => setIsProductPickerOpen(true)}
                disabled={isLoading || !!error}
                className="px-3 py-1.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 rounded-lg text-xs font-sans font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <PackageSearch size={14} />
                <span>Print by product</span>
              </button>
            )}
          </div>
        </div>

        {canPrintLabels && selectedIds.size > 0 && (
          <div className="mx-4 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-sans">
            <p className="text-stone-700" aria-live="polite">
              <span className="font-bold">{selectedIds.size}</span> selected
              {hiddenSelectedCount > 0 && <span className="text-stone-400"> ({hiddenSelectedCount} not shown by the current search)</span>}
            </p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={clearSelection} className="text-stone-500 hover:text-stone-900 underline">
                Clear selection
              </button>
              <button
                type="button"
                onClick={openBulkForSelection}
                className="px-3 py-1.5 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-lg font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                <Printer size={13} />
                <span>Print selected ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        )}

        {lastPdf && (
          <div
            className={`mx-4 px-3 py-2 border rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-sans ${
              lastPdf.blocked ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-stone-50 border-stone-200 text-stone-600'
            }`}
            role="status"
          >
            <p>
              {lastPdf.blocked
                ? 'Your browser blocked the print window. Open the PDF and print it from there.'
                : 'Labels were sent to the print dialog. No print dialog? Open the PDF and print it from there.'}
            </p>
            <div className="flex items-center gap-2">
              <a
                href={lastPdf.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 border border-stone-200 bg-white hover:bg-stone-100 text-stone-800 rounded-lg font-semibold flex items-center gap-1.5"
              >
                <ExternalLink size={13} />
                <span>Open PDF</span>
              </a>
              <button type="button" onClick={dismissLastPdf} aria-label="Dismiss" className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

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
                  {canPrintLabels && (
                    <th className="w-10 py-4 pl-4 pr-0">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        ref={el => {
                          if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
                        }}
                        disabled={filtered.length === 0}
                        onChange={toggleAllVisible}
                        aria-label="Select all listed rows"
                        title="Select all listed rows"
                        className="h-3.5 w-3.5 accent-[#561C08] align-middle"
                      />
                    </th>
                  )}
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
                  const hasBarcode = !!v.barcode?.value;
                  const isSelected = selectedIds.has(v.id);
                  return (
                    <tr key={v.id} className={`hover:bg-stone-50/70 transition-colors ${isSelected ? 'bg-stone-50' : ''}`}>
                      {canPrintLabels && (
                        <td className="w-10 py-4 pl-4 pr-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelected(v.id)}
                            aria-label={`Select row ${v.sku}`}
                            className="h-3.5 w-3.5 accent-[#561C08] align-middle"
                          />
                        </td>
                      )}
                      <td className="p-4 font-mono font-bold text-stone-800">
                        {hasBarcode ? (
                          v.barcode?.value
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-sans text-[10px] font-bold uppercase tracking-wider">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-stone-500">{v.barcode?.type || '—'}</td>
                      <td className="p-4">
                        <p className="font-medium text-stone-900 font-serif">{product?.name || v.productId}</p>
                      </td>
                      <td className="p-4 font-mono text-stone-600 font-semibold">{v.sku}</td>
                      <td className="p-4 font-bold text-[#561C08]">
                        {v.pricing?.currency} {v.pricing?.sellingPrice?.toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        {/* Wrapper carries the tooltip: disabled buttons don't get hover events everywhere */}
                        <span
                          className="inline-block"
                          title={!canPrintLabels ? "You don't have permission to print labels" : !hasBarcode ? 'Assign a barcode first' : undefined}
                        >
                          <button
                            type="button"
                            onClick={() => openPrintTag(v)}
                            disabled={!canPrintLabels || !hasBarcode}
                            aria-label={hasBarcode ? `Print tag for ${v.sku}` : `Print tag for ${v.sku} (assign a barcode first)`}
                            className="px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-sans text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-stone-600"
                          >
                            Print Tag
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={tableColumnCount} className="p-12 text-center text-stone-500">
                      {showUnassigned ? 'No variants found.' : 'No assigned barcodes found.'} {searchQuery && 'Try clearing your search.'}
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
                className="w-full px-4 py-2.5 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
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

      {/* Label printing dialogs */}
      {canPrintLabels && printTagTarget && (
        <PrintTagDialog
          target={printTagTarget}
          presets={labelPresets}
          pdfHandlers={pdfHandlers}
          onClose={() => setPrintTagTarget(null)}
          onPrinted={handleLabelsPrinted}
          onVariantMissing={fetchAll}
        />
      )}
      {canPrintLabels && bulkSource && (
        <BulkPrintDialog
          source={bulkSource}
          presets={labelPresets}
          pdfHandlers={pdfHandlers}
          onClose={() => setBulkSource(null)}
          onPrinted={handleLabelsPrinted}
          onVariantMissing={fetchAll}
        />
      )}
      {canPrintLabels && isProductPickerOpen && (
        <ProductPickerDialog
          products={pickerProducts}
          onClose={() => setIsProductPickerOpen(false)}
          onConfirm={handleProductsChosen}
        />
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
};
