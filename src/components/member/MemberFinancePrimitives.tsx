import type { ReactNode } from "react";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function FinanceMetric({
  label,
  value,
  hint,
  className,
  icon,
  accent = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
  icon?: ReactNode;
  accent?: "default" | "primary" | "secondary";
}) {
  const accentClass =
    accent === "primary"
      ? "border-primary-100 bg-gradient-to-br from-primary-50/80 to-white"
      : accent === "secondary"
        ? "border-secondary-100 bg-gradient-to-br from-secondary-50/80 to-white"
        : "border-ink-100 bg-white";

  return (
    <div
      className={clsx(
        "rounded-2xl border p-4 shadow-sm",
        accentClass,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 shrink-0 text-brand-600">{icon}</span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-500">
            {label}
          </p>
          <p className="mt-1 font-google text-2xl font-extrabold tracking-tight text-ink-950">
            {value}
          </p>
          {hint ? (
            <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-ink-500">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function RepaymentProgress({
  progress,
  repaidLabel,
  totalDueLabel,
  label = "Repayment progress",
  tone = "success",
  className,
}: {
  progress: number;
  repaidLabel: string;
  totalDueLabel: string;
  label?: string;
  tone?: "success" | "warning" | "danger";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, progress));
  const fillClass =
    tone === "danger"
      ? "bg-primary-600"
      : tone === "warning"
        ? "bg-primary-600"
        : "bg-primary-600";

  return (
    <div className={clsx("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-ink-600">{label}</span>
        <span className="font-extrabold text-ink-900">{clamped}%</span>
      </div>
      <div className="relative pt-2">
        <div
          className="relative h-1.5 w-full rounded-full bg-ink-100"
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div
            className={clsx(
              "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
              fillClass,
            )}
            style={{ width: `${clamped}%` }}
          />
          <div
            className={clsx(
              "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full shadow-sm ring-4 ring-white transition-all duration-500",
              fillClass,
            )}
            style={{
              left: `clamp(0px, calc(${clamped}% - 10px), calc(100% - 20px))`,
            }}
          >
            <span className="grid h-full w-full place-items-center">
              <span className="grid grid-cols-2 gap-[2px]">
                {Array.from({ length: 4 }).map((_, index) => (
                  <span
                    key={index}
                    className="h-[3px] w-[3px] rounded-full bg-white/90"
                  />
                ))}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-1 text-xs text-ink-500">
        <span>{repaidLabel}</span>
        <span>{totalDueLabel}</span>
      </div>
    </div>
  );
}

export function StatCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="px-3 py-3 sm:py-3.5">
      <div className="flex items-center gap-2 text-xs font-medium text-ink-500">
        {icon ? <span className="shrink-0 text-brand-600">{icon}</span> : null}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-sm font-extrabold text-ink-900">{value}</p>
    </div>
  );
}

export function MobileRecordCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={clsx("border-b border-gray-400 bg-white p-3", className)}
    >
      {children}
    </article>
  );
}

export function LoanRepaymentBlock({
  loanNumber,
  status,
  outstanding,
  progress,
  repaid,
  totalDue,
  dueDateLabel,
  dueDateValue,
  scheduleHint,
  formatDate,
  onViewDetails,
  detailsHref = "/member/loans",
}: {
  loanNumber: string;
  status: string;
  outstanding: string;
  progress: number;
  repaid: string;
  totalDue: string;
  dueDateLabel?: string;
  dueDateValue?: string;
  scheduleHint?: string;
  formatDate: (v?: string) => string;
  onViewDetails?: () => void;
  detailsHref?: string;
}) {
  const tone =
    status === "OVERDUE" || status === "DEFAULTED"
      ? "danger"
      : status === "PARTIALLY_PAID" || status === "IN_ROLLOVER"
        ? "warning"
        : "success";

  return (
    <section className="rounded-2xl border border-gray-300 bg-white p-5 ">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-600">{loanNumber}</p>
          <p className="mt-1 font-google text-2xl font-extrabold tracking-tight text-red-600">
            {outstanding}
          </p>
        </div>
        <Badge
          size="xs"
          tone={
            tone === "danger"
              ? "danger"
              : tone === "warning"
                ? "warning"
                : "success"
          }
        >
          {status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="lg:mt-2 rounded-2xl bg-gray-50/80 px-1 py-4">
        <RepaymentProgress
          progress={progress}
          repaidLabel={`Repaid ${repaid}`}
          totalDueLabel={`Due ${totalDue}`}
          tone={tone}
        />
      </div>

      {(dueDateLabel && dueDateValue) || scheduleHint ? (
        <div className="mt-4 space-y-1 text-xs text-ink-500">
          {dueDateLabel && dueDateValue ? (
            <p>
              <span className="font-semibold text-ink-700">
                {dueDateLabel}:
              </span>{" "}
              {formatDate(dueDateValue)}
            </p>
          ) : null}
          {scheduleHint ? <p>{scheduleHint}</p> : null}
        </div>
      ) : null}

      {onViewDetails ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onViewDetails}
        >
          View loan details
        </Button>
      ) : (
        <Link to={detailsHref} className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            View loan details
          </Button>
        </Link>
      )}
    </section>
  );
}

export function LoanEmptyBlock({
  maxEligible,
  money,
}: {
  maxEligible?: number;
  money: (n: number) => string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-5 text-center sm:p-6">
      <p className="text-sm font-extrabold text-ink-900">No active loan</p>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-ink-500">
        Apply when you are eligible and officials open a meeting loan window.
      </p>
      {maxEligible != null && maxEligible > 0 ? (
        <p className="mt-3 text-xs font-semibold text-ink-600">
          You may borrow up to {money(maxEligible)}
        </p>
      ) : null}
      <Link to="/member/loans" className="mt-4 inline-block">
        <Button size="sm">Go to loans</Button>
      </Link>
    </section>
  );
}
