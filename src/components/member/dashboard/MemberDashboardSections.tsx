/* eslint-disable react-refresh/only-export-components */
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileText,
  HandCoins,
  HelpCircle,
  Landmark,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  UserRoundCog,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Contribution } from "@/types/contribution";
import type { Loan, LoanEligibility, LoanRepayment, LoanStatement } from "@/types/loan";

export type DashboardTone = "success" | "warning" | "danger" | "info" | "neutral";

export type DashboardAlert = {
  id: string;
  title: string;
  message: string;
  tone: DashboardTone;
  date?: string;
};

export type DashboardMeeting = {
  id: string;
  meetingNumber?: string;
  title?: string;
  status?: string;
  meetingDate: string;
  location?: string;
  agenda?: string;
  attendance?: Array<{ attendanceStatus?: string }>;
  apologies?: Array<{ id: string }>;
  loanWindows?: Array<{ id: string; status: string }>;
};

export type DashboardNotification = {
  id: string;
  title: string;
  body: string;
  status: string;
  notificationType?: string;
  severity?: string;
  createdAt: string;
};

export type DashboardActivity = {
  id: string;
  title: string;
  description: string;
  date: string;
  tone: DashboardTone;
  icon: ReactNode;
};

export type MemberDashboardSummary = {
  id: string;
  firstName: string;
  lastName?: string;
  name?: string;
  membershipNumber: string;
  status: string;
  registrationFeePaid: boolean;
  dateJoined: string;
  approvedAt?: string;
  membershipDuration?: { days?: number; months?: number; years?: number };
  financialSummary: {
    shareCapital: number;
    weeklySavings: number;
    welfareKitty: number;
    loanEligibilityBase: number;
    activeLoanBalance: number;
    finesBalance: number;
  };
};

export type ContributionArrears = {
  expected: number;
  actual: number;
  arrears: number;
};

export type MemberArrearsSummary = {
  shareCapital: ContributionArrears;
  weeklySavings: ContributionArrears;
  welfareKitty: ContributionArrears;
};

export const MIN_WEEKLY_SAVINGS_FALLBACK = 250;
export const SHARE_CAPITAL_CAP_FALLBACK = 5000;

