import { useCallback, useState } from 'react';
import { useShop } from '../context/ShopContext';
import { useConfirm } from '../context/ConfirmContext';
import { deleteSupplier, toSupplierApiError } from '../service/adminSuppliers';
import { SupplierInUseDialog, SupplierStatusDialog } from '../components/admin/suppliers/SupplierActionDialogs';
import type { SupplierActionTarget } from '../components/admin/suppliers/SupplierActionDialogs';
import type { SupplierStatus, SupplierStatusChangeResult } from '../types/suppliers';

// ── Hook: status + delete flows with their dialogs ───────────────────────────

interface UseSupplierActionsOptions {
  canChangeStatus: boolean;
  onStatusChanged: (supplierId: string, result: SupplierStatusChangeResult) => void;
  onDeleted: (supplierId: string) => void;
  onViewProducts: (supplierId: string) => void;
}

/**
 * Status-change and delete flows shared by the list and details pages.
 * Render `layer` once; call `openStatus` / `requestDelete` from buttons.
 */
export const useSupplierActions = ({ canChangeStatus, onStatusChanged, onDeleted, onViewProducts }: UseSupplierActionsOptions) => {
  const { showToast } = useShop();
  const confirm = useConfirm();
  const [statusTarget, setStatusTarget] = useState<{ supplier: SupplierActionTarget; initial?: SupplierStatus } | null>(null);
  const [inUse, setInUse] = useState<{ supplier: SupplierActionTarget; linkedProducts?: number; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openStatus = useCallback((supplier: SupplierActionTarget, initial?: SupplierStatus) => {
    setStatusTarget({ supplier, initial });
  }, []);

  const requestDelete = useCallback(
    async (supplier: SupplierActionTarget) => {
      const ok = await confirm({
        title: 'Delete supplier',
        message: `Delete "${supplier.name}"? It will no longer appear in the supplier list or the product form. Its history is kept.`,
        confirmLabel: 'Delete supplier',
        isDestructive: true,
      });
      if (!ok) return;
      setDeletingId(supplier._id);
      try {
        const message = await deleteSupplier(supplier._id);
        showToast(message || `Supplier "${supplier.name}" deleted`, 'success');
        onDeleted(supplier._id);
      } catch (err) {
        const apiError = toSupplierApiError(err, 'Could not delete the supplier');
        if (apiError.code === 'SUPPLIER_HAS_PRODUCTS' || apiError.status === 409) {
          setInUse({ supplier, linkedProducts: apiError.linkedProducts, message: apiError.message });
        } else {
          showToast(apiError.message, 'error');
        }
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, showToast, onDeleted]
  );

  const layer = (
    <>
      {statusTarget && (
        <SupplierStatusDialog
          supplier={statusTarget.supplier}
          initialStatus={statusTarget.initial}
          onClose={() => setStatusTarget(null)}
          onChanged={result => onStatusChanged(statusTarget.supplier._id, result)}
        />
      )}
      {inUse && (
        <SupplierInUseDialog
          supplier={inUse.supplier}
          linkedProducts={inUse.linkedProducts}
          message={inUse.message}
          canChangeStatus={canChangeStatus && inUse.supplier.status === 'ACTIVE'}
          onClose={() => setInUse(null)}
          onViewProducts={() => {
            const id = inUse.supplier._id;
            setInUse(null);
            onViewProducts(id);
          }}
          onDeactivate={() => {
            const target = inUse.supplier;
            setInUse(null);
            setStatusTarget({ supplier: target, initial: 'INACTIVE' });
          }}
        />
      )}
    </>
  );

  return { openStatus, requestDelete, deletingId, layer };
};
