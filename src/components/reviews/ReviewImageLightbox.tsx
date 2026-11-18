import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';
import type { ReviewImage } from '../../types/reviews';

interface ReviewImageLightboxProps {
  images: ReviewImage[];
  startIndex: number;
  onClose: () => void;
}

/** Full-screen viewer for review photos. ←/→ to browse, Esc to close. */
export const ReviewImageLightbox: React.FC<ReviewImageLightboxProps> = ({ images, startIndex, onClose }) => {
  const [index, setIndex] = useState(() => Math.min(Math.max(0, startIndex), Math.max(0, images.length - 1)));
  const containerRef = useRef<HTMLDivElement>(null);
  const isOpen = images.length > 0;
  useModalA11y(isOpen, containerRef, onClose);

  const count = images.length;
  const prev = useCallback(() => setIndex(i => (i - 1 + count) % count), [count]);
  const next = useCallback(() => setIndex(i => (i + 1) % count), [count]);

  useEffect(() => {
    if (count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [count, prev, next]);

  if (!isOpen) return null;
  const image = images[index];

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Review photo ${index + 1} of ${count}`}
      tabIndex={-1}
      className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center animate-fade-in focus:outline-none"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Close photo viewer"
      >
        <X size={20} />
      </button>

      <img
        src={image.url}
        alt={image.alt || `Customer review photo ${index + 1}`}
        className="max-w-[92vw] max-h-[80vh] object-contain rounded-lg"
        onClick={e => e.stopPropagation()}
      />

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Previous photo"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Next photo"
          >
            <ChevronRight size={22} />
          </button>
          <p className="absolute bottom-6 left-0 right-0 text-center text-xs font-sans text-white/80" aria-live="polite">
            {index + 1} / {count}
          </p>
        </>
      )}
    </div>
  );
};
