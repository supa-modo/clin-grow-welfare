import clsx from "clsx";
import type { ReactNode } from "react";

type LayoutProps = {
  children: ReactNode;
  className?: string;
  /**
   * Use on table-heavy pages with DataTable `fillContainer` so the table
   * scrolls inside the viewport. Default pages grow naturally and scroll via
   * the dashboard main container.
   */
  fillHeight?: boolean;
};

/** Root shell for dashboard admin pages. */
export function AdminPageLayout({
  children,
  className,
  fillHeight = false,
}: LayoutProps) {
  return (
    <div
      className={clsx(
        "flex w-full flex-col",
        fillHeight && "min-h-0 flex-1",
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

/** Main content area below headers/stats. */
export function AdminPageMain({
  children,
  className,
  fillHeight = false,
}: LayoutProps) {
  return (
    <div
      className={clsx(
        "flex w-full flex-col",
        fillHeight && "min-h-0 flex-1",
        className,
      )}
    >
      {children}
    </div>
  );
}
