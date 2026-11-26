import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Camera, Keyboard, Scan, CheckCircle2, XCircle, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { scanBarcode } from '../../service/barcode';
import { getAdminProducts } from '../../service/adminProducts';
import type { AdminProduct, AdminProductVariant } from '../../types';
import { Modal } from '../common/Modal';

export interface ScannedBarcodeEntry {
  id: string;
  barcode: string;
  scannedAt: string;
  status: 'matched' | 'not-found' | 'error';
  variant: AdminProductVariant | null;
  errorMessage?: string;
}

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVariantDetected?: (variant: AdminProductVariant) => void;
}

type ScanMode = 'camera' | 'manual';

// Formats the Barcode Detection API understands for our use case (product/SKU barcodes).
const DETECTOR_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'];
const DETECT_INTERVAL_MS = 300;

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onVariantDetected,
}) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectPollRef = useRef<number | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);

  const [value, setValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [products, setProducts] = useState<AdminProduct[]>([]);

  // Multi-barcode session states
  const [scannedHistory, setScannedHistory] = useState<ScannedBarcodeEntry[]>([]);
  const [currentScannedEntry, setCurrentScannedEntry] = useState<ScannedBarcodeEntry | null>(null);

  const [scanMode, setScanMode] = useState<ScanMode>('camera');
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Guards against a React setState warning if an in-flight lookup resolves after the
  // component is torn down, and against the camera detecting the same code on every frame
  // and firing a burst of duplicate lookups before the stream has had a chance to stop.
  const isMountedRef = useRef(true);
  const isLookingUpRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Initialize a fresh scanning session whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setValue('');
    setCurrentScannedEntry(null);
    setScannedHistory([]);
    setCameraError(null);
    isLookingUpRef.current = false;
    getAdminProducts().then(setProducts).catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const productMap = useMemo(() => {
    const map: Record<string, AdminProduct> = {};
    products.forEach(p => { map[p.id] = p; });
    return map;
  }, [products]);

  // Stop whatever the camera is doing — the media stream, the zxing decode loop, and the
  // BarcodeDetector polling interval. Safe to call repeatedly / when nothing is running.
  const stopCamera = useCallback(() => {
    if (detectPollRef.current !== null) {
      window.clearInterval(detectPollRef.current);
      detectPollRef.current = null;
    }
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch (err) {
        console.warn('zxing scanner controls.stop() failed (already stopped?):', err);
      }
      zxingControlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch { /* already stopped */ }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Run the actual lookup — shared by manual submit and camera detection.
  // Appends new entry to scannedHistory while preserving all previous entries.
  const performLookup = useCallback(async (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed || isLookingUpRef.current) return;
    isLookingUpRef.current = true;
    stopCamera();
    setIsScanning(true);

    const nowStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    try {
      const variant = await scanBarcode(trimmed);
      if (!isMountedRef.current) return;

      if (variant) {
        const newEntry: ScannedBarcodeEntry = {
          id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          barcode: trimmed,
          scannedAt: nowStr,
          status: 'matched',
          variant,
        };
        setScannedHistory(prev => [newEntry, ...prev]);
        setCurrentScannedEntry(newEntry);
        onVariantDetected?.(variant);
      } else {
        const notFoundEntry: ScannedBarcodeEntry = {
          id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          barcode: trimmed,
          scannedAt: nowStr,
          status: 'not-found',
          variant: null,
        };
        setScannedHistory(prev => [notFoundEntry, ...prev]);
        setCurrentScannedEntry(notFoundEntry);
      }
    } catch (err) {
      console.error('Barcode scan failed:', err);
      if (isMountedRef.current) {
        const errorEntry: ScannedBarcodeEntry = {
          id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          barcode: trimmed,
          scannedAt: nowStr,
          status: 'error',
          variant: null,
          errorMessage: 'Something went wrong looking up that barcode. Check your connection and try again.',
        };
        setScannedHistory(prev => [errorEntry, ...prev]);
        setCurrentScannedEntry(errorEntry);
      }
    } finally {
      if (isMountedRef.current) setIsScanning(false);
    }
  }, [onVariantDetected, stopCamera]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setIsCameraStarting(true);
    try {
      const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: any }).BarcodeDetector;
      if (BarcodeDetectorCtor) {
        // Native Barcode Detection API (Chrome/Edge). Poll video frames at a fixed interval.
        let formats = DETECTOR_FORMATS;
        try {
          const supported: string[] = await BarcodeDetectorCtor.getSupportedFormats();
          formats = DETECTOR_FORMATS.filter(f => supported.includes(f));
        } catch {
          // getSupportedFormats isn't universally implemented — fall back to our full list
        }
        const detector = new BarcodeDetectorCtor({ formats: formats.length ? formats : DETECTOR_FORMATS });

        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        detectPollRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2 || isLookingUpRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue && !isLookingUpRef.current) {
              performLookup(codes[0].rawValue);
            }
          } catch {
            // Transient per-frame decode errors are expected; try again next tick
          }
        }, DETECT_INTERVAL_MS);
      } else {
        // Fallback for browsers without BarcodeDetector (Safari, Firefox): zxing-js
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current || undefined,
          (result) => {
            if (result && !isLookingUpRef.current) {
              performLookup(result.getText());
            }
          },
        );
        zxingControlsRef.current = controls;
      }
    } catch (err: any) {
      console.error('Failed to start camera scan:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Allow camera access in your browser, or switch to manual entry.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setCameraError('No camera was found on this device.');
      } else {
        setCameraError('Could not start the camera. Try manual entry instead.');
      }
    } finally {
      setIsCameraStarting(false);
    }
  }, [performLookup, stopCamera]);

  // Start/stop the camera as the modal opens/closes, mode is toggled, or scan completes.
  useEffect(() => {
    if (isOpen && scanMode === 'camera' && !currentScannedEntry) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scanMode, currentScannedEntry]);

  // Close via any path (X, Esc, backdrop, or "Close" button) tears down camera and clears session.
  const handleClose = useCallback(() => {
    stopCamera();
    setCurrentScannedEntry(null);
    setScannedHistory([]);
    isLookingUpRef.current = false;
    onClose();
  }, [stopCamera, onClose]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(value);
  };

  // "Scan Another" keeps the entire scanned history intact and resets only the current scanning state
  const handleReset = () => {
    setCurrentScannedEntry(null);
    setValue('');
    setCameraError(null);
    isLookingUpRef.current = false;
    if (scanMode === 'camera') {
      startCamera();
    } else {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleViewVariant = (variant: AdminProductVariant) => {
    handleClose();
    navigate('/admin/variants', { state: { variantId: variant.id, sku: variant.sku } });
  };

  const supportsCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  // History counts for summary header
  const matchedCount = scannedHistory.filter(h => h.status === 'matched').length;
  const notFoundCount = scannedHistory.filter(h => h.status === 'not-found').length;
  const errorCount = scannedHistory.filter(h => h.status === 'error').length;

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      isBusy={isScanning}
      isDirty={false}
      backdropClassName="fixed inset-0 z-50 flex items-center justify-center p-4 bg-allura-darkBrown/70 backdrop-blur-sm animate-fade-in"
      panelClassName="relative bg-allura-card border border-allura-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up max-h-[85vh] flex flex-col focus:outline-none"
      closeButtonClassName="absolute top-3 right-3 z-20 w-10 h-10 flex items-center justify-center rounded-full text-allura-muted hover:text-allura-text hover:bg-allura-bg/60 transition-colors disabled:opacity-40"
    >
      {/* Fixed Modal Header */}
      <div className="p-4 pr-14 bg-allura-bgSecondary/80 border-b border-allura-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-allura-goldDark" />
          <h3 className="font-serif text-lg text-allura-text font-normal">
            Atelier Barcode Scanner
          </h3>
        </div>
      </div>

      {/* Modal Body Container */}
      <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
        {/* Mode toggle */}
        {!currentScannedEntry && (
          <div className="flex p-1 bg-allura-bgSecondary/60 border border-allura-border rounded-xl flex-shrink-0">
            <button
              type="button"
              onClick={() => setScanMode('camera')}
              disabled={!supportsCamera}
              title={supportsCamera ? undefined : 'No camera API available in this browser'}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-sans font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                scanMode === 'camera' ? 'bg-allura-darkBrown text-white shadow-sm' : 'text-allura-muted hover:text-allura-text'
              }`}
            >
              <Camera size={13} /> Camera
            </button>
            <button
              type="button"
              onClick={() => setScanMode('manual')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-sans font-bold uppercase tracking-wider transition-colors ${
                scanMode === 'manual' ? 'bg-allura-darkBrown text-white shadow-sm' : 'text-allura-muted hover:text-allura-text'
              }`}
            >
              <Keyboard size={13} /> Manual / Hardware Scanner
            </button>
          </div>
        )}

        {/* Viewfinder Box */}
        <div className="text-center space-y-3 flex-shrink-0">
          <div className="relative w-full h-56 sm:h-64 bg-stone-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-dashed border-allura-gold/50 shadow-inner">
            {scanMode === 'camera' && !currentScannedEntry && (
              <video
                ref={videoRef}
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            <div className="absolute inset-8 border-2 border-allura-gold/80 rounded-xl pointer-events-none">
              <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white" />
              <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white" />
              <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white" />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white" />
            </div>

            {isScanning && (
              <div className="absolute left-8 right-8 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse" />
            )}

            {currentScannedEntry ? (
              currentScannedEntry.status === 'matched' ? (
                <div className="space-y-2 z-10 text-emerald-400">
                  <CheckCircle2 size={40} className="mx-auto" />
                  <p className="text-xs font-sans font-bold">VARIANT MATCHED</p>
                  <p className="text-xs font-mono text-white">{currentScannedEntry.barcode}</p>
                </div>
              ) : currentScannedEntry.status === 'not-found' ? (
                <div className="space-y-2 z-10 text-rose-400">
                  <XCircle size={40} className="mx-auto" />
                  <p className="text-xs font-sans font-bold">NO VARIANT FOUND</p>
                  <p className="text-xs font-mono text-white">No variant is linked to this barcode value.</p>
                  <p className="text-[10px] font-mono text-stone-400">{currentScannedEntry.barcode}</p>
                </div>
              ) : (
                <div className="space-y-2 z-10 text-amber-400 px-6">
                  <AlertTriangle size={36} className="mx-auto" />
                  <p className="text-xs font-sans font-bold">LOOKUP FAILED</p>
                  <p className="text-xs font-sans">{currentScannedEntry.errorMessage || 'Something went wrong looking up that barcode.'}</p>
                  <p className="text-[10px] font-mono text-stone-400">{currentScannedEntry.barcode}</p>
                </div>
              )
            ) : scanMode === 'camera' ? (
              cameraError ? (
                <div className="space-y-2 z-10 text-amber-400 px-6">
                  <AlertTriangle size={32} className="mx-auto" />
                  <p className="text-xs font-sans font-medium">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setScanMode('manual')}
                    className="text-[11px] font-bold uppercase text-allura-gold hover:underline"
                  >
                    Switch to Manual Entry
                  </button>
                </div>
              ) : isCameraStarting ? (
                <div className="space-y-2 z-10 text-stone-300">
                  <Loader2 size={32} className="mx-auto animate-spin text-allura-gold" />
                  <p className="text-xs font-sans font-medium">Starting camera…</p>
                </div>
              ) : (
                <p className="absolute bottom-3 left-0 right-0 z-10 text-[10px] text-stone-200 font-sans font-medium drop-shadow">
                  Point the camera at a barcode or QR code
                </p>
              )
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

          {/* Active Action Controls (when a scan just completed) */}
          {currentScannedEntry ? (
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center gap-2 shadow-sm"
              >
                <Camera size={14} />
                <span>Scan Another</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 border border-allura-border text-allura-muted hover:text-allura-text text-xs font-sans font-bold uppercase tracking-wider rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          ) : scanMode === 'manual' ? (
            <form onSubmit={handleScan} className="space-y-3 pt-1">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="Scan or type barcode value..."
                className="w-full px-4 py-3 text-center font-mono text-sm bg-allura-bg border border-allura-border rounded-xl focus:outline-none focus:border-allura-gold"
              />
              <div className="flex justify-center gap-3">
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
          ) : null}
        </div>

        {/* Scan History Section */}
        <div className="pt-2 border-t border-allura-border/70 space-y-3">
          {/* History Header */}
          <div className="flex items-center justify-between text-xs font-sans uppercase tracking-wider">
            <span className="font-bold text-allura-text">Scanned Items</span>
            <div className="flex items-center gap-2 font-sans font-medium">
              <span className="font-mono text-allura-goldDark font-bold">
                {scannedHistory.length} Scanned
              </span>
              {scannedHistory.length > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] normal-case">
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                    {matchedCount} matched
                  </span>
                  {notFoundCount > 0 && (
                    <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-medium border border-rose-200">
                      {notFoundCount} not found
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                      {errorCount} error
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Scanned Results List */}
          {scannedHistory.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-allura-border rounded-xl bg-allura-bg/40 text-allura-muted">
              <Scan size={24} className="mx-auto mb-1.5 opacity-40 text-allura-gold" />
              <p className="text-xs font-sans">No items scanned in this session yet.</p>
              <p className="text-[10px] text-allura-muted/80">Scanned barcodes will remain visible here.</p>
            </div>
          ) : (
            <div
              className={`space-y-2.5 ${
                scannedHistory.length >= 5
                  ? 'max-h-[280px] overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin'
                  : ''
              }`}
            >
              {scannedHistory.map(entry => {
                if (entry.status === 'matched' && entry.variant) {
                  const product = productMap[entry.variant.productId];
                  const primaryImage =
                    product?.images?.find(img => img.isPrimary)?.url ||
                    product?.images?.[0]?.url ||
                    entry.variant.images?.[0]?.url;
                  const productName = product?.name || entry.variant.productId;

                  return (
                    <div
                      key={entry.id}
                      className="bg-white border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-left shadow-xs animate-slide-up"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {primaryImage ? (
                          <img
                            src={primaryImage}
                            alt={productName}
                            className="w-12 h-16 object-cover rounded-lg bg-stone-100 flex-shrink-0 border border-stone-200"
                          />
                        ) : (
                          <div className="w-12 h-16 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0 text-stone-400">
                            <Scan size={20} className="opacity-40" />
                          </div>
                        )}
                        <div className="text-xs font-sans space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              <CheckCircle2 size={10} /> MATCHED
                            </span>
                            <span className="text-[10px] text-allura-muted font-mono">{entry.scannedAt}</span>
                          </div>
                          <p className="font-serif text-sm font-bold text-allura-text truncate" title={productName}>
                            {productName}
                          </p>
                          <p className="text-allura-muted font-mono text-[11px] truncate">
                            {entry.barcode} • SKU: {entry.variant.sku}
                          </p>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="font-bold text-allura-darkBrown">
                              {entry.variant.pricing?.currency || 'INR'}{' '}
                              {entry.variant.pricing?.sellingPrice?.toLocaleString()}
                            </span>
                            {(entry.variant.attributes?.size || entry.variant.attributes?.color) && (
                              <span className="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded font-medium">
                                {[entry.variant.attributes?.size, entry.variant.attributes?.color]
                                  .filter(Boolean)
                                  .join(' • ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleViewVariant(entry.variant!)}
                          className="px-3 py-1.5 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-[11px] font-sans font-bold uppercase rounded-lg transition-colors flex items-center gap-1 shadow-xs whitespace-nowrap"
                        >
                          <span>View Variant</span>
                          <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  );
                }

                if (entry.status === 'not-found') {
                  return (
                    <div
                      key={entry.id}
                      className="bg-white border border-rose-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-left shadow-xs animate-slide-up"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-14 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0 text-rose-500 border border-rose-100">
                          <XCircle size={22} />
                        </div>
                        <div className="text-xs font-sans space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              <XCircle size={10} /> NOT FOUND
                            </span>
                            <span className="text-[10px] text-allura-muted font-mono">{entry.scannedAt}</span>
                          </div>
                          <p className="font-mono text-xs font-bold text-allura-text truncate">
                            {entry.barcode}
                          </p>
                          <p className="text-allura-muted text-[11px]">
                            No variant is linked to this barcode value.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={entry.id}
                    className="bg-white border border-amber-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-left shadow-xs animate-slide-up"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-14 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 text-amber-500 border border-amber-100">
                        <AlertTriangle size={22} />
                      </div>
                      <div className="text-xs font-sans space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            <AlertTriangle size={10} /> LOOKUP FAILED
                          </span>
                          <span className="text-[10px] text-allura-muted font-mono">{entry.scannedAt}</span>
                        </div>
                        <p className="font-mono text-xs font-bold text-allura-text truncate">
                          {entry.barcode}
                        </p>
                        <p className="text-amber-700 text-[11px]">
                          {entry.errorMessage || 'Something went wrong during lookup.'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
