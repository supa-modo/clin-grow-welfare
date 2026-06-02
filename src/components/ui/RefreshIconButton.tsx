import type { ButtonHTMLAttributes } from "react";
import { FiRefreshCw } from "react-icons/fi";
import clsx from "clsx";

export type RefreshIconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type"
> & {
  /** When true, the icon spins and the button is disabled. */
  loading?: boolean;
  title?: string;
};

export function RefreshIconButton({
  loading = false,
  disabled,
  title = "Refresh",
  className,
  ...props
}: RefreshIconButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled || loading}
      className={clsx(
        "flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      <FiRefreshCw
        className={clsx("h-4 w-4", loading && "animate-spin")}
        aria-hidden
      />
    </button>
  );
}
