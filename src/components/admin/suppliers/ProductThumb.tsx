import React, { useState } from 'react';
import type { SupplierProduct } from '../../../types/suppliers';

/**
 * Thumbnail for supplier product rows (Overview "Recent products" and the Products tab).
 * Prefers primaryImage.thumbnailUrl, then primaryImage.url; falls back to the legacy
 * `images` array while an environment doesn't return primaryImage yet. Shows the
 * "NO IMG" placeholder when there's no image or it fails to load.
 */
export const ProductThumb: React.FC<{ product: SupplierProduct }> = ({ product }) => {
  const primary = product.primaryImage;
  const legacy = product.images?.find(img => img.isPrimary) ?? product.images?.[0];
  const src = primary ? primary.thumbnailUrl || primary.url : primary === null ? undefined : legacy?.url;
  const alt = primary?.alt || product.name;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div className="w-12 h-16 rounded-lg bg-stone-100 flex-shrink-0 flex items-center justify-center" role="img" aria-label={`${product.name}: no image`}>
        <span className="text-[8px] text-stone-400 font-mono" aria-hidden="true">
          NO IMG
        </span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className="w-12 h-16 object-cover rounded-lg bg-stone-100 flex-shrink-0"
    />
  );
};
