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

  const data = err?.response?.data;

  // 1. Check for validation error details array (e.g. Joi / celebrate / express-validator)
  const details: BackendValidationErrorDetail[] = data?.error?.details || data?.details;
  if (Array.isArray(details) && details.length > 0) {
    const messages = details
      .map(d => {
        const msg = d.message || d.msg;
        if (!msg) return '';
        // If path is specified, show friendly field context if helpful
        const cleanPath = d.path ? d.path.replace(/^(body|query|params)\./, '') : '';
        return cleanPath ? `${cleanPath}: ${msg}` : msg;
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(' • ');
    }
  }

  // 2. Check for backend response.data.message
  if (typeof data?.message === 'string' && data.message.trim()) {
    // Avoid showing just generic "Validation failed" if there is an error code or details
    if (data.message.toLowerCase() === 'validation failed' && data?.error?.code) {
      if (typeof data?.error?.message === 'string') return data.error.message;
    }
    return data.message.trim();
  }

  // 3. Check for backend response.data.error.message
  if (typeof data?.error?.message === 'string' && data.error.message.trim()) {
    return data.error.message.trim();
  }

  // 4. Check for response.data.error as string
  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error.trim();
  }

  // 5. Check for errors array (e.g. data.errors: ["Email is required"])
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const msgs = data.errors
      .map((e: any) => (typeof e === 'string' ? e : e?.message || e?.msg))
      .filter(Boolean);
    if (msgs.length > 0) return msgs.join(' • ');
  }

  // 6. Check for standard JavaScript / Axios error message
  if (typeof err?.message === 'string' && err.message.trim()) {
    if (err.message === 'Network Error') {
      return 'Network Error: Cannot connect to backend server. Please check your internet or server status.';
    }
    return err.message.trim();
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
