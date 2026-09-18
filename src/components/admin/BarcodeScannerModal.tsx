import React, { useState } from 'react';
import { Camera, X, Scan, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductDetected?: (product: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onProductDetected,
}) => {
  const { products } = useAdmin();
  const navigate = useNavigate();

  const [isScanning, setIsScanning] = useState(true);
  const [detectedProduct, setDetectedProduct] = useState<Product | null>(null);

  if (!isOpen) return null;

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const sample = products[0];
      setDetectedProduct(sample);
      setIsScanning(false);
      if (onProductDetected) {
        onProductDetected(sample);
      }
    }, 1200);
  };

  const handleReset = () => {
    setDetectedProduct(null);
    setIsScanning(true);
  };

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

        {/* Viewfinder Camera Box */}
        <div className="p-6 text-center space-y-4">
          <div className="relative w-full h-64 bg-stone-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-dashed border-allura-gold/50 shadow-inner">
            {/* Viewfinder Grid overlay */}
            <div className="absolute inset-8 border-2 border-allura-gold/80 rounded-xl pointer-events-none">
              {/* Corner markers */}
              <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white" />
              <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white" />
              <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white" />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white" />
            </div>

            {/* Red laser animated line */}
            {isScanning && !detectedProduct && (
              <div className="absolute left-8 right-8 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse" />
            )}

            {!detectedProduct ? (
              <div className="space-y-2 z-10 text-stone-300 px-4">
                <Scan size={36} className="mx-auto text-allura-gold animate-bounce" />
                <p className="text-xs font-sans font-medium">
                  Align camera with garment barcode / EAN-13 label
                </p>
                <p className="text-[10px] text-stone-500 font-mono">
                  Optical Lens active • Auto-focusing...
                </p>
              </div>
            ) : (
              <div className="space-y-2 z-10 text-emerald-400">
                <CheckCircle2 size={40} className="mx-auto" />
                <p className="text-xs font-sans font-bold">BARCODE DETECTED (EAN-13)</p>
                <p className="text-xs font-mono text-white">8901234567890</p>
              </div>
            )}
          </div>

          {/* Detected product preview */}
          {detectedProduct ? (
            <div className="bg-white border border-emerald-300 rounded-xl p-4 flex items-center justify-between gap-4 text-left animate-slide-up">
              <div className="flex items-center gap-3">
                <img
                  src={detectedProduct.images.primary}
                  alt={detectedProduct.name}
                  className="w-14 h-18 object-cover rounded-lg bg-stone-100"
                />
                <div className="text-xs font-sans space-y-1">
                  <p className="font-serif text-sm font-bold text-allura-text">{detectedProduct.name}</p>
                  <p className="text-allura-muted font-mono">SKU: {detectedProduct.sku}</p>
                  <p className="font-bold text-allura-darkBrown">₹ {detectedProduct.price.toLocaleString('en-IN')}</p>
                  <span className="inline-block text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                    Stock: {detectedProduct.stockCount || 6} in Atelier
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/admin/products/${detectedProduct.id}/edit`);
                  }}
                  className="px-3.5 py-2 bg-allura-darkBrown text-white text-xs font-sans font-bold uppercase rounded-lg hover:bg-allura-softBrown transition-colors flex items-center gap-1.5"
                >
                  <span>Edit Product</span>
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
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleSimulateScan}
                className="px-6 py-2.5 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center gap-2 shadow-sm"
              >
                <Scan size={14} />
                <span>Simulate Optical Scan</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
