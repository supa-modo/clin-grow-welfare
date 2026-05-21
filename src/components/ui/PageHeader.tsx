import type { ReactNode } from "react";
import { Fragment } from "react";
import clsx from "clsx";

type Breadcrumb = { label: string; href?: string };

export function PageHeader({
  title,
  description,
  subtitle,
  actions,
  action,
  breadcrumbs,
  className,
}: {
  title: string;
  /** Backwards compatible: prefer `subtitle` for richer content. */
  description?: string;
  subtitle?: ReactNode;
  /** Backwards compatible: prefer `action`. */
  actions?: ReactNode;
  action?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  className?: string;
}) {
  const effectiveAction = action ?? actions;
  const effectiveSubtitle =
    subtitle ?? (description ? <span>{description}</span> : null);

  return (
    <div className={clsx("mb-6", className)}>
      {breadcrumbs?.length ? (
        <nav className="mb-2 flex items-center gap-1.5 text-sm text-ink-500">
          {breadcrumbs.map((bc, i) => (
            <Fragment key={`${bc.label}-${i}`}>
              {i > 0 && <span className="text-ink-400">/</span>}
              {bc.href ? (
                <a
                  href={bc.href}
                  className="font-medium text-ink-600 transition-colors hover:text-brand-700"
                >
                  {bc.label}
                </a>
              ) : (
                <span
                  className={clsx(
                    i === breadcrumbs.length - 1 &&
                      "font-semibold text-ink-900",
                  )}
                >
                  {bc.label}
                </span>
              )}
            </Fragment>
          ))}
        </nav>
      ) : null}

      <div className="flex flex-col gap-3 border-b border-ink-100 pb-4 md:gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-col items-start gap-1.5 pl-0.5 md:gap-2 lg:flex-row lg:items-center lg:gap-4">
            <h1 className="font-google text-[1.2rem] font-extrabold leading-tight tracking-tight text-ink-900 md:text-[1.4rem]">
              {title}
            </h1>
            {effectiveSubtitle ? (
              <>
                <div className="hidden h-5 w-px bg-gray-400 lg:block" />
                <div className="max-w-3xl text-sm font-medium text-ink-500 lg:text-[0.95rem]">
                  {effectiveSubtitle}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {effectiveAction ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {effectiveAction}
          </div>
        ) : null}
      </div>
    </div>
  );
}
