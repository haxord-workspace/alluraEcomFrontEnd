import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ProductImageLightbox } from './ProductImageLightbox';

// -----------------------------------------------------------------------------
// Zoom Constants (Configurable)
// -----------------------------------------------------------------------------
export const DESKTOP_HOVER_ZOOM = 2.5;
export const HOVER_RESET_MS = 200;

interface ProductImageZoomProps {
  src: string;
  alt: string;
  images: string[];
  activeImageIdx: number;
  onImageChange: (index: number) => void;
  overlayButtons?: React.ReactNode;
}

export const ProductImageZoom: React.FC<ProductImageZoomProps> = ({
  src,
  alt,
  images,
  activeImageIdx,
  onImageChange,
  overlayButtons,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number | null>(null);

  const [isHovering, setIsHovering] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isMouseDevice, setIsMouseDevice] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : false
  );
  const [imageError, setImageError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  // Adjust state during render when src changes
  if (prevSrc !== src) {
    setPrevSrc(src);
    setImageError(false);
    setIsHovering(false);
  }

  // ── Device Detection: (hover: hover) and (pointer: fine) ─────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia('(hover: hover) and (pointer: fine)');

    const onChange = (e: MediaQueryListEvent) => {
      setIsMouseDevice(e.matches);
      if (!e.matches) {
        // Leaving mouse mode: cancel hover zoom
        setIsHovering(false);
        if (imgRef.current) {
          imgRef.current.style.transform = 'scale(1)';
          imgRef.current.style.transformOrigin = 'center center';
        }
      }
    };

    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Reset transform whenever image source or index changes
  useEffect(() => {
    if (imgRef.current) {
      imgRef.current.style.transform = 'scale(1)';
      imgRef.current.style.transformOrigin = 'center center';
    }
  }, [src, activeImageIdx]);

  // Clean up any pending animation frame on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Desktop Hover Zoom Handlers ────────────────────────────────────────────
  const onMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDevice || imageError) return;
    setIsHovering(true);

    if (containerRef.current && imgRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      imgRef.current.style.willChange = 'transform';
      imgRef.current.style.transformOrigin = `${xPercent}% ${yPercent}%`;
      imgRef.current.style.transition = prefersReducedMotion ? 'none' : `transform ${HOVER_RESET_MS}ms ease-out`;
      imgRef.current.style.transform = `scale(${DESKTOP_HOVER_ZOOM})`;
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDevice || !isHovering || imageError) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (imgRef.current) {
        imgRef.current.style.transformOrigin = `${xPercent}% ${yPercent}%`;
      }
    });
  };

  const onMouseLeave = () => {
    if (!isMouseDevice) return;
    setIsHovering(false);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (imgRef.current) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      imgRef.current.style.transition = prefersReducedMotion ? 'none' : `transform ${HOVER_RESET_MS}ms ease-out`;
      imgRef.current.style.transform = 'scale(1)';

      // Reset origin back to center once zoom-out transition finishes
      setTimeout(() => {
        if (imgRef.current && !isHovering) {
          imgRef.current.style.transformOrigin = 'center center';
          imgRef.current.style.willChange = 'auto';
        }
      }, HOVER_RESET_MS);
    }
  };

  // ── Mobile / Tablet Click Handlers ─────────────────────────────────────────
  const handleClick = () => {
    // On touch/tablet devices, tapping opens the lightbox viewer
    if (!isMouseDevice && !imageError) {
      setIsLightboxOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsLightboxOpen(true);
    }
  };

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        role="button"
        tabIndex={0}
        aria-label={`${alt}. Click or press Enter to enlarge image`}
        onMouseEnter={onMouseEnter}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`aspect-[4/5] w-full rounded-lg overflow-hidden bg-allura-bgSecondary relative shadow-subtle border border-allura-border/60 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-allura-goldDark ${
          isMouseDevice ? (isHovering ? 'cursor-crosshair' : 'cursor-zoom-in') : 'cursor-pointer'
        }`}
      >
        {imageError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-allura-bgSecondary text-allura-muted text-xs">
            <span>Image unavailable</span>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            onError={() => setImageError(true)}
            draggable={false}
            className="w-full h-full object-cover object-top select-none pointer-events-none"
            style={{
              transformOrigin: 'center center',
              transform: 'scale(1)',
            }}
          />
        )}

        {/* Overlay Buttons Slot (Wishlist & Share) */}
        {overlayButtons && (
          <div
            className="absolute inset-0 pointer-events-none z-20"
            onMouseEnter={e => e.stopPropagation()}
            onMouseMove={e => e.stopPropagation()}
          >
            {overlayButtons}
          </div>
        )}
      </div>

      {/* Full-Screen Mobile/Tablet Lightbox Viewer */}
      <ProductImageLightbox
        isOpen={isLightboxOpen}
        images={images.length > 0 ? images : [src]}
        currentIndex={activeImageIdx}
        productName={alt}
        onClose={closeLightbox}
        onIndexChange={onImageChange}
      />
    </>
  );
};

export default ProductImageZoom;
