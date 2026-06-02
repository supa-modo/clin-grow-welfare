import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import { useUiStore, type Toast, type ToastTone } from "@/store/uiStore";
export function Spinner() {
  return (
    <span className="inline-block h-4 w-4 lg:h-5 lg:w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-5 md:p-6 lg:p-8 text-center">
      <p className="font-bold text-[0.8rem] md:text-[0.85rem] lg:text-[0.9rem] text-gray-600">
        {title}
      </p>
      {message ? (
        <p className="mt-2 text-[0.7rem] md:text-[0.75rem] lg:text-[0.8rem] text-gray-500">
          {message}
        </p>
      ) : null}
    </div>
  );
}

const DEFAULT_DURATION_MS = 4000;

const ICONS: Record<ToastTone, React.ReactNode> = {
  success: <FiCheckCircle className="h-5 w-5 text-green-600" />,
  error: <FiXCircle className="h-5 w-5 text-secondary-600" />,
  warning: <FiAlertTriangle className="h-5 w-5 text-amber-600" />,
  info: <FiInfo className="h-5 w-5 text-brand-600" />,
};

const SURFACE: Record<ToastTone, string> = {
  success: "bg-green-100 border-green-600/40",
  error: "bg-secondary-100 border-secondary-600/40",
  warning: "bg-amber-100 border-amber-600/45",
  info: "bg-brand-100 border-brand-600/45",
};

const PROGRESS: Record<ToastTone, string> = {
  success: "bg-green-600",
  error: "bg-secondary-600",
  warning: "bg-amber-600",
  info: "bg-brand-600",
};

function ToastRow({ toast }: { toast: Toast }) {
  const removeToast = useUiStore((s) => s.removeToast);
  const tone: ToastTone = toast.tone ?? "info";
  const durationMs = toast.durationMs ?? DEFAULT_DURATION_MS;
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const remainingMsRef = useRef(durationMs);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (durationMs <= 0) return;
    remainingMsRef.current = durationMs;
    startedAtRef.current = Date.now();
    setIsPaused(false);
    timerRef.current = window.setTimeout(
      () => removeToast(toast.id),
      durationMs,
    );
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [toast.id, durationMs, removeToast]);

  function pauseDismissTimer() {
    if (durationMs <= 0 || isPaused) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    remainingMsRef.current = Math.max(
      0,
      remainingMsRef.current - (Date.now() - startedAtRef.current),
    );
    setIsPaused(true);
  }

  function resumeDismissTimer() {
    if (durationMs <= 0 || !isPaused || remainingMsRef.current <= 0) return;
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(
      () => removeToast(toast.id),
      remainingMsRef.current,
    );
    setIsPaused(false);
  }

  return (
    <div
      className={`relative flex min-w-[280px] max-w-sm flex-col overflow-hidden rounded-xl border shadow-panel ${SURFACE[tone]}`}
      style={{ animation: "toastIn 0.25s ease-out" }}
      onMouseEnter={pauseDismissTimer}
      onMouseLeave={resumeDismissTimer}
      role="status"
    >
      <div className="flex items-start gap-3 px-4 pb-2 pt-3">
        <span className="mt-0.5 shrink-0">{ICONS[tone]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-ink-900">
            {toast.title ?? toast.message ?? "Notification"}
          </p>
          {toast.message ? (
            <p className="mt-1 text-sm leading-snug text-ink-600">
              {toast.message}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-ink-400 transition-colors hover:bg-black/5 hover:text-ink-700"
          onClick={() => removeToast(toast.id)}
          aria-label="Dismiss notification"
        >
          <FiX className="h-4 w-4" />
        </button>
      </div>
      {durationMs > 0 ? (
        <div className="h-1 w-full bg-black/10">
          <div
            className={`toast-progress-fill h-full w-full ${PROGRESS[tone]}`}
            style={
              {
                "--toast-duration": `${durationMs}ms`,
                animationPlayState: isPaused ? "paused" : "running",
              } as CSSProperties
            }
          />
        </div>
      ) : null}
    </div>
  );
}

export function Toasts() {
  const toasts = useUiStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(100vw-2rem,20rem)] flex-col items-end gap-2">
      <div className="pointer-events-auto flex w-full flex-col gap-2">
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t} />
        ))}
      </div>
    </div>
  );
}
