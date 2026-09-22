import axios from 'axios';

// Base URL for the backend API, loaded from environment variables
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Create a reusable Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure cookies (e.g., refresh tokens) are sent with cross-origin requests
  withCredentials: true,
});

// Request interceptor to append authorization token if present
api.interceptors.request.use(
  (config) => {
    // Assuming token is stored in cookies. Update this if using a different storage mechanism.
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };
    const token = getCookie('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors (like 401 Unauthorized)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Here you can handle generic errors, like redirecting to login if status is 401
    return Promise.reject(error);
  }
);

export default api;
