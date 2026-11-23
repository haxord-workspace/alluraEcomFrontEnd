import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

// -----------------------------------------------------------------------------
// Zoom & Pan Constants (Configurable)
// -----------------------------------------------------------------------------
export const LIGHTBOX_MIN_ZOOM = 1.0;
export const LIGHTBOX_MAX_ZOOM = 4.0;
export const LIGHTBOX_DOUBLE_TAP_ZOOM = 2.5;
export const ZOOM_TRANSITION_MS = 200;

interface ProductImageLightboxProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  productName: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export const ProductImageLightbox: React.FC<ProductImageLightboxProps> = ({
  isOpen,
  images,
  currentIndex,
  productName,
  onClose,
  onIndexChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Transformation state
  const [scale, setScale] = useState(LIGHTBOX_MIN_ZOOM);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevIndex, setPrevIndex] = useState(currentIndex);

  // Sync zoom reset on index change without cascading effects
  if (prevIndex !== currentIndex) {
    setPrevIndex(currentIndex);
    setScale(LIGHTBOX_MIN_ZOOM);
    setPosition({ x: 0, y: 0 });
    setIsAnimating(false);
  }

  // Internal index
  const count = images.length;
  const currentImage = images[currentIndex] || '';

  // Focus trap, Esc to close, scroll lock
  useModalA11y(isOpen, containerRef, onClose);

  // Reset zoom whenever image changes or lightbox opens/closes
  const resetZoom = useCallback((animate = true) => {
    if (animate) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), ZOOM_TRANSITION_MS);
    } else {
      setIsAnimating(false);
    }
    setScale(LIGHTBOX_MIN_ZOOM);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Navigate to previous / next
  const prevImage = useCallback(() => {
    if (count <= 1) return;
    const nextIdx = (currentIndex - 1 + count) % count;
    onIndexChange(nextIdx);
  }, [count, currentIndex, onIndexChange]);

  const nextImage = useCallback(() => {
    if (count <= 1) return;
    const nextIdx = (currentIndex + 1) % count;
    onIndexChange(nextIdx);
  }, [count, currentIndex, onIndexChange]);

  // ── Browser / Android Back Button Integration ───────────────────────────────
  const hasPushedHistory = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasPushedHistory.current = false;
      return;
    }

    // Push history entry so Android / browser back button closes the lightbox
    window.history.pushState({ alluraLightbox: true }, '');
    hasPushedHistory.current = true;

    const onPopState = () => {
      hasPushedHistory.current = false;
      onClose();
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      if (hasPushedHistory.current && window.history.state?.alluraLightbox) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);

  const handleClose = useCallback(() => {
    if (hasPushedHistory.current && window.history.state?.alluraLightbox) {
      // Triggering back pops the state and fires onPopState -> onClose
      window.history.back();
    } else {
      onClose();
    }
  }, [onClose]);

  // Keyboard navigation (Left / Right arrows when at 1x)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (scale <= 1.05) {
        if (e.key === 'ArrowLeft') prevImage();
        if (e.key === 'ArrowRight') nextImage();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, scale, prevImage, nextImage]);

  // ── Clamping calculation (prevents dragging out of view) ────────────────────
  const getClampedPosition = useCallback(
    (newX: number, newY: number, newScale: number) => {
      if (!imageContainerRef.current || !imgRef.current) return { x: 0, y: 0 };
      const containerRect = imageContainerRef.current.getBoundingClientRect();
      const imgWidth = imgRef.current.offsetWidth;
      const imgHeight = imgRef.current.offsetHeight;

      const scaledWidth = imgWidth * newScale;
      const scaledHeight = imgHeight * newScale;

      const maxPanX = Math.max(0, (scaledWidth - containerRect.width) / 2);
      const maxPanY = Math.max(0, (scaledHeight - containerRect.height) / 2);

      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, newY)),
      };
    },
    []
  );

  // Recalculate on window resize / orientation change
  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => {
      setPosition(prev => getClampedPosition(prev.x, prev.y, scale));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [isOpen, scale, getClampedPosition]);

  // ── Touch Gesture Engine (Pinch-to-zoom, Pan, Double-tap, Swipe) ────────────
  const touchState = useRef({
    // Single touch / pan / swipe
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    lastPanX: 0,
    lastPanY: 0,
    // Pinch
    initialDistance: 0,
    initialScale: 1,
    midpointX: 0,
    midpointY: 0,
    // Double tap
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
    isPinching: false,
    isDragging: false,
  });

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const state = touchState.current;
    state.lastPanX = position.x;
    state.lastPanY = position.y;
    setIsAnimating(false);

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      state.startX = touch.clientX;
      state.startY = touch.clientY;
      state.currentX = touch.clientX;
      state.currentY = touch.clientY;
      state.isPinching = false;
      state.isDragging = true;
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      state.isPinching = true;
      state.isDragging = false;
      state.initialDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      state.initialScale = scale;
      state.midpointX = (t1.clientX + t2.clientX) / 2;
      state.midpointY = (t1.clientY + t2.clientY) / 2;
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const state = touchState.current;

    // Multi-touch pinch zoom
    if (state.isPinching && e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      if (state.initialDistance > 0) {
        const factor = distance / state.initialDistance;
        const newScale = Math.min(
          LIGHTBOX_MAX_ZOOM,
          Math.max(LIGHTBOX_MIN_ZOOM, state.initialScale * factor)
        );
        setScale(newScale);

        // Adjust position so it stays clamped
        setPosition(prev => getClampedPosition(prev.x, prev.y, newScale));
      }
      return;
    }

    // Single touch drag or swipe
    if (state.isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      state.currentX = touch.clientX;
      state.currentY = touch.clientY;
      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;

      if (scale > 1.05) {
        // Zoomed in: drag to pan
        e.preventDefault();
        const nextX = state.lastPanX + deltaX;
        const nextY = state.lastPanY + deltaY;
        setPosition(getClampedPosition(nextX, nextY, scale));
      }
    }
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const state = touchState.current;

    if (state.isPinching && e.touches.length < 2) {
      state.isPinching = false;
      // If scale snapped below 1x, smoothly snap back to 1x
      if (scale < 1.05) {
        resetZoom(true);
      }
      return;
    }

    if (state.isDragging && e.touches.length === 0) {
      state.isDragging = false;
      const deltaX = state.currentX - state.startX;
      const deltaY = state.currentY - state.startY;
      const moveDistance = Math.hypot(deltaX, deltaY);

      // Check double-tap (within 300ms and minimal movement)
      const now = Date.now();
      const timeSinceLastTap = now - state.lastTapTime;
      const distFromLastTap = Math.hypot(
        state.currentX - state.lastTapX,
        state.currentY - state.lastTapY
      );

      if (timeSinceLastTap < 300 && distFromLastTap < 30) {
        // Double tap!
        state.lastTapTime = 0;
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), ZOOM_TRANSITION_MS);

        if (scale > 1.05) {
          // Reset to 1x
          setScale(LIGHTBOX_MIN_ZOOM);
          setPosition({ x: 0, y: 0 });
        } else {
          // Zoom in to 2.5x toward tap point
          const targetScale = LIGHTBOX_DOUBLE_TAP_ZOOM;
          setScale(targetScale);

          if (imageContainerRef.current) {
            const rect = imageContainerRef.current.getBoundingClientRect();
            const tapOffsetX = state.currentX - (rect.left + rect.width / 2);
            const tapOffsetY = state.currentY - (rect.top + rect.height / 2);
            const targetX = -tapOffsetX * (targetScale - 1);
            const targetY = -tapOffsetY * (targetScale - 1);
            setPosition(getClampedPosition(targetX, targetY, targetScale));
          }
        }
        return;
      }

      state.lastTapTime = now;
      state.lastTapX = state.currentX;
      state.lastTapY = state.currentY;

      // When at 1x, horizontal swipe switches images
      if (scale <= 1.05 && moveDistance > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < -50) {
          nextImage();
        } else if (deltaX > 50) {
          prevImage();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} image viewer`}
      tabIndex={-1}
      className="fixed inset-0 z-[80] bg-black/95 flex flex-col justify-between select-none focus:outline-none"
      style={{ height: '100dvh' }}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 z-10 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="text-xs font-sans tracking-widest uppercase text-white/70 truncate max-w-[60vw]">
          {productName}
        </span>

        <button
          type="button"
          onClick={handleClose}
          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Close image viewer"
        >
          <X size={22} />
        </button>
      </div>

      {/* Main Zoom Surface */}
      <div
        ref={imageContainerRef}
        className="flex-1 w-full relative flex items-center justify-center overflow-hidden touch-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <img
          ref={imgRef}
          src={currentImage}
          alt={`${productName} view ${currentIndex + 1}`}
          draggable={false}
          className={`max-w-[95vw] max-h-[82dvh] object-contain select-none pointer-events-none will-change-transform ${
            isAnimating ? 'transition-transform duration-200 ease-out' : ''
          }`}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
          }}
        />

        {/* Side Arrows (only when at 1x and multiple images) */}
        {count > 1 && scale <= 1.05 && (
          <>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 active:scale-95 transition-all focus:outline-none"
              aria-label="Previous image"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 active:scale-95 transition-all focus:outline-none"
              aria-label="Next image"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {/* Bottom Counter & Guidance */}
      <div className="flex flex-col items-center justify-center py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-10 space-y-1">
        {count > 1 && (
          <p className="text-xs font-sans text-white/80 font-medium tracking-wider" aria-live="polite">
            {currentIndex + 1} / {count}
          </p>
        )}
        <p className="text-[10px] font-sans text-white/40">
          Pinch or double-tap to zoom • Swipe to navigate
        </p>
      </div>
    </div>
  );
};

export default ProductImageLightbox;
