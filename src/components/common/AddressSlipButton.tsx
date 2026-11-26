import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { downloadMyOrderAddressLabel, describeAddressLabelError, PdfDocumentError } from '../../service/addressLabels';
import { canDownloadSlip } from '../../utils/addressSlipEligibility';
import type { Order } from '../../types';

interface AddressSlipButtonProps {
  order: Order;
  /** Matches the two existing Invoice button sizes on the customer side */
  variant: 'list' | 'detail';
}

const VARIANT_CLASSES: Record<AddressSlipButtonProps['variant'], string> = {
  list: 'px-3.5 py-1.5 rounded-lg border border-allura-border text-xs font-sans text-allura-muted hover:text-allura-text hover:bg-allura-bgSecondary transition-colors',
  detail: 'px-4 py-2 border border-allura-border rounded-xl text-xs font-sans font-semibold text-allura-text hover:bg-allura-bgSecondary transition-colors',
};

const ICON_SIZE: Record<AddressSlipButtonProps['variant'], number> = { list: 13, detail: 14 };

/**
 * "Download address slip" for the customer's own orders. Hidden whenever
 * `canDownloadSlip` would fail, so the backend's 403/409 for an unpaid or
 * cancelled/returned order is never hit from here — matches `addressSlipEligibility.ts`.
 */
export const AddressSlipButton: React.FC<AddressSlipButtonProps> = ({ order, variant }) => {
  const { showToast } = useShop();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!canDownloadSlip(order)) return null;

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadMyOrderAddressLabel(order.id, `Address-Slip-${order.orderNumber}.pdf`);
    } catch (err) {
      showToast(
        err instanceof PdfDocumentError ? describeAddressLabelError(err, 'customer') : 'Could not create the address slip. Please try again.',
        'error'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      className={`${VARIANT_CLASSES[variant]} flex items-center gap-1.5 disabled:opacity-60`}
    >
      {isDownloading ? <Loader2 size={ICON_SIZE[variant]} className="animate-spin" /> : <Download size={ICON_SIZE[variant]} />}
      <span>{isDownloading ? 'Downloading…' : 'Address Slip'}</span>
    </button>
  );
};
