import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  FinanceMetric,
  LoanEmptyBlock,
  LoanRepaymentBlock,
} from "@/components/member/MemberFinancePrimitives";
import type { Loan, LoanEligibility, LoanStatement } from "@/types/loan";
import {
  formatDate,
  formatDateTime,
  money,
  normalizeStatus,
  percent,
  type DashboardMeeting,
  type MemberArrearsSummary,
  type MemberDashboardSummary,
} from "./MemberDashboardSections";

export function DashboardSlimHeader({
  summary,
}: {
  summary: MemberDashboardSummary;
}) {
  const goodStanding =
    summary.status === "ACTIVE" && summary.registrationFeePaid;

  return (
    <header className="border-b border-ink-100 pb-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
        Member home
      </p>
      <h1 className="mt-1 font-google text-xl font-extrabold tracking-tight text-ink-950 sm:text-2xl">
        Welcome, {summary.firstName || "Member"}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-ink-600">
          {summary.membershipNumber || "—"}
        </span>
        <span className="text-ink-300">·</span>
        <span className="text-xs text-ink-500">
          {goodStanding ? "Good standing" : "Review required"}
        </span>
        <Badge tone={summary.status === "ACTIVE" ? "success" : "warning"}>
          {normalizeStatus(summary.status)}
        </Badge>
        <Badge tone={summary.registrationFeePaid ? "success" : "warning"}>
          Registration {summary.registrationFeePaid ? "paid" : "pending"}
        </Badge>
      </div>
    </header>
  );
}

export function DashboardBalanceGrid({
  arrears,
}: {
  arrears: MemberArrearsSummary;
}) {
  const savings = arrears.weeklySavings;
  const share = arrears.shareCapital;

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FinanceMetric
        label="Weekly savings balance"
        value={money(savings.actual)}
        hint={
          savings.status === "PAID_CURRENT_WEEK"
            ? `${money(savings.currentWeekPaid ?? 0)} paid this week`
            : `${savings.unpaidPeriods ?? 0} past meeting(s) unpaid`
        }
      />
      <FinanceMetric
        label="Share capital total"
        value={money(share.actual)}
        hint="Ownership capital used for loan eligibility"
      />
    </section>
  );
}

export function DashboardLoanSection({
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
      <LoanEmptyBlock
        maxEligible={eligibility?.maxEligible}
        money={(n) => money(n)}
      />
    );
  }

  const disbursed = Number(
    loan.approvedAmount ?? loan.requestedAmount ?? statement?.disbursed ?? 0,
  );
  const totalDue =
    Number(statement?.disbursed ?? disbursed) +
    Number(statement?.totalInterest ?? 0) +
    Number(statement?.totalPenalties ?? 0);
  const repaid = Number(statement?.totalRepaid ?? 0);
  const outstanding = Number(
    statement?.outstanding ?? loan.outstandingPrincipal ?? 0,
  );
  const progress = percent(repaid, totalDue);

  return (
    <LoanRepaymentBlock
      loanNumber={loan.loanNumber}
      status={loan.status}
      outstanding={money(outstanding)}
      progress={progress}
      repaid={money(repaid)}
      totalDue={money(totalDue)}
      nextRepaymentDate={loan.nextInterestDate}
      formatDate={formatDate}
    />
  );
}

export function DashboardMeetingsPreview({
  meetings,
}: {
  meetings: DashboardMeeting[];
}) {
  const [nowMs] = useState(() => Date.now());

  const upcoming = useMemo(
    () =>
      meetings
        .filter((m) => new Date(m.meetingDate).getTime() >= nowMs)
        .sort(
          (a, b) =>
            new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime(),
        )
        .slice(0, 3),
    [meetings, nowMs],
  );

  return (
    <section className="rounded-lg border border-ink-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-extrabold text-ink-950">Upcoming meetings</h2>
        <Link
          to="/member/meetings"
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {upcoming.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-500 sm:px-5">
          No upcoming meetings scheduled.
        </p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {upcoming.map((meeting) => {
            const loanOpen = meeting.loanWindows?.some(
              (w) => w.status === "OPEN",
            );
            return (
              <li key={meeting.id}>
                <Link
                  to={`/member/meetings/${meeting.id}`}
                  className="flex flex-col gap-1 px-4 py-3 transition hover:bg-ink-50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-ink-900">
                      {meeting.title ||
                        meeting.meetingNumber ||
                        "Welfare meeting"}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {formatDateTime(meeting.meetingDate)}
                    </p>
                  </div>
                  <span className="shrink-0">
                  <Badge tone={loanOpen ? "success" : "neutral"}>
                    {loanOpen
                      ? "Loan window open"
                      : normalizeStatus(meeting.status)}
                  </Badge>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
