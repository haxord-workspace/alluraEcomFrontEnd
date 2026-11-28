import React, { useState } from 'react';
import {
  Phone,
  MessageCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  X,
  Sparkles,
  FileText,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { usePermissions } from '../../hooks/usePermissions';
import { useShop } from '../../context/ShopContext';
import {
  updateContactInquiryReadStatus,
  formatISTDateTime,
  contactInquiryErrorMessage,
} from '../../service/contactInquiries';
import type { ContactInquiry } from '../../types/contactInquiry';

interface AdminEnquiryDetailModalProps {
  inquiry: ContactInquiry | null;
  isLoading?: boolean;
  onClose: () => void;
  onStatusUpdated?: (updated: ContactInquiry) => void;
}

export const AdminEnquiryDetailModal: React.FC<AdminEnquiryDetailModalProps> = ({
  inquiry,
  isLoading = false,
  onClose,
  onStatusUpdated,
}) => {
  const { can } = usePermissions();
  const { showToast } = useShop();
  const canEdit = can('customer_crm', 'edit');

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!inquiry) return null;

  const phoneDigits = inquiry.phone ? inquiry.phone.replace(/\D/g, '') : '';
  const whatsappUrl = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
        `Hi ${inquiry.name}, this is Allura Boutique about your styling enquiry.`
      )}`
    : '';

  const handleToggleReadStatus = async () => {
    if (!canEdit || isUpdatingStatus) return;

    setIsUpdatingStatus(true);
    const targetStatus = !inquiry.isRead;
    try {
      const updated = await updateContactInquiryReadStatus(inquiry.id, targetStatus);
      showToast(
        targetStatus ? 'Enquiry marked as read' : 'Enquiry marked as unread',
        'info'
      );
      onStatusUpdated?.(updated);
    } catch (err) {
      showToast(
        contactInquiryErrorMessage(err, 'Failed to update enquiry status'),
        'error'
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <Modal
      open={!!inquiry}
      onClose={onClose}
      showCloseButton={false}
      isBusy={isUpdatingStatus}
      backdropClassName="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in"
      panelClassName="relative bg-white border border-stone-200/90 rounded-2xl w-[calc(100vw-24px)] sm:w-[calc(100vw-48px)] md:w-full max-w-[720px] max-h-[90vh] max-h-[90dvh] shadow-2xl flex flex-col focus:outline-none overflow-hidden my-auto"
      labelledBy="enquiry-modal-title"
    >
      {/* 1. Modal Header Bar: Title, Badge & Dedicated Close Button */}
      <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-stone-200/80 flex items-center justify-between shrink-0 bg-stone-50/70">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <h3
            id="enquiry-modal-title"
            className="font-serif text-base sm:text-lg text-stone-900 font-semibold truncate"
          >
            Enquiry Details
          </h3>
          {isLoading && <Loader2 size={13} className="animate-spin text-stone-400 shrink-0" />}
          <span
            className={`shrink-0 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
              inquiry.isRead
                ? 'bg-stone-100 text-stone-600 border-stone-200/60'
                : 'bg-amber-100 text-amber-800 border-amber-200/60'
            }`}
          >
            {inquiry.isRead ? 'Read' : 'New Enquiry'}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close enquiry modal"
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. Scrollable Modal Body */}
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5 text-xs font-sans overscroll-contain">
        {/* Customer Header Info Card */}
        <div className="p-3.5 sm:p-4 bg-stone-50 rounded-xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#561C08] text-white font-serif font-bold text-sm sm:text-base flex items-center justify-center shrink-0 shadow-xs">
              {inquiry.name ? inquiry.name.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-serif text-sm sm:text-base font-semibold text-stone-900 truncate">
                {inquiry.name || 'Anonymous Customer'}
              </h4>
              <p className="text-stone-500 font-mono text-xs mt-0.5 truncate">
                {inquiry.phone || 'No phone provided'}
              </p>
            </div>
          </div>

          {/* Quick Contact Buttons (Mobile: 2-column grid; Tablet/Desktop: flex inline) */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2 shrink-0">
            {inquiry.phone ? (
              <a
                href={`tel:${inquiry.phone}`}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs transition-colors"
              >
                <Phone size={13} className="text-stone-500 shrink-0" />
                <span>Call</span>
              </a>
            ) : (
              <span className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg border border-stone-100 bg-stone-100/50 text-stone-400 text-xs font-semibold cursor-not-allowed">
                <Phone size={13} className="shrink-0" />
                <span>No Phone</span>
              </span>
            )}

            {phoneDigits ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 border border-[#25D366]/20 text-xs font-semibold transition-colors"
              >
                <MessageCircle size={13} className="shrink-0" />
                <span>WhatsApp</span>
              </a>
            ) : (
              <span className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-stone-100/50 text-stone-400 text-xs font-semibold cursor-not-allowed">
                <MessageCircle size={13} className="shrink-0" />
                <span>No WhatsApp</span>
              </span>
            )}
          </div>
        </div>

        {/* 4 Metadata Details Cards (Mobile: 1-col, Tablet/Desktop: 2-col) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          <div className="p-3 sm:p-3.5 bg-white border border-stone-200/80 rounded-xl flex flex-col justify-between min-h-[64px]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 flex items-center gap-1.5">
              <Sparkles size={11} className="shrink-0 text-stone-400" />
              <span>Occasion Type</span>
            </span>
            <p className="font-medium text-stone-900 text-xs sm:text-[13px] mt-1 break-words">
              {inquiry.occasionType || 'Not specified'}
            </p>
          </div>

          <div className="p-3 sm:p-3.5 bg-white border border-stone-200/80 rounded-xl flex flex-col justify-between min-h-[64px]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 flex items-center gap-1.5">
              <Calendar size={11} className="shrink-0 text-stone-400" />
              <span>Submitted Date (IST)</span>
            </span>
            <p className="font-medium text-stone-900 text-xs sm:text-[13px] mt-1 break-words">
              {formatISTDateTime(inquiry.createdAt) || '—'}
            </p>
          </div>

          <div className="p-3 sm:p-3.5 bg-white border border-stone-200/80 rounded-xl flex flex-col justify-between min-h-[64px]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 flex items-center gap-1.5">
              <CheckCircle2 size={11} className="shrink-0 text-stone-400" />
              <span>Read Status</span>
            </span>
            <p className="font-medium text-stone-900 text-xs sm:text-[13px] mt-1 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  inquiry.isRead ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span>{inquiry.isRead ? 'Read' : 'Unread'}</span>
            </p>
          </div>

          <div className="p-3 sm:p-3.5 bg-white border border-stone-200/80 rounded-xl flex flex-col justify-between min-h-[64px]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 flex items-center gap-1.5">
              <Clock size={11} className="shrink-0 text-stone-400" />
              <span>Read Timestamp (IST)</span>
            </span>
            <p className="font-medium text-stone-900 text-xs sm:text-[13px] mt-1 break-words">
              {inquiry.isRead && inquiry.readAt
                ? formatISTDateTime(inquiry.readAt)
                : 'Not read yet'}
            </p>
          </div>
        </div>

        {/* Full Customer Message / Requirements */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-stone-500 flex items-center gap-1.5">
            <FileText size={11} className="shrink-0 text-stone-400" />
            <span>Customer Message / Outfit Requirements</span>
          </label>
          <div className="p-3.5 sm:p-4 bg-stone-50/80 border border-stone-200/80 rounded-xl text-stone-800 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words min-h-[96px]">
            {inquiry.message || (
              <span className="italic text-stone-400">No message provided.</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Sticky Modal Footer Actions */}
      <div className="p-3.5 sm:px-6 sm:py-3.5 border-t border-stone-200/80 bg-stone-50/70 flex items-center justify-between gap-2.5 sm:gap-3 shrink-0 rounded-b-2xl">
        {canEdit ? (
          <button
            type="button"
            onClick={handleToggleReadStatus}
            disabled={isUpdatingStatus}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 ${
              inquiry.isRead
                ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                : 'bg-[#561C08] hover:bg-[#561C08]/90 text-white'
            }`}
          >
            {isUpdatingStatus ? (
              <>
                <Loader2 size={13} className="animate-spin shrink-0" />
                <span>Updating...</span>
              </>
            ) : inquiry.isRead ? (
              <>
                <EyeOff size={13} className="shrink-0" />
                <span>Mark as Unread</span>
              </>
            ) : (
              <>
                <Eye size={13} className="shrink-0" />
                <span>Mark as Read</span>
              </>
            )}
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={onClose}
          className={`${
            canEdit ? 'flex-1 sm:flex-initial' : 'w-full sm:w-auto'
          } inline-flex items-center justify-center px-4 py-2 sm:py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs transition-colors`}
        >
          Close
        </button>
      </div>
    </Modal>
  );
};
