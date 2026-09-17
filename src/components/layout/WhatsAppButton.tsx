import React, { useState } from 'react';
import { MessageCircle, X, Sparkles, Send, MapPin, Scissors } from 'lucide-react';

export const WhatsAppButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const phoneNumber = '919037991774';

  const quickOptions = [
    {
      title: 'Styling & Sizing Advice',
      message: 'Hello Allura Stylist, I need assistance choosing the right size and fit.',
      icon: Scissors,
    },
    {
      title: 'Bridal & Custom Enquiries',
      message: 'Hello Allura, I would like to enquire about bespoke bridal couture.',
      icon: Sparkles,
    },
    {
      title: 'Store Visit (Perinthalmanna)',
      message: 'Hello Allura, I would like to visit your boutique at Ooty Road, Perinthalmanna.',
      icon: MapPin,
    },
  ];

  const handleOpenWhatsApp = (customMsg: string) => {
    const encoded = encodeURIComponent(customMsg);
    window.open(`https://wa.me/${phoneNumber}?text=${encoded}`, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-20 lg:bottom-8 right-5 z-40">
      {/* Popover Card */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-allura-card rounded-xl border border-allura-border shadow-luxury overflow-hidden animate-slide-up mb-2">
          {/* Header */}
          <div className="bg-allura-darkBrown text-allura-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-allura-gold flex items-center justify-center text-allura-card font-serif text-sm font-bold">
                A
              </div>
              <div>
                <h4 className="font-serif text-sm font-semibold tracking-wide">Allura Stylist Desk</h4>
                <p className="text-[10px] text-allura-bgSecondary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Online • Perinthalmanna Boutique
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-allura-bgSecondary hover:text-allura-card transition-colors p-1"
              aria-label="Close WhatsApp options"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 bg-allura-bg/60 space-y-2">
            <p className="text-xs text-allura-text font-medium mb-3">
              How may our boutique stylists assist you today?
            </p>

            {quickOptions.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.title}
                  onClick={() => handleOpenWhatsApp(option.message)}
                  className="w-full text-left p-2.5 rounded-lg bg-allura-card border border-allura-border/70 hover:border-allura-gold hover:bg-allura-bgSecondary/40 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-allura-gold/15 flex items-center justify-center text-allura-gold">
                      <Icon size={12} />
                    </div>
                    <span className="text-xs font-medium text-allura-text group-hover:text-allura-goldDark">
                      {option.title}
                    </span>
                  </div>
                  <Send size={12} className="text-allura-muted group-hover:text-allura-gold transition-colors" />
                </button>
              );
            })}

            <div className="pt-2 text-center">
              <button
                onClick={() =>
                  handleOpenWhatsApp('Hello Allura Boutique, I would like to explore your collection.')
                }
                className="text-[11px] font-sans font-semibold tracking-wider text-allura-goldDark underline hover:text-allura-gold uppercase"
              >
                Start general chat →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-13 h-13 p-3.5 rounded-full bg-[#25D366] text-white shadow-luxury hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center relative group"
        aria-label="Contact Allura Stylist on WhatsApp"
      >
        <MessageCircle size={26} className="fill-current text-white" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
        </span>
      </button>
    </div>
  );
};
