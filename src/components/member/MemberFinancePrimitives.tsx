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
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-ink-100 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-500">
        {label}
      </p>
      <p className="mt-1 font-google text-2xl font-extrabold tracking-tight text-ink-950">
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-xs leading-5 text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function RepaymentProgress({
  progress,
  repaidLabel,
  totalDueLabel,
  tone = "success",
  className,
}: {
  progress: number;
  repaidLabel: string;
  totalDueLabel: string;
  tone?: "success" | "warning" | "danger";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div className={clsx("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink-700">Repayment progress</span>
        <span className="text-sm font-extrabold text-ink-900">{clamped}% paid</span>
      </div>
      <input
        type="range"
        readOnly
        tabIndex={-1}
        aria-hidden
        value={clamped}
        className="pointer-events-none h-2 w-full cursor-default appearance-none rounded-full accent-brand-600 opacity-90"
      />
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-500",
            tone === "danger" && "bg-red-600",
            tone === "warning" && "bg-amber-500",
            tone === "success" && "bg-brand-600",
          )}
          style={{ width: `${clamped}%` }}
        />
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
      className={clsx(
        "rounded-lg border border-ink-100 bg-white p-4 shadow-sm",
        className,
      )}
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
  nextRepaymentDate,
  formatDate,
}: {
  loanNumber: string;
  status: string;
  outstanding: string;
  progress: number;
  repaid: string;
  totalDue: string;
  nextRepaymentDate?: string;
  formatDate: (v?: string) => string;
}) {
  const tone =
    status === "OVERDUE" || status === "DEFAULTED"
      ? "danger"
      : status === "PARTIALLY_PAID" || status === "IN_ROLLOVER"
        ? "warning"
        : "success";

  return (
    <section className="rounded-lg border border-ink-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 pb-4">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-500">
            Active loan
          </p>
          <p className="mt-1 font-google text-xl font-extrabold tracking-tight text-ink-950">
            {outstanding}
          </p>
          <p className="mt-0.5 text-xs text-ink-500">outstanding · {loanNumber}</p>
        </div>
        <Badge
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
      <div className="mt-4">
        <RepaymentProgress
          progress={progress}
          repaidLabel={`Repaid ${repaid}`}
          totalDueLabel={`Total due ${totalDue}`}
          tone={tone}
        />
      </div>
      {nextRepaymentDate ? (
        <p className="mt-3 text-xs text-ink-500">
          Next repayment: {formatDate(nextRepaymentDate)}
        </p>
      ) : null}
      <Link to="/member/loans" className="mt-4 inline-block">
        <Button variant="outline" size="sm">
          View loan details
        </Button>
      </Link>
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
    <section className="rounded-lg border border-dashed border-ink-200 bg-ink-50 p-5 text-center sm:p-6">
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
