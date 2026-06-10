import type { ReactNode } from "react";
import clsx from "clsx";
export function PageHeader({
  title,
  description,
  subtitle,
  actions,
  action,
  className,
}: {
  title: string;
  /** Backwards compatible: prefer `subtitle` for richer content. */
  description?: string;
  subtitle?: ReactNode;
  /** Backwards compatible: prefer `action`. */
  actions?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const effectiveAction = action ?? actions;
  const effectiveSubtitle =
    subtitle ?? (description ? <span>{description}</span> : null);

  return (
    <div className={clsx("mb-4", className)}>
      <div className="flex flex-col gap-3 border-b border-ink-100 pb-3 md:gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-col items-start gap-1.5 pl-0.5 md:gap-2 lg:flex-row lg:items-center lg:gap-4">
            <h1 className="font-google text-[0.9rem] md:text-[1rem] font-extrabold leading-tight tracking-tight text-ink-900">
              {title}
            </h1>
            {effectiveSubtitle ? (
              <>
                <div className="hidden h-5 w-px bg-gray-400 lg:block" />
                <div className="max-w-3xl text-[0.8rem] text-ink-500 lg:text-sm">
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
