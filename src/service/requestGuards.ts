import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// -----------------------------------------------------------------------------
// Request guards shared by the customer and admin Axios instances:
//  1. Identical GET requests that are already in flight share one network call
//     (React StrictMode runs effects twice in development, and several screens
//     ask for the same data at the same time).
//  2. 429 Too Many Requests on a GET is retried a couple of times, honouring the
//     server's Retry-After header. Writes are never retried automatically.
// -----------------------------------------------------------------------------

const MAX_429_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 8000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryDelay = (response: AxiosResponse | undefined, attempt: number) => {
  const header = response?.headers?.['retry-after'];
  const seconds = header !== undefined ? Number(header) : NaN;
  const ms = Number.isFinite(seconds) ? seconds * 1000 : BASE_RETRY_DELAY_MS * 2 ** attempt;
  return Math.min(ms, MAX_RETRY_DELAY_MS);
};

export const attachRequestGuards = (instance: AxiosInstance) => {
  // 1. De-duplicate concurrent GETs
  const inFlight = new Map<string, Promise<AxiosResponse>>();
  const originalGet = instance.get.bind(instance) as (url: string, config?: AxiosRequestConfig) => Promise<AxiosResponse>;

  instance.get = ((url: string, config?: AxiosRequestConfig) => {
    // Requests that carry an abort signal or custom headers are left alone
    if (config?.signal || config?.headers) return originalGet(url, config);

    const key = `${url}|${JSON.stringify(config?.params ?? null)}|${config?.responseType ?? ''}`;
    const existing = inFlight.get(key);
    if (existing) return existing;

    const request = originalGet(url, config).finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
  }) as AxiosInstance['get'];

  // 2. Back off and retry GETs that hit the rate limit
  instance.interceptors.response.use(
    response => response,
    async error => {
      const config = error.config as (AxiosRequestConfig & { _rateLimitRetries?: number }) | undefined;
      const isGet = (config?.method || 'get').toLowerCase() === 'get';

      if (error.response?.status === 429 && config && isGet) {
        const attempt = config._rateLimitRetries ?? 0;
        if (attempt < MAX_429_RETRIES) {
          config._rateLimitRetries = attempt + 1;
          await sleep(retryDelay(error.response, attempt));
          return instance.request(config);
        }
      }

      if (error.response?.status === 429 && error.response.data && typeof error.response.data === 'object') {
        error.response.data.message ||= 'Too many requests. Please wait a moment and try again.';
      }
      return Promise.reject(error);
    }
  );

  return instance;
};
