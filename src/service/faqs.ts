import api from './api';
import { getBackendErrorMessage } from '../utils/apiResponse';

// -----------------------------------------------------------------------------
// CMS FAQs Public endpoints (Swagger: "CMS FAQs Public")
// GET /cms/faqs             -> published FAQs for storefront display
// GET /cms/faqs/categories  -> distinct categories of published FAQs
// GET /cms/faqs/{id}        -> single published FAQ by id
// -----------------------------------------------------------------------------

export interface PublicFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
}

const unwrap = (response: any) => response?.data?.data ?? response?.data;

const mapFaq = (raw: any): PublicFaq => ({
  id: raw?._id || raw?.id || '',
  question: raw?.question || '',
  answer: raw?.answer || '',
  category: raw?.category || 'General',
  sortOrder: typeof raw?.sortOrder === 'number' ? raw.sortOrder : Number(raw?.order ?? raw?.displayOrder ?? 0),
});

/** GET /cms/faqs */
export const getPublicFaqs = async (): Promise<PublicFaq[]> => {
  const response = await api.get('/cms/faqs');
  const data = unwrap(response);
  const list = Array.isArray(data) ? data : data?.faqs || data?.items || [];
  return (Array.isArray(list) ? list.map(mapFaq) : []).sort((a, b) => a.sortOrder - b.sortOrder);
};

/** GET /cms/faqs/categories */
export const getPublicFaqCategories = async (): Promise<string[]> => {
  const response = await api.get('/cms/faqs/categories');
  const data = unwrap(response);
  const list = Array.isArray(data) ? data : data?.categories || [];
  return list.map((c: any) => (typeof c === 'string' ? c : c?.name || c?.category)).filter(Boolean);
};

/** GET /cms/faqs/{id} */
export const getPublicFaq = async (id: string): Promise<PublicFaq> => {
  const response = await api.get(`/cms/faqs/${id}`);
  return mapFaq(unwrap(response));
};

export const faqErrorMessage = (error: any, fallback: string): string =>
  getBackendErrorMessage(error, fallback);
