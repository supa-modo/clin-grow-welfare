import { create } from "zustand";

export type ToastTone = "success" | "error" | "info" | "warning";

export type Toast = {
  id: string;
  message?: string;
  title: string;
  tone?: ToastTone;
  type?: ToastTone;
  duration?: number;
  durationMs?: number;
};

type ToastInput = Omit<Toast, "id"> & { id?: string };

type UIState = {
  sidebarCollapsed: boolean;
  mobileDrawerOpen: boolean;
  toasts: Toast[];
  toggleSidebar: () => void;
  toggleMobileDrawer: () => void;
  closeMobileDrawer: () => void;
  pushToast: (toast: ToastInput) => void;
  addToast: (toast: ToastInput) => void;
  removeToast: (id: string) => void;
  toastSuccess: (title: string, message?: string, durationMs?: number) => void;
  toastError: (title: string, message?: string, durationMs?: number) => void;
  toastInfo: (title: string, message?: string, durationMs?: number) => void;
  toastWarning: (title: string, message?: string, durationMs?: number) => void;
};

function sameToast(current: Toast, next: ToastInput) {
  return (
    current.title === next.title &&
    current.message === next.message &&
    (current.tone ?? "info") === (next.tone ?? next.type ?? "info")
  );
}

export const useUiStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  mobileDrawerOpen: false,
  toasts: [],
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleMobileDrawer: () =>
    set((state) => ({ mobileDrawerOpen: !state.mobileDrawerOpen })),
  closeMobileDrawer: () => set({ mobileDrawerOpen: false }),
  pushToast: (toast) =>
    set((state) => {
      if (state.toasts.some((current) => sameToast(current, toast))) {
        return state;
      }
      const id = toast.id ?? crypto.randomUUID();
      return {
        toasts: [
          ...state.toasts,
          {
            ...toast,
            id,
            tone: toast.tone ?? toast.type ?? "info",
            title: toast.title,
          },
        ],
      };
    }),
  addToast: (toast) => get().pushToast(toast),
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  toastSuccess: (title, message, durationMs) =>
    get().pushToast({ title, message, tone: "success", durationMs }),
  toastError: (title, message, durationMs) =>
    get().pushToast({ title, message, tone: "error", durationMs }),
  toastInfo: (title, message, durationMs) =>
    get().pushToast({ title, message, tone: "info", durationMs }),
  toastWarning: (title, message, durationMs) =>
    get().pushToast({ title, message, tone: "warning", durationMs }),
}));

export const useUIStore = useUiStore;
