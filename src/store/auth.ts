import { create } from 'zustand';
import type { AuthUser } from '@/lib/workspaces';
import { api, clearStoredSession } from '@/services/api';

const TOKEN_KEY = 'clingrow_token';
const USER_KEY = 'clingrow_user';

type AuthStatus = 'idle' | 'bootstrapping' | 'ready';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  setAuth: (token: string, user: AuthUser) => void;
  clearSession: () => void;
  logout: () => void;
  bootstrap: () => Promise<void>;
};

function readStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function persistSession(token: string | null, user: AuthUser | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);

  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

let bootstrapPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  token: readStoredToken(),
  user: readStoredUser(),
  status: 'idle',

  setAuth: (nextToken, nextUser) => {
    persistSession(nextToken, nextUser);
    set({ token: nextToken, user: nextUser });
  },

  clearSession: () => {
    clearStoredSession();
    set({ token: null, user: null });
  },

  logout: () => {
    get().clearSession();
  },

  bootstrap: async () => {
    if (get().status === 'ready') return;
    if (bootstrapPromise) {
      await bootstrapPromise;
      return;
    }

    bootstrapPromise = (async () => {
      set({ status: 'bootstrapping' });

      const storedToken = readStoredToken();
      const storedUser = readStoredUser();

      if (!storedToken) {
        set({ token: null, user: null, status: 'ready' });
        return;
      }

      set({ token: storedToken, user: storedUser });

      try {
        const { data } = await api.get<{ user: AuthUser }>('/auth/me', {
          skipAuthRedirect: true,
        });
        get().setAuth(storedToken, data.user);
      } catch {
        get().clearSession();
      } finally {
        set({ status: 'ready' });
      }
    })();

    try {
      await bootstrapPromise;
    } finally {
      bootstrapPromise = null;
    }
  },
}));
