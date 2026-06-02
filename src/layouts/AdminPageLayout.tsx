import clsx from "clsx";
import type { ReactNode } from "react";

/** Root shell for dashboard admin list pages — fills main and contains scroll. */
export function AdminPageLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex h-full max-h-full min-h-0 flex-col overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Stat cards row above list content. */
export function AdminPageStatsGrid({
  children,
  className,
  columns = 4,
}: {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}) {
  const columnClass =
    columns === 2
      ? "md:grid-cols-2"
      : columns === 3
        ? "md:grid-cols-3"
        : "md:grid-cols-4";

  return (
    <div className={clsx("mb-3 grid shrink-0 gap-4", columnClass, className)}>
      {children}
    </div>
  );
}

/** Full-width scrollable main area (single table or full-width content). */
export function AdminPageMain({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx("flex min-h-0 flex-1 flex-col overflow-hidden", className)}
    >
      {children}
    </div>
  );
}
