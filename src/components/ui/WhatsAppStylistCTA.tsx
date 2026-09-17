import React from 'react';
import { MessageCircle, Sparkles } from 'lucide-react';

interface WhatsAppStylistCTAProps {
  productTitle?: string;
  sku?: string;
}

export const WhatsAppStylistCTA: React.FC<WhatsAppStylistCTAProps> = ({
  productTitle,
  sku,
}) => {
  const handleClick = () => {
    const text = productTitle
      ? `Hello Allura Stylist, I need styling assistance for ${productTitle} (SKU: ${sku || 'N/A'}).`
      : 'Hello Allura Stylist, I would like to consult on boutique sizing and occasion styling.';

    window.open(`https://wa.me/919037991774?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="bg-allura-bgSecondary/60 border border-allura-border rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#25D366]/15 flex items-center justify-center text-[#128C7E] flex-shrink-0">
          <MessageCircle size={20} />
        </div>
        <div>
          <h4 className="font-serif text-sm font-semibold text-allura-text flex items-center gap-1.5">
            <span>Need Help With Size or Styling?</span>
            <Sparkles size={13} className="text-allura-gold" />
          </h4>
          <p className="text-[11px] text-allura-muted font-sans">
            Connect directly with an Allura boutique stylist in Perinthalmanna.
          </p>
        </div>
      </div>

      <button
        onClick={handleClick}
        className="bg-allura-card hover:bg-allura-bg border border-allura-border/80 hover:border-allura-gold text-allura-darkBrown px-4 py-2 rounded text-xs font-sans font-bold tracking-wider uppercase transition-all whitespace-nowrap shadow-xs"
      >
        CHAT WITH ALLURA
      </button>
    </div>
  );
};
