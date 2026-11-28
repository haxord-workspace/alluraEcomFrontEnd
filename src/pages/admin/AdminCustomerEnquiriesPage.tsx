import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search,
  X,
  Phone,
  MessageCircle,
  Eye,
  CheckCircle2,
  Inbox,
  Clock,
  Loader2,
  EyeOff,
  Filter,
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useShop } from '../../context/ShopContext';
import { AdminPagination } from '../../components/admin/AdminPagination';
import { AdminEnquiryDetailModal } from '../../components/admin/AdminEnquiryDetailModal';
import {
  getContactInquiries,
  getContactInquiryById,
  updateContactInquiryReadStatus,
  formatISTDateTime,
  contactInquiryErrorMessage,
  CONTACT_INQUIRIES_UPDATED_EVENT,
} from '../../service/contactInquiries';
import type {
  ContactInquiry,
  ContactInquiriesMeta,
  ContactInquiryReadStatus,
} from '../../types/contactInquiry';

const PAGE_SIZE = 20;

export const AdminCustomerEnquiriesPage: React.FC = () => {
  const { can } = usePermissions();
  const { showToast } = useShop();
  const canEdit = can('customer_crm', 'edit');

  // Filter & Search states
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<ContactInquiryReadStatus>('all');
  const [page, setPage] = useState(1);

  // Data states
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [meta, setMeta] = useState<ContactInquiriesMeta>({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
    unreadCount: 0,
    readCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal state
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch enquiries with abort controller to prevent race conditions
  const activeControllerRef = useRef<AbortController | null>(null);

  const fetchEnquiries = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getContactInquiries(
          {
            page,
            limit: PAGE_SIZE,
            readStatus: tab,
            search: search || undefined,
            sortBy: 'createdAt',
            sortOrder: 'desc',
          },
          signal
        );

        setInquiries(result.inquiries);
        setMeta(result.meta);
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        setError(contactInquiryErrorMessage(err, 'Failed to load customer enquiries.'));
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [page, tab, search]
  );

  useEffect(() => {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeControllerRef.current = controller;

    fetchEnquiries(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchEnquiries]);

  // Listen for global enquiry status updates
  useEffect(() => {
    const handleUpdated = () => {
      fetchEnquiries();
    };
    window.addEventListener(CONTACT_INQUIRIES_UPDATED_EVENT, handleUpdated);
    return () => {
      window.removeEventListener(CONTACT_INQUIRIES_UPDATED_EVENT, handleUpdated);
    };
  }, [fetchEnquiries]);

  const handleTabChange = (newTab: ContactInquiryReadStatus) => {
    if (tab === newTab) return;
    setTab(newTab);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setTab('all');
    setPage(1);
  };

  const handleToggleReadStatus = async (inquiry: ContactInquiry, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canEdit || statusUpdatingId === inquiry.id) return;

    setStatusUpdatingId(inquiry.id);
    const targetStatus = !inquiry.isRead;
    try {
      const updated = await updateContactInquiryReadStatus(inquiry.id, targetStatus);
      showToast(
        targetStatus ? 'Enquiry marked as read' : 'Enquiry marked as unread',
        'info'
      );

      // Update in-place in the list
      setInquiries((prev) =>
        prev.map((item) => (item.id === inquiry.id ? { ...item, ...updated } : item))
      );

      // Update counts in meta
      setMeta((prev) => {
        const unreadChange = targetStatus ? -1 : 1;
        const readChange = targetStatus ? 1 : -1;
        return {
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount + unreadChange),
          readCount: Math.max(0, prev.readCount + readChange),
        };
      });

      // Update modal if currently opened
      if (selectedInquiry?.id === inquiry.id) {
        setSelectedInquiry((prev) => (prev ? { ...prev, ...updated } : null));
      }
    } catch (err) {
      showToast(
        contactInquiryErrorMessage(err, 'Failed to update enquiry status'),
        'error'
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleOpenDetail = async (inquiry: ContactInquiry) => {
    setSelectedInquiry(inquiry);
    setIsLoadingDetail(true);
    try {
      // Fetch fresh details from backend (does NOT automatically mark as read)
      const fresh = await getContactInquiryById(inquiry.id);
      setSelectedInquiry(fresh);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        showToast('This enquiry no longer exists.', 'error');
        setSelectedInquiry(null);
        fetchEnquiries();
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const hasActiveFilters = Boolean(search) || tab !== 'all';
  const totalCount = meta.unreadCount + meta.readCount;

  // Empty state copy depending on current tab/search
  const getEmptyMessage = () => {
    if (search) return 'No enquiries match your search.';
    if (tab === 'unread') return 'No unread enquiries.';
    if (tab === 'read') return 'No read enquiries found.';
    return 'No customer enquiries yet.';
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            CUSTOMER CRM & STYLING
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Customer Enquiries
            {meta.total > 0 && (
              <span className="text-xl text-stone-500 font-sans ml-2">({meta.total})</span>
            )}
          </h1>
          <p className="text-xs text-stone-500">
            Manage customer styling enquiries, measurements, and concierge messages.
          </p>
        </div>

        {/* Server Search Input */}
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone, message..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-white border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-400 shadow-xs"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-stone-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Enquiries</span>
            <Inbox size={15} />
          </div>
          <p className="font-serif text-2xl font-bold text-[#561C08]">
            {isLoading && meta.total === 0 ? (
              <span className="inline-block h-6 w-12 bg-stone-100 rounded animate-pulse" />
            ) : (
              totalCount
            )}
          </p>
          <p className="text-[11px] text-stone-500">Customer requests on file</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-amber-700">
            <span className="text-[10px] font-bold uppercase tracking-wider">Unread Enquiries</span>
            <Clock size={15} />
          </div>
          <p className="font-serif text-2xl font-bold text-amber-700">
            {isLoading && meta.total === 0 ? (
              <span className="inline-block h-6 w-12 bg-amber-50 rounded animate-pulse" />
            ) : (
              meta.unreadCount
            )}
          </p>
          <p className="text-[11px] text-amber-600">Awaiting stylist response</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-stone-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">Read Enquiries</span>
            <CheckCircle2 size={15} />
          </div>
          <p className="font-serif text-2xl font-bold text-stone-800">
            {isLoading && meta.total === 0 ? (
              <span className="inline-block h-6 w-12 bg-stone-100 rounded animate-pulse" />
            ) : (
              meta.readCount
            )}
          </p>
          <p className="text-[11px] text-stone-500">Reviewed by team</p>
        </div>
      </div>

      {/* Filter Tabs & Active Filter Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => handleTabChange('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              tab === 'all'
                ? 'bg-[#561C08] text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <span>All</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                tab === 'all' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('unread')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              tab === 'unread'
                ? 'bg-[#561C08] text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <span>Unread</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                tab === 'unread' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {meta.unreadCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('read')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              tab === 'read'
                ? 'bg-[#561C08] text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <span>Read</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                tab === 'read' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {meta.readCount}
            </span>
          </button>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Filter size={12} className="text-stone-400" />
            <span>Active filters</span>
            <button
              type="button"
              onClick={clearFilters}
              className="font-bold text-allura-goldDark underline hover:text-stone-900"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchEnquiries()}
            className="font-bold underline ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Enquiries Table / Card Container */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Customer</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Occasion</th>
                <th className="p-4 min-w-[200px]">Message</th>
                <th className="p-4 whitespace-nowrap">Submitted (IST)</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading && inquiries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-stone-400">
                    <Loader2 size={24} className="animate-spin inline-block" />
                    <p className="mt-2 text-xs">Loading enquiries...</p>
                  </td>
                </tr>
              ) : inquiries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-stone-400 space-y-2">
                    <Inbox size={32} className="mx-auto text-stone-300 stroke-[1.5]" />
                    <p className="text-sm font-medium text-stone-600">{getEmptyMessage()}</p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-xs font-bold text-allura-goldDark underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                inquiries.map((inquiry) => {
                  const phoneDigits = inquiry.phone ? inquiry.phone.replace(/\D/g, '') : '';
                  const whatsappUrl = phoneDigits
                    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
                        `Hi ${inquiry.name}, this is Allura Boutique about your styling enquiry.`
                      )}`
                    : '';
                  const isRowUpdating = statusUpdatingId === inquiry.id;

                  return (
                    <tr
                      key={inquiry.id}
                      onClick={() => handleOpenDetail(inquiry)}
                      className={`hover:bg-stone-50/80 transition-colors cursor-pointer ${
                        !inquiry.isRead ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Customer Name & Avatar */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-xs shrink-0 ${
                              inquiry.isRead
                                ? 'bg-stone-700 text-white'
                                : 'bg-[#561C08] text-white ring-2 ring-amber-400/50'
                            }`}
                          >
                            {inquiry.name ? inquiry.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p
                              className={`font-serif text-sm ${
                                inquiry.isRead
                                  ? 'font-normal text-stone-800'
                                  : 'font-semibold text-stone-900'
                              }`}
                            >
                              {inquiry.name || 'Anonymous Customer'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="p-4 text-stone-700 font-mono whitespace-nowrap">
                        {inquiry.phone ? (
                          <a
                            href={`tel:${inquiry.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline text-stone-800"
                          >
                            {inquiry.phone}
                          </a>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>

                      {/* Occasion */}
                      <td className="p-4">
                        {inquiry.occasionType ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 font-medium text-[11px] whitespace-nowrap">
                            {inquiry.occasionType}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Message excerpt */}
                      <td className="p-4 text-stone-600 max-w-xs">
                        <p className="line-clamp-2 leading-relaxed">
                          {inquiry.message || (
                            <span className="italic text-stone-400">No message</span>
                          )}
                        </p>
                      </td>

                      {/* Submitted Date (IST) */}
                      <td className="p-4 text-stone-600 whitespace-nowrap text-[11px]">
                        {formatISTDateTime(inquiry.createdAt) || '—'}
                      </td>

                      {/* Status */}
                      <td className="p-4 whitespace-nowrap">
                        {inquiry.isRead ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                              <span>Read</span>
                            </span>
                            {inquiry.readAt && (
                              <p className="text-[10px] text-stone-400">
                                {formatISTDateTime(inquiry.readAt)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                            <span>New</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Call Customer */}
                          {inquiry.phone && (
                            <a
                              href={`tel:${inquiry.phone}`}
                              title="Call Customer"
                              className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 shadow-xs transition-colors"
                            >
                              <Phone size={13} />
                            </a>
                          )}

                          {/* WhatsApp Customer */}
                          {phoneDigits && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Message on WhatsApp"
                              className="p-1.5 rounded-lg bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 shadow-xs transition-colors"
                            >
                              <MessageCircle size={13} />
                            </a>
                          )}

                          {/* Mark Read/Unread (Restricted to customer_crm:edit) */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => handleToggleReadStatus(inquiry, e)}
                              disabled={isRowUpdating}
                              title={inquiry.isRead ? 'Mark as Unread' : 'Mark as Read'}
                              className={`p-1.5 rounded-lg border text-xs shadow-xs transition-colors disabled:opacity-50 ${
                                inquiry.isRead
                                  ? 'border-stone-200 bg-white hover:bg-stone-50 text-stone-600'
                                  : 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isRowUpdating ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : inquiry.isRead ? (
                                <EyeOff size={13} />
                              ) : (
                                <Eye size={13} />
                              )}
                            </button>
                          )}

                          {/* View Detail */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(inquiry)}
                            className="px-2.5 py-1.5 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <Eye size={12} />
                            <span className="hidden sm:inline">View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Backend Pagination */}
        <AdminPagination
          currentPage={page}
          totalItems={meta.total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {/* Enquiry Detail Modal */}
      <AdminEnquiryDetailModal
        inquiry={selectedInquiry}
        isLoading={isLoadingDetail}
        onClose={() => setSelectedInquiry(null)}
        onStatusUpdated={(updated) => {
          setSelectedInquiry(updated);
          setInquiries((prev) =>
            prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
          );
          setMeta((prev) => {
            const unreadChange = updated.isRead ? -1 : 1;
            const readChange = updated.isRead ? 1 : -1;
            return {
              ...prev,
              unreadCount: Math.max(0, prev.unreadCount + unreadChange),
              readCount: Math.max(0, prev.readCount + readChange),
            };
          });
        }}
      />
    </div>
  );
};
