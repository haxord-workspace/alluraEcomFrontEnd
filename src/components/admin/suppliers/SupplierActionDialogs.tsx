import React, { useId, useRef, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { useModalA11y } from '../../../hooks/useModalA11y';
import { useShop } from '../../../context/ShopContext';
import { toSupplierApiError, updateSupplierStatus } from '../../../service/adminSuppliers';
import { pluralize } from '../../../utils/supplierFormat';
import { SupplierStatusBadge } from './SupplierStatusBadge';
import { SUPPLIER_STATUSES, SUPPLIER_STATUS_LABELS } from '../../../types/suppliers';
import type { SupplierStatus, SupplierStatusChangeResult } from '../../../types/suppliers';

/** The bits of a supplier these dialogs need (works for list rows and details profiles) */
export interface SupplierActionTarget {
  _id: string;
  name: string;
  status: SupplierStatus;
  productCount?: number;
}

// ── Shared dialog shell (same look as ConfirmModal) ──────────────────────────

const DialogShell: React.FC<{
  title: string;
  onClose: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}> = ({ title, onClose, destructive = false, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalA11y(true, ref, onClose);
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-allura-darkBrown/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-allura-card border border-allura-border rounded-2xl w-full max-w-md p-6 shadow-luxury space-y-5 animate-slide-up focus:outline-none"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${destructive ? 'bg-rose-100 text-rose-700' : 'bg-allura-bgSecondary text-allura-goldDark'
                }`}
            >
              <AlertCircle size={20} />
            </div>
            <h3 id={titleId} className="font-serif text-xl text-allura-text font-normal">
              {title}
            </h3>
          </div>
          <button onClick={onClose} className="text-allura-muted hover:text-allura-text p-1 transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const SECONDARY_BTN =
  'px-4 py-2 text-xs font-sans font-semibold text-allura-muted hover:text-allura-text transition-colors border border-allura-border rounded-lg disabled:opacity-50';
const PRIMARY_BTN =
  'px-5 py-2 text-xs font-sans font-bold tracking-wider uppercase rounded-lg transition-colors shadow-sm text-white disabled:opacity-50 flex items-center gap-2';

// ── Status dialog ────────────────────────────────────────────────────────────

const STATUS_HELP: Record<SupplierStatus, string> = {
  ACTIVE: 'The supplier can be picked for products again.',
  INACTIVE: "The supplier can't be picked for new products. Products already linked keep it.",
  BLOCKED: "The supplier is blocked and can't be picked for new products. Products already linked keep it.",
};

const STATUS_VERB: Record<SupplierStatus, string> = {
  ACTIVE: 'activated',
  INACTIVE: 'deactivated',
  BLOCKED: 'blocked',
};

interface StatusDialogProps {
  supplier: SupplierActionTarget;
  initialStatus?: SupplierStatus;
  onClose: () => void;
  onChanged: (result: SupplierStatusChangeResult) => void;
}

export const SupplierStatusDialog: React.FC<StatusDialogProps> = ({ supplier, initialStatus, onClose, onChanged }) => {
  const { showToast } = useShop();
  const [status, setStatus] = useState<SupplierStatus>(
    initialStatus ?? (supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
  );
  // const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const reasonId = useId();
  const groupId = useId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const result = await updateSupplierStatus(supplier._id, { status });
      if (!result.changed) {
        showToast(`${supplier.name} is already ${SUPPLIER_STATUS_LABELS[status].toLowerCase()}.`, 'info');
      } else {
        const linked =
          result.linkedProducts > 0 && status !== 'ACTIVE'
            ? ` ${pluralize(result.linkedProducts, 'product')} still list${result.linkedProducts === 1 ? 's' : ''} this supplier.`
            : '';
        showToast(`Supplier ${STATUS_VERB[status]}.${linked}`, 'success');
      }
      onChanged(result);
      onClose();
    } catch (err) {
      setError(toSupplierApiError(err, 'Could not change the status').message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogShell title="Change supplier status" onClose={onClose} destructive={status === 'BLOCKED'}>
      <form onSubmit={submit} className="space-y-4 text-xs font-sans">
        <p className="text-allura-muted leading-relaxed">
          <span className="font-semibold text-allura-text">{supplier.name}</span> is currently{' '}
          <SupplierStatusBadge status={supplier.status} />
        </p>

        <fieldset className="space-y-2">
          <legend id={groupId} className="block text-[10px] uppercase font-bold text-stone-500 mb-1">
            New status
          </legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby={groupId}>
            {SUPPLIER_STATUSES.map(s => (
              <label
                key={s}
                className={`flex items-center justify-center gap-1.5 min-h-10 rounded-xl border cursor-pointer font-semibold transition-colors ${status === s ? 'border-[#561C08] bg-[#561C08]/5 text-[#561C08]' : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
              >
                <input
                  type="radio"
                  name="supplier-status"
                  value={s}
                  checked={status === s}
                  onChange={() => setStatus(s)}
                  className="sr-only"
                />
                {SUPPLIER_STATUS_LABELS[s]}
              </label>
            ))}
          </div>
          <p className="text-[11px] text-stone-500">{STATUS_HELP[status]}</p>
        </fieldset>

        {/* <div>
          <label htmlFor={reasonId} className="block text-[10px] uppercase font-bold text-stone-500 mb-1">
            Reason <span className="normal-case font-normal text-stone-400">(optional)</span>
          </label>
          <textarea
            id={reasonId}
            rows={3}
            maxLength={500}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Shown in the supplier's activity timeline"
            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800 resize-none"
          />
        </div> */}

        {error && (
          <p role="alert" className="text-[11px] text-rose-600">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={SECONDARY_BTN} disabled={isSaving}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || status === supplier.status}
            className={`${PRIMARY_BTN} ${status === 'BLOCKED' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-allura-darkBrown hover:bg-allura-softBrown'
              }`}
          >
            {isSaving && <Loader2 size={13} className="animate-spin" />}
            {status === 'ACTIVE' ? 'Activate' : status === 'INACTIVE' ? 'Deactivate' : 'Block'}
          </button>
        </div>
      </form>
    </DialogShell>
  );
};

// ── "Still in use" dialog (409 SUPPLIER_HAS_PRODUCTS) ────────────────────────

export const SupplierInUseDialog: React.FC<{
  supplier: SupplierActionTarget;
  linkedProducts?: number;
  message: string;
  canChangeStatus: boolean;
  onClose: () => void;
  onViewProducts: () => void;
  onDeactivate: () => void;
}> = ({ supplier, linkedProducts, message, canChangeStatus, onClose, onViewProducts, onDeactivate }) => (
  <DialogShell title="Supplier still in use" onClose={onClose} destructive>
    <p className="text-xs font-sans text-allura-muted leading-relaxed">
      {linkedProducts
        ? `${supplier.name} can't be deleted because ${pluralize(linkedProducts, 'product')} still use${linkedProducts === 1 ? 's' : ''
        } it. Move those products to another supplier first, or deactivate this supplier instead.`
        : message}
    </p>
    <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
      <button type="button" onClick={onViewProducts} className={SECONDARY_BTN}>
        View products
      </button>
      {canChangeStatus && (
        <button type="button" onClick={onDeactivate} className={`${PRIMARY_BTN} bg-allura-darkBrown hover:bg-allura-softBrown`}>
          Deactivate instead
        </button>
      )}
    </div>
  </DialogShell>
);
