import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { FiX } from "react-icons/fi";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

export type SlideOverProps = {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
  className?: string;
  titleId?: string;
  presentation?: "default" | "stacked";
  layer?: number;
  closeOnEscape?: boolean;
};

export function SlideOver({
  open,
  isOpen,
  onClose,
  title,
  subtitle,
  headerRight,
  children,
  footer,
  widthClass = "max-w-3xl",
  className,
  titleId,
  presentation = "default",
  layer = 200,
  closeOnEscape = true,
}: SlideOverProps) {
  const generatedTitleId = useId();
  const resolvedTitleId = titleId ?? generatedTitleId;
  const visible = Boolean(open ?? isOpen);
  const [mounted, setMounted] = useState(false);

  useBodyScrollLock(visible);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!visible || !closeOnEscape) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeOnEscape, onClose, visible]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="slideover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={clsx(
            // Dynamic viewport: avoids bottom crop when mobile browser chrome differs from 100vh layout viewport.
            "fixed inset-x-0 top-0 flex min-h-0 justify-end overflow-hidden overscroll-contain",
            "h-screen max-h-screen supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]",
            "md:inset-0 md:h-auto md:max-h-none",
            presentation === "stacked"
              ? "px-3 pt-3 pb-[calc(0.75rem+10px+env(safe-area-inset-bottom,0px))] md:px-4 md:pb-4"
              : "px-2 pt-2 pb-[calc(0.5rem+10px+env(safe-area-inset-bottom,0px))] md:px-3 md:pb-3",
          )}
          style={{ zIndex: layer }}
          role="presentation"
        >
          <button
            type="button"
            className={clsx(
              "absolute cursor-default backdrop-blur-[2px]",
              "inset-x-0 top-0 h-screen max-h-screen supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]",
              "md:inset-0 md:h-auto md:max-h-none",
              presentation === "stacked" ? "bg-ink-900/25" : "bg-ink-900/45",
            )}
            aria-label="Close panel"
            onClick={onClose}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={resolvedTitleId}
            initial={{
              x: "100%",
              scale: presentation === "stacked" ? 0.98 : 1,
              y: presentation === "stacked" ? 8 : 0,
            }}
            animate={{
              x: 0,
              scale: presentation === "stacked" ? 0.98 : 1,
              y: presentation === "stacked" ? 8 : 0,
            }}
            exit={{
              x: "100%",
              scale: presentation === "stacked" ? 0.98 : 1,
              y: presentation === "stacked" ? 8 : 0,
            }}
            transition={{ type: "spring", damping: 34, stiffness: 330 }}
            className={clsx(
              "relative z-10 flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-2xl",
              widthClass,
              className,
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-ink-100 bg-white px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <h2
                  id={resolvedTitleId}
                  className="truncate text-base font-extrabold text-ink-900 sm:text-lg"
                >
                  {title}
                </h2>
                {subtitle ? (
                  <div className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-500">
                    {subtitle}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {headerRight}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  aria-label="Close"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-kanban px-4 py-4 sm:px-5">
              {children}
            </div>

            {footer ? (
              <footer className="shrink-0 rounded-b-2xl border-t border-ink-100 bg-ink-50/80 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:px-5 md:pb-3">
                {footer}
              </footer>
            ) : null}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export default SlideOver;
