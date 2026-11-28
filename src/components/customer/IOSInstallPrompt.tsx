import React, { useState } from 'react';
import { Share2, X, PlusSquare } from 'lucide-react';
import { isIOSDevice, isInstalledPWA } from '../../utils/pushPlatform';

const DISMISSED_KEY = 'allura_ios_prompt_dismissed';

/**
 * Guidance banner shown only to iPhone / iPad users browsing via standard Safari
 * (not yet installed to Home Screen). Explains how to install Allura Boutique
 * to enable real-time order notifications.
 */
export const IOSInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (!isIOSDevice() || isInstalledPWA()) return false;
    try {
      return !sessionStorage.getItem(DISMISSED_KEY);
    } catch {
      return true;
    }
  });

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // ignore storage errors
    }
  };

  if (!showPrompt) return null;

  return (
    <div
      role="region"
      aria-label="iOS Home Screen Installation"
      className="bg-allura-darkBrown text-white border-b border-allura-gold/30 px-4 py-3 sm:py-3.5 shadow-md relative z-40 transition-all animate-fade-in"
    >
      <div className="max-w-5xl mx-auto flex items-start sm:items-center justify-between gap-3 text-xs font-sans">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-allura-gold/20 border border-allura-gold/40 flex items-center justify-center flex-shrink-0 text-allura-gold">
            <Share2 size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-medium text-sm tracking-wide text-allura-gold">
                GET ORDER UPDATES ON YOUR IPHONE
              </span>
            </div>
            <p className="text-white/80 text-[11px] sm:text-xs mt-0.5 leading-relaxed">
              Install Allura Boutique on your Home Screen to enable order notifications. Tap{' '}
              <span className="inline-flex items-center gap-0.5 font-semibold text-white">
                Share <Share2 size={11} className="inline" />
              </span>{' '}
              then select{' '}
              <span className="inline-flex items-center gap-0.5 font-semibold text-white">
                Add to Home Screen <PlusSquare size={11} className="inline" />
              </span>
              .
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
          aria-label="Dismiss banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
