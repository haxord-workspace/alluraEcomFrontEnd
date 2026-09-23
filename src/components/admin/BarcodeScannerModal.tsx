import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Scan, CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { scanBarcode } from '../../service/barcode';
import { getAdminProducts } from '../../service/adminProducts';
import type { AdminProduct, AdminProductVariant } from '../../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVariantDetected?: (variant: AdminProductVariant) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onVariantDetected,
}) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [detectedVariant, setDetectedVariant] = useState<AdminProductVariant | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [products, setProducts] = useState<AdminProduct[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setValue('');
    setDetectedVariant(null);
    setNotFound(false);
    getAdminProducts().then(setProducts).catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setIsScanning(true);
    setNotFound(false);
    setDetectedVariant(null);
    try {
      const variant = await scanBarcode(trimmed);
      if (variant) {
        setDetectedVariant(variant);
        onVariantDetected?.(variant);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error('Barcode scan failed:', err);
      setNotFound(true);
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setDetectedVariant(null);
    setNotFound(false);
    setValue('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const product = detectedVariant ? products.find(p => p.id === detectedVariant.productId) : null;
  const primaryImage = product?.images?.find(img => img.isPrimary)?.url || product?.images?.[0]?.url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-allura-darkBrown/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-allura-card border border-allura-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 animate-slide-up">
        {/* Header */}
        <div className="p-4 bg-allura-bgSecondary/80 border-b border-allura-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-allura-goldDark" />
            <h3 className="font-serif text-lg text-allura-text font-normal">
              Atelier Barcode Scanner
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-allura-muted hover:text-allura-text rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewfinder Box */}
        <div className="p-6 text-center space-y-4">
          <div className="relative w-full h-64 bg-stone-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-dashed border-allura-gold/50 shadow-inner">
            <div className="absolute inset-8 border-2 border-allura-gold/80 rounded-xl pointer-events-none">
              <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white" />
              <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white" />
              <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white" />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white" />
            </div>

            {isScanning && (
              <div className="absolute left-8 right-8 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse" />
            )}

            {detectedVariant ? (
              <div className="space-y-2 z-10 text-emerald-400">
                <CheckCircle2 size={40} className="mx-auto" />
                <p className="text-xs font-sans font-bold">VARIANT MATCHED</p>
                <p className="text-xs font-mono text-white">{detectedVariant.barcode?.value}</p>
              </div>
            ) : notFound ? (
              <div className="space-y-2 z-10 text-rose-400">
                <XCircle size={40} className="mx-auto" />
                <p className="text-xs font-sans font-bold">NO VARIANT FOUND</p>
                <p className="text-xs font-mono text-white">{value}</p>
              </div>
            ) : (
              <div className="space-y-2 z-10 text-stone-300 px-4">
                <Scan size={36} className={`mx-auto text-allura-gold ${isScanning ? 'animate-pulse' : 'animate-bounce'}`} />
                <p className="text-xs font-sans font-medium">
                  Scan with a connected barcode reader, or type the value below
                </p>
                <p className="text-[10px] text-stone-500 font-mono">
                  Hardware scanners type into the field automatically
                </p>
              </div>
            )}
          </div>

          {/* Detected variant preview */}
          {detectedVariant ? (
            <div className="bg-white border border-emerald-300 rounded-xl p-4 flex items-center justify-between gap-4 text-left animate-slide-up">
              <div className="flex items-center gap-3">
                {primaryImage ? (
                  <img src={primaryImage} alt={product?.name} className="w-14 h-18 object-cover rounded-lg bg-stone-100" />
                ) : (
                  <div className="w-14 h-18 rounded-lg bg-stone-100 flex-shrink-0" />
                )}
                <div className="text-xs font-sans space-y-1">
                  <p className="font-serif text-sm font-bold text-allura-text">
                    {product?.name || detectedVariant.productId}
                  </p>
                  <p className="text-allura-muted font-mono">SKU: {detectedVariant.sku}</p>
                  <p className="font-bold text-allura-darkBrown">
                    {detectedVariant.pricing?.currency} {detectedVariant.pricing?.sellingPrice?.toLocaleString()}
                  </p>
                  <span className="inline-block text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                    {detectedVariant.attributes?.size} • {detectedVariant.attributes?.color}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/admin/variants');
                  }}
                  className="px-3.5 py-2 bg-allura-darkBrown text-white text-xs font-sans font-bold uppercase rounded-lg hover:bg-allura-softBrown transition-colors flex items-center gap-1.5"
                >
                  <span>View Variant</span>
                  <ArrowRight size={12} />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[11px] text-allura-muted hover:underline text-center"
                >
                  Scan Another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleScan} className="space-y-3">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="Scan or type barcode value..."
                className="w-full px-4 py-3 text-center font-mono text-sm bg-allura-bg border border-allura-border rounded-xl focus:outline-none focus:border-allura-gold"
              />
              <div className="flex justify-center gap-3">
                {notFound && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2.5 border border-allura-border text-allura-muted text-xs font-sans font-bold uppercase tracking-wider rounded-xl"
                  >
                    Try Again
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isScanning || !value.trim()}
                  className="px-6 py-2.5 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isScanning ? <Loader2 size={14} className="animate-spin" /> : <Scan size={14} />}
                  <span>{isScanning ? 'Looking up...' : 'Lookup Barcode'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
