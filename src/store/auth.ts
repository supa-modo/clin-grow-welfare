import { create } from 'zustand';
import type { AuthUser } from '@/lib/workspaces';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const token = localStorage.getItem('clingrow_token');
const user = localStorage.getItem('clingrow_user');

export const useAuthStore = create<AuthState>((set) => ({
  token,
  user: user ? JSON.parse(user) : null,
  setAuth: (nextToken, nextUser) => {
    localStorage.setItem('clingrow_token', nextToken);
    localStorage.setItem('clingrow_user', JSON.stringify(nextUser));
    set({ token: nextToken, user: nextUser });
  },
  logout: () => {
    localStorage.removeItem('clingrow_token');
    localStorage.removeItem('clingrow_user');
    set({ token: null, user: null });
  }
}));
