import adminApi from './adminApi';
import {
  setAdminAccessToken,
  clearAdminAccessToken,
} from '../store/slices/adminAuthSlice';

export interface AdminLoginResponse {
  admin?: Record<string, any>;
  user?: Record<string, any>;
  accessToken?: string;
  token?: string;
  data?: {
    admin?: Record<string, any>;
    user?: Record<string, any>;
    accessToken?: string;
    token?: string;
  };
  [key: string]: any;
}

/**
 * Login as admin.
 * POST /admin/auth/login
 * The backend sets the httpOnly refresh-token cookie automatically.
 * We store the short-lived access token in a JS-readable cookie.
 */
export const adminLogin = async (
  email: string,
  password: string
): Promise<AdminLoginResponse> => {
  const response = await adminApi.post<AdminLoginResponse>('/auth/login', {
    email,
    password,
  });
  const data = response.data?.data || response.data;

  const token =
    data?.accessToken ||
    data?.token ||
    response.data?.accessToken ||
    response.data?.token;

  if (token) {
    setAdminAccessToken(token);
  }

  return data;
};

/**
 * Refresh the admin access token using the httpOnly refresh cookie.
 * POST /admin/auth/refresh
 */
export const refreshAdminToken = async (): Promise<string | null> => {
  try {
    const response = await adminApi.post('/admin/auth/refresh');
    const data = response.data?.data || response.data;
    const token = data?.accessToken || data?.token;
    if (token) {
      setAdminAccessToken(token);
    }
    return token || null;
  } catch {
    clearAdminAccessToken();
    return null;
  }
};

/**
 * Logout from admin session.
 * POST /admin/auth/logout
 * Clears the access token cookie; backend clears the refresh cookie.
 */
export const adminLogout = async (): Promise<void> => {
  try {
    await adminApi.post('/auth/logout');
  } catch {
    // Always clear client-side regardless
  } finally {
    clearAdminAccessToken();
  }
};

/**
 * Get the currently authenticated admin's profile.
 * GET /admin/auth/me
 */
export const getAdminMe = async (): Promise<Record<string, any>> => {
  const response = await adminApi.get('/auth/me');
  return response.data?.data || response.data;
};
