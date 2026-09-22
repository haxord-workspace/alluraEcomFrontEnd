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
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/register', data);
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
 * Fetch the currently authenticated user's profile information.
 * GET /auth/me
 */
export const getMe = async (): Promise<AuthResponse> => {
  const response = await api.get<AuthResponse>('/auth/me');
  return response.data;
};
