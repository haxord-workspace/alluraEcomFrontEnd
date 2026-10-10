import api from './api';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CustomerProfileResponse {
  id?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: {
    countryCode: string;
    number: string;
  };
  avatarUrl?: string;
  [key: string]: any;
}

export interface UpdateCustomerProfileData {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: {
    countryCode: string;
    number: string;
  };
  avatarUrl?: string;
}

// -----------------------------------------------------------------------------
// Mapping
// -----------------------------------------------------------------------------

/**
 * Reads the profile whether the backend sends it flat ({ firstName, ... }) or nested
 * like /auth/me ({ user: { profile: { firstName, lastName, displayName }, phone, email } }).
 */
const mapProfile = (raw: any): CustomerProfileResponse => {
  const root = raw?.customer || raw?.user || raw || {};
  const p = root.profile && typeof root.profile === 'object' ? root.profile : {};
  const phoneRaw = root.phone ?? p.phone;
  const phone =
    phoneRaw && typeof phoneRaw === 'object' && phoneRaw.number
      ? { countryCode: phoneRaw.countryCode || '+91', number: String(phoneRaw.number) }
      : typeof phoneRaw === 'string' && phoneRaw.trim()
      ? { countryCode: '+91', number: phoneRaw.trim() }
      : undefined;
  return {
    ...root,
    id: root._id || root.id,
    firstName: p.firstName ?? root.firstName,
    lastName: p.lastName ?? root.lastName,
    displayName: p.displayName ?? root.displayName,
    email: root.email,
    phone,
    avatarUrl: p.avatarUrl ?? root.avatarUrl,
  };
};

/** Name to show for a customer: display name, else first + last name */
export const profileDisplayName = (p: CustomerProfileResponse): string =>
  p.displayName?.trim() || [p.firstName, p.lastName].filter(Boolean).join(' ').trim();

/** "+91 9847123456", or '' when there is no phone */
export const profilePhone = (p: CustomerProfileResponse): string =>
  p.phone?.number ? `${p.phone.countryCode || '+91'} ${p.phone.number}`.trim() : '';

// -----------------------------------------------------------------------------
// Customer Profile API Services
// -----------------------------------------------------------------------------

/**
 * Fetch the currently authenticated customer's profile.
 * GET /customer/profile
 */
export const getCustomerProfile = async (): Promise<CustomerProfileResponse> => {
  const response = await api.get('/customer/profile');
  return mapProfile(response.data?.data ?? response.data);
};

/**
 * Update the currently authenticated customer's profile.
 * PATCH /customer/profile
 */
export const updateCustomerProfile = async (
  data: UpdateCustomerProfileData
): Promise<CustomerProfileResponse> => {
  const response = await api.patch('/customer/profile', data);
  return mapProfile(response.data?.data ?? response.data);
};

export const profileErrorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.error?.details?.[0]?.message || error?.response?.data?.message || fallback;
