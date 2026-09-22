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
// Customer Profile API Services
// -----------------------------------------------------------------------------

/**
 * Fetch the currently authenticated customer's profile.
 * GET /customer/profile
 */
export const getCustomerProfile = async (): Promise<CustomerProfileResponse> => {
  const response = await api.get('/customer/profile');
  return response.data?.data || response.data;
};

/**
 * Update the currently authenticated customer's profile.
 * PATCH /customer/profile
 */
export const updateCustomerProfile = async (
  data: UpdateCustomerProfileData
): Promise<CustomerProfileResponse> => {
  const response = await api.patch('/customer/profile', data);
  return response.data?.data || response.data;
};
