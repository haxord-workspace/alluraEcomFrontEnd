import React from 'react';
import { Modal } from '../common/Modal';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
  isBusy?: boolean;
  isDirty?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footerActions,
  isBusy = false,
  isDirty = false,
}) => {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      isBusy={isBusy}
      isDirty={isDirty}
      labelledBy="bottom-sheet-title"
      backdropClassName="fixed inset-0 z-50 flex flex-col justify-end"
      panelClassName="relative w-full bg-allura-card rounded-t-3xl border-t border-allura-border shadow-bottom-sheet z-10 max-h-[85vh] flex flex-col animate-slide-up safe-bottom focus:outline-none"
      closeButtonClassName="absolute top-11 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full text-allura-muted hover:text-allura-text hover:bg-allura-bgSecondary transition-colors"
    >
      {/* Drag handle */}
      <div className="w-12 h-1 bg-allura-border rounded-full mx-auto mt-3 mb-1" />

      {/* Header */}
      <div className="px-6 py-3 border-b border-allura-border/60 flex items-center justify-between">
        <h3 id="bottom-sheet-title" className="font-serif text-lg font-semibold tracking-wide uppercase text-allura-text pr-10">
          {title}
        </h3>
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
    </Modal>
  );
};
