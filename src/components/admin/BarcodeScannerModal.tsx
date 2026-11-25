import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Keyboard, Scan, CheckCircle2, XCircle, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { scanBarcode } from '../../service/barcode';
import { getAdminProducts } from '../../service/adminProducts';
import type { AdminProduct, AdminProductVariant } from '../../types';
import { Modal } from '../common/Modal';

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
  const [detectedVariant, setDetectedVariant] = useState<AdminProductVariant | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);

  const [scanMode, setScanMode] = useState<ScanMode>('manual');
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

  useEffect(() => {
    if (!isOpen) return;
    setValue('');
    setDetectedVariant(null);
    setNotFound(false);
    setScanError(null);
    setCameraError(null);
    isLookingUpRef.current = false;
    getAdminProducts().then(setProducts).catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Stop whatever the camera is doing — the media stream, the zxing decode loop, and the
  // BarcodeDetector polling interval. Safe to call repeatedly / when nothing is running;
  // each step is independently guarded so one already-stopped resource can't block the rest.
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

  // Run the actual lookup — shared by manual submit and a successful camera detection.
  // Never throws: every failure path resolves into scanError/notFound state instead.
  const performLookup = useCallback(async (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed || isLookingUpRef.current) return;
    isLookingUpRef.current = true;
    stopCamera();
    setIsScanning(true);
    setNotFound(false);
    setScanError(null);
    setDetectedVariant(null);
    try {
      const variant = await scanBarcode(trimmed);
      if (!isMountedRef.current) return;
      if (variant) {
        setDetectedVariant(variant);
        onVariantDetected?.(variant);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error('Barcode scan failed:', err);
      if (isMountedRef.current) {
        setScanError('Something went wrong looking up that barcode. Check your connection and try again.');
      }
    } finally {
      if (isMountedRef.current) setIsScanning(false);
      isLookingUpRef.current = false;
    }
  }, [onVariantDetected, stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsCameraStarting(true);
    try {
      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
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
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              performLookup(codes[0].rawValue);
            }
          } catch {
            // Transient per-frame decode errors are expected; just try again next tick
          }
        }, DETECT_INTERVAL_MS);
      } else {
        // Fallback for browsers without BarcodeDetector (Safari, Firefox): zxing-js
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current || undefined,
          (result) => {
            if (result) performLookup(result.getText());
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
  }, [performLookup]);

  // Start/stop the camera as the modal opens/closes or the mode is toggled. (A successful
  // detection, a not-found result, or a lookup error all stop the camera from within
  // performLookup itself, and only resume it when the user explicitly clicks "Scan Again".)
  useEffect(() => {
    if (isOpen && scanMode === 'camera' && !detectedVariant && !notFound && !scanError) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scanMode]);

  // Close via any path (X, Esc, backdrop, or an in-modal "Close" button) must tear the
  // camera/media stream down immediately rather than waiting on the isOpen effect.
  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(value);
  };

  const handleReset = () => {
    setDetectedVariant(null);
    setNotFound(false);
    setScanError(null);
    setValue('');
    isLookingUpRef.current = false;
    if (scanMode === 'camera') {
      startCamera();
    } else {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const supportsCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const product = detectedVariant ? products.find(p => p.id === detectedVariant.productId) : null;
  const primaryImage = product?.images?.find(img => img.isPrimary)?.url || product?.images?.[0]?.url;

  const showingResult = !!detectedVariant || notFound || !!scanError;

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      isBusy={isScanning}
      isDirty={false}
      backdropClassName="fixed inset-0 z-50 flex items-center justify-center p-4 bg-allura-darkBrown/70 backdrop-blur-sm animate-fade-in"
      panelClassName="relative bg-allura-card border border-allura-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 animate-slide-up max-h-[90vh] flex flex-col focus:outline-none"
      closeButtonClassName="absolute top-3 right-3 z-20 w-10 h-10 flex items-center justify-center rounded-full text-allura-muted hover:text-allura-text hover:bg-allura-bg/60 transition-colors disabled:opacity-40"
    >
      <div className="overflow-y-auto">
        {/* Header */}
        <div className="p-4 pr-14 bg-allura-bgSecondary/80 border-b border-allura-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-allura-goldDark" />
            <h3 className="font-serif text-lg text-allura-text font-normal">
              Atelier Barcode Scanner
            </h3>
          </div>
        </div>

        <div className="px-6 space-y-4">
          {/* Mode toggle */}
          {!showingResult && (
            <div className="flex p-1 bg-allura-bgSecondary/60 border border-allura-border rounded-xl">
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
        </div>

        {/* Viewfinder Box */}
        <div className="px-6 pb-6 text-center space-y-4">
          <div className="relative w-full h-64 bg-stone-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-dashed border-allura-gold/50 shadow-inner">
            {scanMode === 'camera' && !showingResult && (
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
                <p className="text-xs font-mono text-white">No variant is linked to this barcode value.</p>
                <p className="text-[10px] font-mono text-stone-400">{value}</p>
              </div>
            ) : scanError ? (
              <div className="space-y-2 z-10 text-amber-400 px-6">
                <AlertTriangle size={36} className="mx-auto" />
                <p className="text-xs font-sans font-bold">LOOKUP FAILED</p>
                <p className="text-xs font-sans">{scanError}</p>
              </div>
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
                    handleClose();
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
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-[11px] text-allura-muted hover:underline text-center"
                >
                  Close
                </button>
              </div>
            </div>
          ) : notFound || scanError ? (
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 border border-allura-border text-allura-muted text-xs font-sans font-bold uppercase tracking-wider rounded-xl"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 text-allura-muted text-xs font-sans font-bold uppercase tracking-wider rounded-xl hover:bg-allura-bgSecondary/60"
              >
                Close
              </button>
            </div>
          ) : scanMode === 'manual' ? (
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
      </div>
    </Modal>
  );
};
