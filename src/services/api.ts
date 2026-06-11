import axios from 'axios';

const TOKEN_KEY = 'clingrow_token';
const USER_KEY = 'clingrow_user';

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  // In local dev, use the Vite `/api` proxy to stay same-origin and avoid CORS
  // or download-manager extensions intercepting PDF arraybuffer requests.
  if (import.meta.env.DEV && import.meta.env.VITE_API_DIRECT !== 'true') {
    return '/api';
  }
  return configured || '/api';
}

const apiBaseUrl = resolveApiBaseUrl();

export const api = axios.create({ baseURL: apiBaseUrl });

/** Resolve a path against the configured API base (works in production when VITE_API_URL is absolute). */
export function apiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return `${apiBaseUrl.replace(/\/$/, '')}${normalizedPath}`;
  }
  return `${apiBaseUrl.replace(/\/$/, '')}${normalizedPath}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      clearStoredSession();

      const skipRedirect = err.config?.skipAuthRedirect === true;
      const onLogin = window.location.pathname.startsWith('/login');

      if (!skipRedirect && !onLogin) {
        const params = new URLSearchParams(window.location.search);
        params.set('session', 'expired');
        window.location.href = `/login?${params.toString()}`;
      }
    }
    return Promise.reject(err);
  },
);

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
  }
}
