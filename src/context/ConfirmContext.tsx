import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { ConfirmModal } from '../components/common/ConfirmModal';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for deletes and other irreversible actions */
  isDestructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Renders one app-wide confirmation dialog.
 * Use it through `useConfirm()` as an awaitable replacement for `window.confirm`:
 *   if (await confirm({ title: 'Delete category', message: '…', isDestructive: true })) { … }
 */
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>(input => {
    const opts = typeof input === 'string' ? { message: input } : input;
    // A new request replaces any dialog still open (treated as cancelled)
    resolver.current?.(false);
    setOptions(opts);
    return new Promise<boolean>(resolve => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmModal
        isOpen={!!options}
        title={options?.title || 'Please confirm'}
        message={options?.message || ''}
        confirmLabel={options?.confirmLabel}
        cancelLabel={options?.cancelLabel}
        isDestructive={options?.isDestructive}
        onConfirm={() => settle(true)}
        onClose={() => settle(false)}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
};
