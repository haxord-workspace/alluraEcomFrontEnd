export interface ContactInquiry {
  id: string;
  name: string;
  phone: string;
  occasionType?: string | null;
  message?: string | null;
  isRead: boolean;
  readAt?: string | null;
  readBy?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export type ContactInquiryReadStatus = 'all' | 'read' | 'unread';
export type ContactInquirySortBy = 'createdAt' | 'name' | 'readAt';
export type ContactInquirySortOrder = 'desc' | 'asc';

export interface ContactInquiryListParams {
  page?: number;
  limit?: number;
  readStatus?: ContactInquiryReadStatus;
  search?: string;
  sortBy?: ContactInquirySortBy;
  sortOrder?: ContactInquirySortOrder;
}

export interface ContactInquiriesMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
  readCount: number;
}

export interface ContactInquiriesListResult {
  inquiries: ContactInquiry[];
  meta: ContactInquiriesMeta;
}

export interface PublicContactInquiryPayload {
  name: string;
  phone: string;
  occasionType?: string;
  message?: string;
  website?: string;
}
