import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';
export type Toast = {
  id: string;
  message: string;
  title?: string;
  tone?: ToastTone;
  type?: ToastTone;
  duration?: number;
  durationMs?: number;
};

type UIState = { toasts: Toast[]; addToast: (toast: Toast) => void; removeToast: (id: string) => void };

export const useUiStore = create<UIState>((set) => ({
  toasts: [],
  addToast: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}));

export const useUIStore = useUiStore;
