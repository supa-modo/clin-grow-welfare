import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";
import { LuRefreshCw } from "react-icons/lu";

export type RefreshIconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type"
> & {
  /** When true, the icon spins and the button is disabled. */
  loading?: boolean;
  title?: string;
  size?: "sm" | "md" | "lg";
};

export function RefreshIconButton({
  size = "md",
  loading = false,
  disabled,
  title = "Refresh",
  className,
  ...props
}: RefreshIconButtonProps) {
  const sizeClass =
    size === "sm" ? "h-8 w-8" : size === "md" ? "h-9 w-9" : "h-10 w-10";
  const iconSizeClass =
    size === "sm" ? "h-3.5 w-3.5" : size === "md" ? "h-4 w-4" : "h-5 w-5";
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled || loading}
      className={clsx(
        "flex items-center justify-center rounded-xl border border-gray-400 text-slate-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60",
        className,
        sizeClass,
      )}
      {...props}
    >
      <LuRefreshCw
        className={clsx(iconSizeClass, loading && "animate-spin")}
        aria-hidden
      />
    </button>
  );
}
