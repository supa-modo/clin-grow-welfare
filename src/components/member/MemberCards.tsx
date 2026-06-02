import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { FiChevronRight } from "react-icons/fi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Loan } from "@/types/loan";
import type { LoanStatement } from "@/types/loan";

export function money(value: number) {
  return `KES ${Number(value ?? 0).toLocaleString()}`;
}

export function MemberHero({
  firstName,
  membershipNumber,
  status,
  registrationFeePaid,
  subtitle,
}: {
  firstName: string;
  membershipNumber: string;
  status: string;
  registrationFeePaid: boolean;
  subtitle?: string;
}) {
  const standing =
    status === "ACTIVE" && registrationFeePaid
      ? "In good standing"
      : "Action may be required";

  return (
    <section className="border-b border-slate-200 pb-6">
      <p className="text-xs font-semibold text-secondary-600">
        Member self-service portal
      </p>
      <h1 className="mt-1 font-google text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">
        Welcome, {firstName}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
        {subtitle ??
          "View your savings, loan status, contributions, and welfare account in one place."}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone={status === "ACTIVE" ? "success" : "warning"}>
          {status.replace(/_/g, " ")}
        </Badge>
        <Badge tone={registrationFeePaid ? "success" : "warning"}>
          Registration {registrationFeePaid ? "paid" : "pending"}
        </Badge>
        <span className="text-xs font-semibold text-gray-500">
          {membershipNumber} · {standing}
        </span>
      </div>
    </section>
  );
}

export function MemberQuickActionCard({
  title,
  description,
  icon,
  to,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  to: string;
}) {
  return (
    <Link
      to={to}
      className={clsx(
        "group relative flex h-full min-h-[7rem] flex-col rounded-xl border border-slate-200/95 p-4",
        "bg-gradient-to-br from-brand-700 to-brand-800 shadow-sm transition duration-200",
        "hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center text-amber-200">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold leading-snug text-amber-100">
        {title}
      </p>
      <p className="mt-1 flex-1 text-xs text-white/60">{description}</p>
      <FiChevronRight className="absolute bottom-4 right-4 h-5 w-5 text-white/50 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

export function MemberSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-primary-700">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-slate-600">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

const ACTIVE_LOAN_STATUSES = new Set([
  "ACTIVE",
  "PARTIALLY_PAID",
  "IN_ROLLOVER",
  "OVERDUE",
  "DEFAULTED",
  "DISBURSED",
  "AGREEMENT_PENDING",
  "READY_FOR_DISBURSEMENT",
]);

export function ActiveLoanProgress({
  loan,
  statement,
  onViewDetails,
}: {
  loan: Loan | null;
  statement: LoanStatement | null;
  onViewDetails?: () => void;
}) {
  if (!loan) {
    return (
      <MemberSection
        title="Active loan"
        description="You have no active loan on record."
      >
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm font-semibold text-slate-700">
            No active loan
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Apply for a loan when you are eligible and a meeting window is open.
          </p>
          <Link to="/member/loans" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">
              View loans
            </Button>
          </Link>
        </div>
      </MemberSection>
    );
  }

  const disbursed = statement?.disbursed ?? Number(loan.approvedAmount ?? loan.requestedAmount ?? 0);
  const totalDue =
    disbursed +
    Number(statement?.totalInterest ?? 0) +
    Number(statement?.totalPenalties ?? 0);
  const repaid = Number(statement?.totalRepaid ?? 0);
  const outstanding = Number(statement?.outstanding ?? loan.outstandingPrincipal ?? 0);
  const progress =
    totalDue > 0 ? Math.min(100, Math.round((repaid / totalDue) * 100)) : 0;

  return (
    <MemberSection
      title="Active loan repayment"
      description={`${loan.loanNumber} — track your repayment progress`}
      action={
        onViewDetails ? (
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            View details
          </Button>
        ) : (
          <Link to="/member/loans">
            <Button variant="outline" size="sm">
              Manage loan
            </Button>
          </Link>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-slate-900">
              {money(outstanding)} outstanding
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {loan.interestRate}% per month
              {loan.termWeeks ? ` · ${loan.termWeeks} weeks` : ""}
            </p>
          </div>
          <Badge
            tone={
              loan.status === "OVERDUE" || loan.status === "DEFAULTED"
                ? "danger"
                : "success"
            }
          >
            {loan.status.replace(/_/g, " ")}
          </Badge>
        </div>

        <div>
          <div className="mb-2 flex justify-between text-xs font-semibold text-slate-600">
            <span>Repayment progress</span>
            <span>{progress}% repaid</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[0.7rem] text-slate-500">
            <span>Repaid: {money(repaid)}</span>
            <span>Total due: {money(totalDue)}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <InfoPill label="Disbursed" value={money(disbursed)} />
          <InfoPill label="Interest accrued" value={money(statement?.totalInterest ?? 0)} />
          <InfoPill label="Penalties" value={money(statement?.totalPenalties ?? 0)} />
        </div>
      </div>
    </MemberSection>
  );
}

export function InfoPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

export function findActiveLoan(loans: Loan[]): Loan | null {
  return (
    loans.find((l) => ACTIVE_LOAN_STATUSES.has(l.status)) ??
    loans.find((l) =>
      ["SUBMITTED", "PENDING_MEETING_APPROVAL", "APPROVED"].includes(l.status),
    ) ??
    null
  );
}

export function SetupState({
  title,
  message,
  loading,
}: {
  title: string;
  message: string;
  loading?: boolean;
}) {
  return (
    <div className="grid min-h-[50vh] place-items-center px-4">
      <div className="max-w-md text-center">
        {loading ? (
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        ) : null}
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
      </div>
    </div>
  );
}
