import axios from 'axios';

const TOKEN_KEY = 'clingrow_token';
const USER_KEY = 'clingrow_user';

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

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