export function money(value: number | string | undefined | null) {
  return `KES ${Number(value ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

export function formatDate(value?: string) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value?: string) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function percent(actual: number, expected: number) {
  if (expected <= 0) return actual > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((actual / expected) * 100)));
}

export function normalizeStatus(status?: string) {
  return (status || "PENDING").replace(/_/g, " ");
}

export const activeLoanStatuses = new Set([
  "ACTIVE",
  "PARTIALLY_PAID",
  "IN_ROLLOVER",
  "OVERDUE",
  "DEFAULTED",
  "DISBURSED",
  "AGREEMENT_PENDING",
  "READY_FOR_DISBURSEMENT",
]);

export function findActiveLoan(loans: Loan[]) {
  return (
    loans.find((loan) => activeLoanStatuses.has(loan.status)) ??
    loans.find((loan) =>
      ["SUBMITTED", "UNDER_REVIEW", "PENDING_MEETING_APPROVAL", "APPROVED"].includes(
        loan.status,
      ),
    ) ??
    null
  );
}

export function DashboardShell({
  loading,
  error,
  children,
}: {
  loading?: boolean;
  error?: string;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <div className="grid min-h-[58vh] place-items-center rounded-lg border border-ink-100 bg-white px-4 text-center shadow-sm">
        <div>
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <h2 className="text-base font-extrabold text-ink-900">Loading your member home</h2>
          <p className="mt-2 max-w-sm text-sm text-ink-500">
            Gathering your savings, loan position, meetings, and notices.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-[58vh] place-items-center rounded-lg border border-red-100 bg-red-50 px-4 text-center">
        <div>
          <AlertCircle className="mx-auto h-10 w-10 text-red-600" />
          <h2 className="mt-4 text-base font-extrabold text-red-950">Dashboard unavailable</h2>
          <p className="mt-2 max-w-sm text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function MemberWelcomeCard({
  summary,
  contributionPeriod,
}: {
  summary: MemberDashboardSummary;
  contributionPeriod: string;
}) {
  const year = new Date().getFullYear();
  const goodStanding = summary.status === "ACTIVE" && summary.registrationFeePaid;

  return (
    <section className="overflow-hidden rounded-lg border border-ink-100 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1fr_22rem]">
        <div className="relative p-5 sm:p-6">
          <div className="absolute inset-y-0 left-0 w-1 bg-brand-600" />
          <p className="text-xs font-extrabold uppercase tracking-wide text-brand-700">
            Member portal home
          </p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-google text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Welcome back, {summary.firstName || "Member"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
                Your welfare account, contribution progress, loans, and group notices in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={summary.status === "ACTIVE" ? "success" : "warning"}>
                {normalizeStatus(summary.status)}
              </Badge>
              <Badge tone={summary.registrationFeePaid ? "success" : "warning"}>
                Registration {summary.registrationFeePaid ? "paid" : "pending"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="border-t border-ink-100 bg-ink-50 p-5 lg:border-l lg:border-t-0">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <SummaryTerm label="Member no." value={summary.membershipNumber || "Pending"} />
            <SummaryTerm label="Standing" value={goodStanding ? "Good" : "Review"} />
            <SummaryTerm label="Year" value={String(year)} />
            <SummaryTerm label="Period" value={contributionPeriod} />
          </dl>
        </div>
      </div>
    </section>
  );
}

function SummaryTerm({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-3">
      <dt className="text-[0.7rem] font-bold uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-1 truncate text-sm font-extrabold text-ink-900">{value}</dd>
    </div>
  );
}

export function MobileFinancialCard({
  weeklySavings,
  shareCapital,
  welfareKitty,
  activeLoanBalance,
  outstandingTotal,
  completion,
}: {
  weeklySavings: number;
  shareCapital: number;
  welfareKitty: number;
  activeLoanBalance: number;
  outstandingTotal: number;
  completion: number;
}) {
  return (
    <section className="md:hidden rounded-lg border border-brand-800 bg-ink-950 p-5 text-white shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-200">Financial summary</p>
          <p className="mt-2 text-2xl font-black">{money(weeklySavings)}</p>
          <p className="text-xs text-white/65">Weekly savings balance</p>
        </div>
        <WalletCards className="h-8 w-8 text-brand-200" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <MiniBankStat label="Share capital" value={money(shareCapital)} />
        <MiniBankStat label="Welfare kitty" value={money(welfareKitty)} />
        <MiniBankStat label="Active loan" value={money(activeLoanBalance)} />
        <MiniBankStat label="Outstanding" value={money(outstandingTotal)} />
      </div>
      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs font-bold text-white/75">
          <span>Contribution progress</span>
          <span>{completion}%</span>
        </div>
        <ProgressBar value={completion} tone="success" dark />
      </div>
    </section>
  );
}

function MiniBankStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.68rem] font-bold uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-1 font-extrabold text-white">{value}</p>
    </div>
  );
}

export function FinancialSummaryCards({
  cards,
}: {
  cards: Array<{
    label: string;
    value: string;
    helper: string;
    icon: ReactNode;
    tone: DashboardTone;
    status?: string;
  }>;
}) {
  return (
    <section className="hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-lg border border-ink-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div
              className={clsx(
                "grid h-10 w-10 place-items-center rounded-lg border",
                card.tone === "success" && "border-green-100 bg-green-50 text-green-700",
                card.tone === "warning" && "border-amber-100 bg-amber-50 text-amber-700",
                card.tone === "danger" && "border-red-100 bg-red-50 text-red-700",
                card.tone === "info" && "border-blue-100 bg-blue-50 text-blue-700",
                card.tone === "neutral" && "border-ink-100 bg-ink-50 text-ink-700",
              )}
            >
              {card.icon}
            </div>
            {card.status ? (
              <span className="rounded-full border border-ink-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-ink-500">
                {card.status}
              </span>
            ) : null}
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-500">{card.label}</p>
          <p className="mt-1 text-xl font-black text-ink-950">{card.value}</p>
          <p className="mt-1 text-xs leading-5 text-ink-500">{card.helper}</p>
        </article>
      ))}
    </section>
  );
}

export function AlertStrip({ alerts }: { alerts: DashboardAlert[] }) {
  const urgent = alerts.find((alert) => alert.tone === "danger" || alert.tone === "warning");
  if (!urgent) return null;

  return (
    <div
      className={clsx(
        "flex flex-col gap-3 rounded-lg border px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        urgent.tone === "danger"
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-amber-200 bg-amber-50 text-amber-900",
      )}
    >
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-extrabold">{urgent.title}</p>
          <p className="text-sm opacity-80">{urgent.message}</p>
        </div>
      </div>
      <Link to="/member/contributions">
        <Button variant="secondary" size="sm">Review</Button>
      </Link>
    </div>
  );
}

export function ContributionProgressCard({
  arrears,
  recentContributions,
}: {
  arrears: MemberArrearsSummary;
  recentContributions: Contribution[];
}) {
  const savings = arrears.weeklySavings;
  const progress = percent(savings.actual, savings.expected);
  const expectedWeeks = Math.max(0, Math.ceil(savings.expected / MIN_WEEKLY_SAVINGS_FALLBACK));
  const paidWeeks = Math.max(0, Math.floor(savings.actual / MIN_WEEKLY_SAVINGS_FALLBACK));
  const state =
    savings.expected <= 0 && savings.actual <= 0
      ? "No contributions yet"
      : savings.arrears <= 0
        ? "Fully up to date"
        : "Partially behind";

  return (
    <DashboardPanel
      title="Weekly contributions"
      description="Savings progress for the current financial year"
      icon={<PiggyBank className="h-4 w-4" />}
      action={<Badge tone={state === "Fully up to date" ? "success" : state === "Partially behind" ? "warning" : "neutral"}>{state}</Badge>}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_15rem]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-black text-ink-950">{progress}%</p>
              <p className="mt-1 text-sm text-ink-500">
                {paidWeeks} paid weeks against {expectedWeeks} expected weeks
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-extrabold text-ink-900">{money(savings.actual)}</p>
              <p className="text-xs text-ink-500">of {money(savings.expected)} expected</p>
            </div>
          </div>
          <div className="mt-5">
            <ProgressBar value={progress} tone={savings.arrears > 0 ? "warning" : "success"} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MetricPill label="Paid" value={money(savings.actual)} />
            <MetricPill label="Expected" value={money(savings.expected)} />
            <MetricPill label="Behind" value={money(savings.arrears)} tone={savings.arrears > 0 ? "warning" : "success"} />
          </div>
        </div>
        <RecentContributionList contributions={recentContributions} />
      </div>
    </DashboardPanel>
  );
}

function RecentContributionList({ contributions }: { contributions: Contribution[] }) {
  const weekly = contributions.filter((item) => item.contributionType === "WEEKLY_SAVINGS").slice(0, 4);

  if (weekly.length === 0) {
    return (
      <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-ink-200 bg-ink-50 p-4 text-center">
        <div>
          <ReceiptText className="mx-auto h-7 w-7 text-ink-400" />
          <p className="mt-2 text-sm font-bold text-ink-700">No weekly records yet</p>
          <p className="mt-1 text-xs text-ink-500">Posted weekly savings will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-ink-100 bg-ink-50 p-3">
      <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-500">Recent records</p>
      <div className="space-y-2">
        {weekly.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
            <div>
              <p className="text-sm font-extrabold text-ink-900">{money(item.amount)}</p>
              <p className="text-xs text-ink-500">{formatDate(item.periodDate)}</p>
            </div>
            <Badge tone={item.status === "POSTED" ? "success" : "warning"}>{item.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShareCapitalCard({ arrears }: { arrears: MemberArrearsSummary }) {
  const actual = arrears.shareCapital.actual;
  const target = Math.max(SHARE_CAPITAL_CAP_FALLBACK, actual);
  const progress = percent(actual, target);

  return (
    <DashboardPanel
      title="Share capital"
      description="Permanent capital that strengthens your borrowing base"
      icon={<Landmark className="h-4 w-4" />}
    >
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Current balance</p>
            <p className="mt-1 text-2xl font-black text-ink-950">{money(actual)}</p>
          </div>
          <ShieldCheck className="h-8 w-8 text-blue-700" />
        </div>
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-xs font-bold text-blue-900">
            <span>Progress to annual cap</span>
            <span>{progress}%</span>
          </div>
          <ProgressBar value={progress} tone="info" />
        </div>
        <p className="mt-4 text-sm leading-6 text-blue-900/80">
          Share capital is your member ownership stake. It is used in the loan eligibility base and is kept separate from weekly savings.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetricPill label="Reference cap" value={money(target)} />
          <MetricPill label="Annual gap" value={money(Math.max(0, target - actual))} />
        </div>
      </div>
    </DashboardPanel>
  );
}

export function ActiveLoanCard({
  loan,
  statement,
  eligibility,
}: {
  loan: Loan | null;
  statement: LoanStatement | null;
  eligibility: LoanEligibility | null;
}) {
  if (!loan) {
    return (
      <DashboardPanel
        title="Active loan"
        description="No active loan is currently attached to your member account"
        icon={<HandCoins className="h-4 w-4" />}
      >
        <div className="rounded-lg border border-dashed border-ink-200 bg-ink-50 p-6 text-center">
          <HelpCircle className="mx-auto h-9 w-9 text-ink-400" />
          <p className="mt-3 text-base font-extrabold text-ink-900">No active loan</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500">
            You can apply when you are eligible and officials open a meeting loan window.
          </p>
          {eligibility ? (
            <div className="mx-auto mt-4 grid max-w-md gap-3 sm:grid-cols-2">
              <MetricPill label="Maximum eligible" value={money(eligibility.maxEligible)} />
              <MetricPill label="Eligibility base" value={money(eligibility.baseAmount)} />
            </div>
          ) : null}
          <Link to="/member/loans" className="mt-5 inline-flex">
            <Button icon={<ArrowRight className="h-4 w-4" />}>
              Apply for Loan
            </Button>
          </Link>
        </div>
      </DashboardPanel>
    );
  }

  const principal = Number(loan.approvedAmount ?? loan.requestedAmount ?? statement?.disbursed ?? 0);
  const totalDue = Number(statement?.disbursed ?? principal) + Number(statement?.totalInterest ?? 0) + Number(statement?.totalPenalties ?? 0);
  const repaid = Number(statement?.totalRepaid ?? 0);
  const outstanding = Number(statement?.outstanding ?? loan.outstandingPrincipal ?? 0);
  const progress = percent(repaid, totalDue);
  const recentRepayments = [...(loan.repayments ?? [])]
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 4);

  return (
    <DashboardPanel
      title="Active loan overview"
      description={`${loan.loanNumber} repayment position`}
      icon={<HandCoins className="h-4 w-4" />}
      action={<LoanStatusBadge status={loan.status} />}
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricPill label="Principal/full amount" value={money(principal)} />
          <MetricPill label="Amount repaid" value={money(repaid)} tone="success" />
          <MetricPill label="Outstanding" value={money(outstanding)} tone={outstanding > 0 ? "warning" : "success"} />
          <MetricPill label="Interest/rate" value={`${money(statement?.totalInterest ?? 0)} / ${loan.interestRate}%`} />
        </div>
        <div className="rounded-lg border border-ink-100 bg-ink-50 p-4">
          <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm font-extrabold text-ink-800">
            <span>Repayment progress</span>
            <span>{progress}% repaid</span>
          </div>
          <ProgressBar value={progress} tone={loan.status === "OVERDUE" || loan.status === "DEFAULTED" ? "danger" : "success"} />
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs font-semibold text-ink-500">
            <span>Total due: {money(totalDue)}</span>
            <span>Next repayment date: {formatDate(loan.nextInterestDate)}</span>
          </div>
        </div>
        <RepaymentTimeline repayments={recentRepayments} />
      </div>
    </DashboardPanel>
  );
}

function RepaymentTimeline({ repayments }: { repayments: LoanRepayment[] }) {
  if (repayments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ink-200 bg-white p-4 text-sm text-ink-500">
        No repayments have been posted for this loan yet.
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-ink-500">Latest repayments</p>
      <div className="space-y-3">
        {repayments.map((repayment) => (
          <div key={repayment.id} className="flex items-start gap-3">
            <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-green-50 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 border-b border-ink-100 pb-3 last:border-b-0">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-extrabold text-ink-900">{money(repayment.amount)}</p>
                <p className="text-xs font-semibold text-ink-500">{formatDate(repayment.paymentDate)}</p>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                Principal {money(repayment.principalPaid)} · Interest {money(repayment.interestPaid)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuickActionsPanel() {
  const actions = [
    { title: "Make Contribution", description: "Record or review payment options", to: "/member/contributions", icon: <CreditCard /> },
    { title: "Contribution History", description: "Receipts and posted records", to: "/member/contributions", icon: <ReceiptText /> },
    { title: "Apply for Loan", description: "Eligibility and application", to: "/member/loans", icon: <HandCoins /> },
    { title: "Loan History", description: "Applications and statements", to: "/member/loans", icon: <FileText /> },
    { title: "Download Statement", description: "Savings and loan reports", to: "/member/statements", icon: <Download /> },
    { title: "Update Profile", description: "Contacts and dependants", to: "/member/profile", icon: <UserRoundCog /> },
    { title: "Welfare Rules", description: "Constitution and policies", to: "/member/constitution", icon: <BookOpen /> },
    { title: "Contact Treasurer", description: "Send a support request", to: "/member/notifications", icon: <Bell /> },
  ];

  return (
    <DashboardPanel title="Quick actions" description="Common member tasks" icon={<WalletCards className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            key={action.title}
            to={action.to}
            className="group rounded-lg border border-ink-100 bg-white p-3 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-ink-100 bg-ink-50 text-brand-700 group-hover:border-brand-100 group-hover:bg-white">
                {action.icon}
              </span>
              <ArrowRight className="h-4 w-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
            </div>
            <p className="mt-3 text-sm font-extrabold leading-tight text-ink-900">{action.title}</p>
            <p className="mt-1 text-xs leading-4 text-ink-500">{action.description}</p>
          </Link>
        ))}
      </div>
    </DashboardPanel>
  );
}

export function UpcomingMeetingsCard({ meetings }: { meetings: DashboardMeeting[] }) {
  const [nowMs] = useState(() => Date.now());
  const upcoming = meetings
    .filter((meeting) => new Date(meeting.meetingDate).getTime() >= nowMs)
    .sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime())
    .slice(0, 3);

  return (
    <DashboardPanel
      title="Upcoming meetings"
      description="Welfare meetings and loan windows"
      icon={<CalendarDays className="h-4 w-4" />}
      action={<Link className="text-xs font-extrabold text-brand-700 hover:underline" to="/member/meetings">View all</Link>}
    >
      {upcoming.length === 0 ? (
        <EmptyMini icon={<CalendarDays className="h-7 w-7" />} title="No upcoming meetings" message="New meeting notices will appear here once scheduled." />
      ) : (
        <div className="space-y-3">
          {upcoming.map((meeting) => {
            const attendance = meeting.attendance?.[0]?.attendanceStatus;
            const loanWindowOpen = meeting.loanWindows?.some((window) => window.status === "OPEN");
            return (
              <article key={meeting.id} className="rounded-lg border border-ink-100 bg-ink-50 p-3">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-ink-900">{meeting.title || meeting.meetingNumber || "Welfare meeting"}</p>
                    <p className="mt-1 text-xs font-semibold text-ink-500">{formatDateTime(meeting.meetingDate)}</p>
                  </div>
                  <Badge tone={loanWindowOpen ? "success" : "neutral"}>{loanWindowOpen ? "Loan window" : normalizeStatus(meeting.status)}</Badge>
                </div>
                {meeting.agenda ? <p className="mt-2 line-clamp-2 text-sm text-ink-600">{meeting.agenda}</p> : null}
                <p className="mt-2 text-xs font-semibold text-ink-500">
                  RSVP/status: {attendance || (meeting.apologies?.length ? "Apology submitted" : "Pending")}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </DashboardPanel>
  );
}

export function MemberAlertsCard({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <DashboardPanel title="Alerts" description="Notices needing attention" icon={<Bell className="h-4 w-4" />}>
      {alerts.length === 0 ? (
        <EmptyMini icon={<CheckCircle2 className="h-7 w-7" />} title="No alerts" message="You are clear for now." />
      ) : (
        <div className="space-y-3">
          {alerts.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              className={clsx(
                "rounded-lg border p-3",
                alert.tone === "danger" && "border-red-100 bg-red-50",
                alert.tone === "warning" && "border-amber-100 bg-amber-50",
                alert.tone === "success" && "border-green-100 bg-green-50",
                alert.tone === "info" && "border-blue-100 bg-blue-50",
                alert.tone === "neutral" && "border-ink-100 bg-ink-50",
              )}
            >
              <div className="flex gap-3">
                <AlertIcon tone={alert.tone} />
                <div>
                  <p className="text-sm font-extrabold text-ink-900">{alert.title}</p>
                  <p className="mt-1 text-xs leading-5 text-ink-600">{alert.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardPanel>
  );
}

export function RecentActivityFeed({ activities }: { activities: DashboardActivity[] }) {
  return (
    <DashboardPanel title="Recent activity" description="Latest account movements" icon={<Clock3 className="h-4 w-4" />}>
      {activities.length === 0 ? (
        <EmptyMini icon={<ReceiptText className="h-7 w-7" />} title="No recent activity" message="Your latest contributions, loan updates, and receipts will show here." />
      ) : (
        <div className="space-y-4">
          {activities.slice(0, 8).map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <div
                className={clsx(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full border",
                  activity.tone === "success" && "border-green-100 bg-green-50 text-green-700",
                  activity.tone === "warning" && "border-amber-100 bg-amber-50 text-amber-700",
                  activity.tone === "danger" && "border-red-100 bg-red-50 text-red-700",
                  activity.tone === "info" && "border-blue-100 bg-blue-50 text-blue-700",
                  activity.tone === "neutral" && "border-ink-100 bg-ink-50 text-ink-600",
                )}
              >
                {activity.icon}
              </div>
              <div className="min-w-0 flex-1 border-b border-ink-100 pb-4 last:border-b-0">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-extrabold text-ink-900">{activity.title}</p>
                  <p className="text-xs font-semibold text-ink-400">{formatDate(activity.date)}</p>
                </div>
                <p className="mt-1 text-sm leading-5 text-ink-500">{activity.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardPanel>
  );
}

export function buildActivities({
  contributions,
  loans,
  meetings,
  notifications,
}: {
  contributions: Contribution[];
  loans: Loan[];
  meetings: DashboardMeeting[];
  notifications: DashboardNotification[];
}): DashboardActivity[] {
  const contributionActivities = contributions.slice(0, 5).map((item) => ({
    id: `contribution-${item.id}`,
    title: `${item.contributionType.replace(/_/g, " ")} received`,
    description: `${money(item.amount)} posted via ${item.paymentMethod}${item.receiptNo ? ` · Receipt ${item.receiptNo}` : ""}`,
    date: item.periodDate,
    tone: "success" as const,
    icon: <ReceiptText className="h-4 w-4" />,
  }));

  const loanActivities = loans.slice(0, 4).map((loan) => ({
    id: `loan-${loan.id}`,
    title: `Loan ${normalizeStatus(loan.status).toLowerCase()}`,
    description: `${loan.loanNumber} · Requested ${money(loan.requestedAmount)}`,
    date: loan.createdAt ?? loan.applicationDate,
    tone: loan.status === "REJECTED" ? "danger" as const : loan.status === "CLOSED" ? "success" as const : "info" as const,
    icon: <HandCoins className="h-4 w-4" />,
  }));

  const meetingActivities = meetings.slice(0, 3).map((meeting) => ({
    id: `meeting-${meeting.id}`,
    title: "Meeting scheduled",
    description: meeting.title || meeting.meetingNumber || "Welfare meeting notice",
    date: meeting.meetingDate,
    tone: "neutral" as const,
    icon: <CalendarDays className="h-4 w-4" />,
  }));

  const notificationActivities = notifications.slice(0, 3).map((item) => ({
    id: `notification-${item.id}`,
    title: item.title,
    description: item.body,
    date: item.createdAt,
    tone: "info" as const,
    icon: <Bell className="h-4 w-4" />,
  }));

  return [...contributionActivities, ...loanActivities, ...meetingActivities, ...notificationActivities]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function buildAlerts({
  summary,
  arrears,
  activeLoan,
  statement,
  meetings,
  notifications,
}: {
  summary: MemberDashboardSummary;
  arrears: MemberArrearsSummary;
  activeLoan: Loan | null;
  statement: LoanStatement | null;
  meetings: DashboardMeeting[];
  notifications: DashboardNotification[];
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  if (!summary.registrationFeePaid) {
    alerts.push({
      id: "registration",
      title: "Registration fee pending",
      message: "Please clear your registration fee to keep your membership in good standing.",
      tone: "danger",
    });
  }

  if (arrears.weeklySavings.arrears > 0) {
    alerts.push({
      id: "weekly-arrears",
      title: "Weekly savings behind",
      message: `${money(arrears.weeklySavings.arrears)} is currently behind the expected savings position.`,
      tone: "warning",
    });
  }

  if (activeLoan && Number(statement?.outstanding ?? activeLoan.outstandingPrincipal ?? 0) > 0) {
    alerts.push({
      id: "loan-repayment",
      title: activeLoan.status === "OVERDUE" || activeLoan.status === "DEFAULTED" ? "Loan repayment overdue" : "Upcoming loan repayment",
      message: `${activeLoan.loanNumber} has ${money(statement?.outstanding ?? activeLoan.outstandingPrincipal ?? 0)} outstanding.`,
      tone: activeLoan.status === "OVERDUE" || activeLoan.status === "DEFAULTED" ? "danger" : "info",
      date: activeLoan.nextInterestDate,
    });
  }

  const nextMeeting = meetings
    .filter((meeting) => new Date(meeting.meetingDate).getTime() >= Date.now())
    .sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime())[0];
  if (nextMeeting) {
    alerts.push({
      id: `meeting-${nextMeeting.id}`,
      title: "Upcoming welfare meeting",
      message: `${nextMeeting.title || nextMeeting.meetingNumber || "Meeting"} is scheduled for ${formatDateTime(nextMeeting.meetingDate)}.`,
      tone: "info",
    });
  }

  notifications.slice(0, 3).forEach((notification) => {
    alerts.push({
      id: `notification-${notification.id}`,
      title: notification.title,
      message: notification.body,
      tone: notification.severity === "ERROR" ? "danger" : notification.severity === "WARNING" ? "warning" : "info",
      date: notification.createdAt,
    });
  });

  return alerts;
}

function DashboardPanel({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-ink-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-ink-100 pb-4">
        <div className="flex gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
            {icon}
          </div>
          <div>
            <h2 className="text-base font-extrabold text-ink-950">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-5 text-ink-500">{description}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function MetricPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: DashboardTone;
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border p-3",
        tone === "success" && "border-green-100 bg-green-50",
        tone === "warning" && "border-amber-100 bg-amber-50",
        tone === "danger" && "border-red-100 bg-red-50",
        tone === "info" && "border-blue-100 bg-blue-50",
        tone === "neutral" && "border-ink-100 bg-white",
      )}
    >
      <p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 truncate text-sm font-extrabold text-ink-900">{value}</p>
    </div>
  );
}

function ProgressBar({
  value,
  tone = "success",
  dark,
}: {
  value: number;
  tone?: DashboardTone;
  dark?: boolean;
}) {
  return (
    <div className={clsx("h-3 overflow-hidden rounded-full", dark ? "bg-white/15" : "bg-ink-100")}>
      <div
        className={clsx(
          "h-full rounded-full transition-all duration-500",
          tone === "success" && "bg-green-600",
          tone === "warning" && "bg-amber-500",
          tone === "danger" && "bg-red-600",
          tone === "info" && "bg-blue-600",
          tone === "neutral" && "bg-ink-500",
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function LoanStatusBadge({ status }: { status: string }) {
  const tone =
    status === "CLOSED"
      ? "success"
      : status === "REJECTED" || status === "DEFAULTED" || status === "OVERDUE"
        ? "danger"
        : status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "PENDING_MEETING_APPROVAL"
          ? "warning"
          : "success";

  return <Badge tone={tone}>{normalizeStatus(status)}</Badge>;
}

function AlertIcon({ tone }: { tone: DashboardTone }) {
  if (tone === "success") return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />;
  if (tone === "warning") return <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />;
  if (tone === "danger") return <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />;
  if (tone === "info") return <Bell className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />;
  return <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />;
}

function EmptyMini({
  icon,
  title,
  message,
}: {
  icon: ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-ink-200 bg-ink-50 p-5 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white text-ink-400">{icon}</div>
      <p className="mt-3 text-sm font-extrabold text-ink-800">{title}</p>
      <p className="mt-1 text-xs leading-5 text-ink-500">{message}</p>
    </div>
  );
}

export const summaryIcons = {
  weekly: <PiggyBank className="h-5 w-5" />,
  expected: <CalendarDays className="h-5 w-5" />,
  completion: <CheckCircle2 className="h-5 w-5" />,
  share: <Landmark className="h-5 w-5" />,
  welfare: <WalletCards className="h-5 w-5" />,
  loan: <HandCoins className="h-5 w-5" />,
  repayment: <Banknote className="h-5 w-5" />,
  outstanding: <AlertCircle className="h-5 w-5" />,
};
