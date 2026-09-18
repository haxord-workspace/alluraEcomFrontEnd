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
    <section className="relative py-20 px-6 overflow-hidden bg-[#F7E6C8] border-y border-[#561C08]/15">
      <div className="max-w-3xl mx-auto text-center relative z-10 space-y-6">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#561C08]/20 text-[#561C08] text-[11px] font-heading font-bold tracking-[0.25em] uppercase shadow-xs">
          <Sparkles size={12} className="text-[#561C08]" />
          <span>ALLURA CIRCLE</span>
        </div>

        {/* Heading */}
        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-[#000000] tracking-tight uppercase">
          BE PART OF ALLURA
        </h2>

        {/* Description */}
        <p className="text-sm sm:text-base text-[#561C08] font-body max-w-xl mx-auto leading-relaxed font-normal">
          Be the first to discover new collections, exclusive festive edits and private boutique invitations from our Perinthalmanna atelier.
        </p>

        {/* Form */}
        {isJoined ? (
          <div className="bg-white border border-[#561C08]/30 rounded-2xl p-6 max-w-md mx-auto flex items-center justify-center gap-3 animate-fade-in shadow-md">
            <CheckCircle2 size={24} className="text-[#561C08] flex-shrink-0" />
            <div className="text-left">
              <h4 className="font-heading text-base font-bold text-[#000000]">
                Welcome to Allura Circle
              </h4>
              <p className="text-xs text-[#561C08] font-body">
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
                className="flex-1 bg-white border border-[#561C08]/20 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#000000] placeholder:text-[#561C08]/50 focus:outline-none focus:border-[#561C08] font-body"
              />
              <button
                type="submit"
                className="bg-[#561C08] hover:bg-[#3D1406] text-white text-xs font-heading font-bold tracking-[0.2em] uppercase py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md whitespace-nowrap"
              >
                <span>JOIN ALLURA</span>
                <ArrowRight size={14} />
              </button>
            </form>

            {/* WhatsApp VIP Option */}
            <div className="flex items-center justify-center gap-3 text-xs text-[#561C08] pt-2 font-body font-medium">
              <span>Or join our VIP broadcast</span>
              <button
                type="button"
                onClick={handleWhatsAppJoin}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#561C08] hover:underline uppercase tracking-wider"
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
