import api from './api';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface LoginData {
  email: string;
  password?: string;
  [key: string]: any;
}

export interface RegisterData {
  name?: string;
  email: string;
  password?: string;
  [key: string]: any;
}

export interface GoogleLoginData {
  token: string;
}

export interface AuthResponse {
  user?: any;
  token?: string;
  message?: string;
  [key: string]: any;
}

// -----------------------------------------------------------------------------
// Authentication API Services
// -----------------------------------------------------------------------------

/**
 * Login a user with standard credentials.
 * POST /auth/login
 */
export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', data);
  return response.data;
};

/**
 * Register a new user.
 * POST /auth/register
 */
export const register = async (data: RegisterData, headers?: Record<string, string>): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/register', data, headers ? { headers } : undefined);
  return response.data;
};

/**
 * Login a user via Google OAuth token.
 * POST /auth/google
 */
export const googleLogin = async (data: GoogleLoginData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/google', data);
  return response.data;
};

/**
 * Refresh the authentication token (usually relies on cookies or a stored refresh token).
 * POST /auth/refresh
 */
export const refreshToken = async (): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/refresh');
  return response.data;
};

/**
 * Log out the current user.
 * POST /auth/logout
 */
export const logout = async (): Promise<void> => {
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };
  
  const refreshToken = getCookie('refreshToken') || '';
  await api.post('/auth/logout', { refreshToken });
};

/**
 * Request password reset instructions. Public endpoint.
 * The backend answers the same way whether or not the account exists.
 * POST /auth/forgot-password
 */
export const forgotPassword = async (email: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/forgot-password', { email });
  return response.data;
};

/**
 * Set a new password using the single-use token from the reset email link. Public endpoint.
 * POST /auth/reset-password
 */
export const resetPassword = async (token: string, newPassword: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/reset-password', { token, newPassword });
  return response.data;
};

/**
 * Fetch the currently authenticated user's profile information.
 * GET /auth/me
 */
export const getMe = async (): Promise<AuthResponse> => {
  const response = await api.get<AuthResponse>('/auth/me');
  return response.data;
};
