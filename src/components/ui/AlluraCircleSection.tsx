import React, { useState } from 'react';
import { Sparkles, MessageCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export const AlluraCircleSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const { showToast } = useShop();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address', 'info');
      return;
    }
    setIsJoined(true);
    showToast('Welcome to the Allura Circle! ✨', 'gold');
  };

  const handleWhatsAppJoin = () => {
    window.open(
      'https://wa.me/919037991774?text=Hello%20Allura%20Boutique%2C%20I%20would%20like%20to%20join%20the%20Allura%20Circle%20VIP%20broadcast.',
      '_blank'
    );
  };

  return (
    <section className="relative py-20 px-6 overflow-hidden bg-allura-card border-y border-allura-border">
      {/* Decorative Botanical / Subtle Background Flourish */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-allura-bgSecondary/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-allura-gold/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="max-w-3xl mx-auto text-center relative z-10 space-y-6">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-allura-bgSecondary/70 border border-allura-border text-allura-goldDark text-[11px] font-sans font-semibold tracking-[0.25em] uppercase">
          <Sparkles size={12} />
          <span>ALLURA CIRCLE</span>
        </div>

        {/* Heading */}
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-allura-text tracking-tight">
          BE PART OF ALLURA
        </h2>

        {/* Description */}
        <p className="text-sm sm:text-base text-allura-muted font-sans max-w-xl mx-auto leading-relaxed">
          Be the first to discover new collections, exclusive festive edits and private boutique invitations from our Perinthalmanna salon.
        </p>

        {/* Form */}
        {isJoined ? (
          <div className="bg-allura-bgSecondary/60 border border-allura-gold/40 rounded-lg p-6 max-w-md mx-auto flex items-center justify-center gap-3 animate-fade-in">
            <CheckCircle2 size={24} className="text-allura-goldDark flex-shrink-0" />
            <div className="text-left">
              <h4 className="font-serif text-base font-semibold text-allura-text">
                Welcome to Allura Circle
              </h4>
              <p className="text-xs text-allura-muted font-sans">
                You will receive our latest curated edits directly in your inbox.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-md mx-auto">
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="flex-1 bg-allura-bg border border-allura-border rounded-sm px-4 py-3 text-xs sm:text-sm text-allura-text placeholder:text-allura-muted focus:outline-none focus:border-allura-gold font-sans"
              />
              <button
                type="submit"
                className="bg-allura-goldDark hover:bg-allura-darkBrown text-allura-card text-xs font-sans font-bold tracking-[0.2em] uppercase py-3 px-6 rounded-sm transition-all flex items-center justify-center gap-2 shadow-xs whitespace-nowrap"
              >
                <span>JOIN ALLURA</span>
                <ArrowRight size={14} />
              </button>
            </form>

            {/* WhatsApp VIP Option */}
            <div className="flex items-center justify-center gap-3 text-xs text-allura-muted pt-2">
              <span>Or join our VIP broadcast</span>
              <button
                type="button"
                onClick={handleWhatsAppJoin}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#128C7E] hover:text-[#075E54] transition-colors uppercase tracking-wider underline"
              >
                <MessageCircle size={14} />
                <span>JOIN VIA WHATSAPP</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
