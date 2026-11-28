import api from './api';
import adminApi from './adminApi';
import { getBackendErrorMessage } from '../utils/apiResponse';
import type {
  ContactInquiry,
  ContactInquiriesListResult,
  ContactInquiryListParams,
  PublicContactInquiryPayload,
} from '../types/contactInquiry';

export const CONTACT_INQUIRIES_UPDATED_EVENT = 'allura:contact-inquiries-updated';

export const notifyContactInquiriesUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONTACT_INQUIRIES_UPDATED_EVENT));
  }
};

export const contactInquiryErrorMessage = (err: any, fallback: string = 'An error occurred'): string => {
  return getBackendErrorMessage(err, fallback);
};

export const formatISTDateTime = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

/**
 * Public API: Submit customer enquiry
 * POST /api/v1/contact-inquiries
 */
export const submitPublicContactInquiry = async (
  payload: PublicContactInquiryPayload
): Promise<{ success: boolean; message: string; data?: any }> => {
  const response = await api.post('/contact-inquiries', payload);
  return response.data;
};

/**
 * Admin API: List enquiries with search, filters, sorting and pagination
 * GET /api/v1/admin/contact-inquiries
 */
export const getContactInquiries = async (
  params?: ContactInquiryListParams,
  signal?: AbortSignal
): Promise<ContactInquiriesListResult> => {
  const response = await adminApi.get('/admin/contact-inquiries', {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      readStatus: params?.readStatus ?? 'all',
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.sortBy ? { sortBy: params.sortBy } : {}),
      ...(params?.sortOrder ? { sortOrder: params.sortOrder } : {}),
    },
    signal,
  });

  const body = response.data;
  const data = body?.data || body;
  const inquiries: ContactInquiry[] = Array.isArray(data?.inquiries) ? data.inquiries : [];
  const meta = data?.meta || {
    total: inquiries.length,
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    totalPages: 1,
    unreadCount: 0,
    readCount: 0,
  };

  return { inquiries, meta };
};

/**
 * Admin API: Get unread enquiries count
 * GET /api/v1/admin/contact-inquiries/unread-count
 */
export const getUnreadContactInquiryCount = async (signal?: AbortSignal): Promise<number> => {
  const response = await adminApi.get('/admin/contact-inquiries/unread-count', { signal });
  const body = response.data;
  const data = body?.data || body;
  return typeof data?.unreadCount === 'number' ? data.unreadCount : 0;
};

/**
 * Admin API: Get individual enquiry detail
 * GET /api/v1/admin/contact-inquiries/:id
 */
export const getContactInquiryById = async (
  id: string,
  signal?: AbortSignal
): Promise<ContactInquiry> => {
  const response = await adminApi.get(`/admin/contact-inquiries/${encodeURIComponent(id)}`, {
    signal,
  });
  const body = response.data;
  const data = body?.data || body;
  return data?.inquiry || data;
};

/**
 * Admin API: Update enquiry read/unread status
 * PATCH /api/v1/admin/contact-inquiries/:id/read-status
 */
export const updateContactInquiryReadStatus = async (
  id: string,
  isRead: boolean
): Promise<ContactInquiry> => {
  const response = await adminApi.patch(
    `/admin/contact-inquiries/${encodeURIComponent(id)}/read-status`,
    { isRead }
  );
  notifyContactInquiriesUpdated();
  const body = response.data;
  const data = body?.data || body;
  return data?.inquiry || data;
};
