import React from 'react';

interface ItemVariantMetaProps {
  size?: string;
  color?: { name?: string; hex?: string } | null;
  sku?: string;
  /** Extra text appended at the end, e.g. "2 item(s)" */
  extra?: React.ReactNode;
  className?: string;
}

/**
 * "Size L • ● Mustard • SKU …" line for an order item.
 * Only the values that exist are shown, so there are no empty "Size: • Color:" labels.
 */
export const ItemVariantMeta: React.FC<ItemVariantMetaProps> = ({ size, color, sku, extra, className = '' }) => {
  const parts: React.ReactNode[] = [];
  const sizeText = size?.trim();
  const colorName = color?.name?.trim();

  if (sizeText) {
    parts.push(
      <span key="size">
        Size: <strong className="text-allura-text">{sizeText}</strong>
      </span>
    );
  }
  if (colorName) {
    parts.push(
      <span key="color" className="inline-flex items-center gap-1">
        Color:
        {color?.hex && (
          <span
            className="w-2.5 h-2.5 rounded-full border border-allura-border inline-block"
            style={{ backgroundColor: color.hex }}
            aria-hidden="true"
          />
        )}
        <strong className="text-allura-text">{colorName}</strong>
      </span>
    );
  }
  if (sku?.trim()) parts.push(<span key="sku">SKU: {sku.trim()}</span>);
  if (extra) parts.push(<span key="extra">{extra}</span>);

  if (parts.length === 0) return null;

  return (
    <p className={`text-xs text-allura-muted font-sans flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ${className}`}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-allura-border" aria-hidden="true">•</span>}
          {part}
        </React.Fragment>
      ))}
    </p>
  );
};
