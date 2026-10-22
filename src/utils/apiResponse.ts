/**
 * Utility functions to extract exact messages returned by the backend API
 * for both success responses and error/validation responses.
 */

export interface BackendValidationErrorDetail {
  path?: string;
  message?: string;
  msg?: string;
  [key: string]: any;
}

/**
 * Extracts the exact error message from the backend response.
 * Handles:
 * 1. Detailed validation error arrays (`error.details[].message`)
 * 2. Root message (`response.data.message`)
 * 3. Nested error message (`response.data.error.message` or `response.data.error`)
 * 4. Error arrays (`response.data.errors[]`)
 * 5. Network / Axios error fallback
 */
export const getBackendErrorMessage = (err: any, fallback: string = 'Request failed'): string => {
  if (!err) return fallback;

  // If a string was directly passed instead of an error object
  if (typeof err === 'string' && err.trim()) {
    return err.trim();
  }

  const data = err?.response?.data;

  // 1. If backend returned a raw string body
  if (typeof data === 'string' && data.trim()) {
    const trimmed = data.trim();
    // Ignore raw HTML error pages from web servers (e.g. nginx 502)
    if (!trimmed.startsWith('<') && !trimmed.startsWith('<!DOCTYPE')) {
      return trimmed;
    }
  }

  // 2. Check for validation error details array (e.g. Joi / celebrate / express-validator)
  const details = data?.error?.details || data?.details;
  if (Array.isArray(details) && details.length > 0) {
    const messages = details
      .map((d: any) => {
        if (typeof d === 'string') return d.trim();
        const msg = d?.message || d?.msg || d?.error;
        if (!msg) return '';
        // If path/field is specified, show friendly field context
        const rawPath = d?.path || d?.field || d?.param || '';
        const cleanPath = typeof rawPath === 'string' ? rawPath.replace(/^(body|query|params)\./, '') : '';
        return cleanPath ? `${cleanPath}: ${msg}` : msg;
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(' • ');
    }
  }

  // 3. Check for details as a key-value object (e.g. { details: { email: "Already taken", sku: "Must be unique" } })
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const entries = Object.entries(details)
      .map(([key, val]) => {
        if (!val) return '';
        if (typeof val === 'string') return `${key}: ${val}`;
        if (Array.isArray(val)) return `${key}: ${val.join(', ')}`;
        if (typeof val === 'object' && (val as any).message) return `${key}: ${(val as any).message}`;
        return `${key}: ${String(val)}`;
      })
      .filter(Boolean);

    if (entries.length > 0) {
      return entries.join(' • ');
    }
  }

  // 4. Check for errors array (e.g. data.errors: ["Email is required"])
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const msgs = data.errors
      .map((e: any) => {
        if (typeof e === 'string') return e.trim();
        const msg = e?.message || e?.msg || e?.error;
        const field = e?.path || e?.field || e?.param;
        return field && msg ? `${field}: ${msg}` : msg || '';
      })
      .filter(Boolean);
    if (msgs.length > 0) return msgs.join(' • ');
  }

  // 5. Check for errors as a key-value dictionary (e.g. data.errors: { title: "Title is required" })
  if (data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    const entries = Object.entries(data.errors)
      .map(([key, val]) => {
        if (!val) return '';
        if (typeof val === 'string') return `${key}: ${val}`;
        if (Array.isArray(val)) return `${key}: ${val.join(', ')}`;
        if (typeof val === 'object' && (val as any).message) return `${key}: ${(val as any).message}`;
        return `${key}: ${String(val)}`;
      })
      .filter(Boolean);

    if (entries.length > 0) {
      return entries.join(' • ');
    }
  }

  // 6. Check for backend response.data.message
  if (typeof data?.message === 'string' && data.message.trim()) {
    // Avoid showing just generic "Validation failed" if there is an error code or nested message
    if (data.message.toLowerCase() === 'validation failed' && data?.error?.message) {
      return data.error.message.trim();
    }
    return data.message.trim();
  }

  // 7. Check for response.data.msg
  if (typeof data?.msg === 'string' && data.msg.trim()) {
    return data.msg.trim();
  }

  // 8. Check for backend response.data.error.message
  if (typeof data?.error?.message === 'string' && data.error.message.trim()) {
    return data.error.message.trim();
  }

  // 9. Check for response.data.error as string
  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error.trim();
  }

  // 10. Check for response.data.error.description
  if (typeof data?.error?.description === 'string' && data.error.description.trim()) {
    return data.error.description.trim();
  }

  // 11. Check for RFC 7807 problem details title
  if (typeof data?.title === 'string' && data.title.trim()) {
    return data.title.trim();
  }

  // 12. Check for standard JavaScript / Axios error message
  if (typeof err?.message === 'string' && err.message.trim()) {
    if (err.message === 'Network Error') {
      return 'Network Error: Cannot connect to backend server. Please check your internet or server status.';
    }
    // Only return if it's not a generic AxiosError string without details
    if (!err.message.startsWith('Request failed with status code')) {
      return err.message.trim();
    }
  }

  // 13. Meaningful status code fallbacks
  const status = err?.response?.status;
  if (status === 400) return 'Bad Request: The submitted data is invalid.';
  if (status === 401) return 'Session expired or unauthorized. Please sign in again.';
  if (status === 403) return 'Access denied: You do not have permission for this action.';
  if (status === 404) return 'Requested item or endpoint was not found.';
  if (status === 409) return 'Conflict: This item or identifier already exists.';
  if (status === 422) return 'Validation failed: The provided information was rejected by the server.';
  if (status === 429) return 'Too many requests: Please wait a moment and try again.';
  if (status === 500) return 'Internal Server Error: An unexpected error occurred on the server.';
  if (status === 502 || status === 503 || status === 504) {
    return 'Backend service is temporarily unavailable. Please try again shortly.';
  }

  return fallback;
};

/**
 * Extracts the exact success message returned by the backend API.
 * e.g. `{ "success": true, "message": "Product status changed successfully" }`
 */
export const getBackendSuccessMessage = (responseOrData: any, fallback: string = 'Action completed successfully'): string => {
  if (!responseOrData) return fallback;

  // If full axios response object
  const data = responseOrData?.data ?? responseOrData;

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }

  if (typeof responseOrData?.message === 'string' && responseOrData.message.trim()) {
    return responseOrData.message.trim();
  }

  return fallback;
};
