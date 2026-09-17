import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footerActions,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-allura-darkBrown/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet Modal */}
      <div className="relative w-full bg-allura-card rounded-t-3xl border-t border-allura-border shadow-bottom-sheet z-10 max-h-[85vh] flex flex-col animate-slide-up safe-bottom">
        {/* Drag handle */}
        <div className="w-12 h-1 bg-allura-border rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="px-6 py-3 border-b border-allura-border/60 flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold tracking-wide uppercase text-allura-text">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-allura-muted hover:text-allura-text rounded-full hover:bg-allura-bgSecondary transition-colors"
            aria-label="Close sheet"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {children}
        </div>

        {/* Optional Action Footer */}
        {footerActions && (
          <div className="p-4 bg-allura-bg border-t border-allura-border">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
};
