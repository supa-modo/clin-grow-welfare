import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Landmark, PiggyBank, Shield } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MemberContributionsTrendChart } from "@/components/member/MemberContributionsTrendChart";
import {
  MemberAlertChips,
  MemberFundRow,
  MemberHeroCard,
  MemberQuickActions,
  MemberSectionCard,
  MemberWelcomeHeader,
} from "@/components/member/MemberPortalUi";
import {
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

function greetingForTime() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardSlimHeader({
  summary,
}: {
  summary: MemberDashboardSummary;
}) {
  const goodStanding =
    summary.status === "ACTIVE" && summary.registrationFeePaid;

  return (
    <MemberWelcomeHeader
      greeting={greetingForTime()}
      name={summary.firstName || "Member"}
      membershipNumber={summary.membershipNumber || "—"}
      statusLabel={goodStanding ? "Good standing" : "Review required"}
      avatarName={summary.name ?? summary.firstName}
    />
  );
}

export function DashboardPortfolioHero({
  summary,
  arrears,
}: {
  summary: MemberDashboardSummary;
  arrears: MemberArrearsSummary;
}) {
  const portfolioTotal =
    Number(summary.financialSummary.shareCapital ?? 0) +
    Number(summary.financialSummary.weeklySavings ?? 0) +
    Number(summary.financialSummary.welfareKitty ?? 0);

  const savings = arrears.weeklySavings;
  const trendLabel =
    savings.status === "PAID_CURRENT_WEEK"
      ? `${money(savings.currentWeekPaid ?? 0)} paid this week`
      : `${savings.unpaidPeriods ?? 0} unpaid meeting(s)`;

  return (
    <MemberHeroCard
      label="Portfolio balance"
      value={money(portfolioTotal)}
      hint="Share capital, weekly savings, and welfare kitty combined"
      trendLabel={trendLabel}
    />
  );
}

export function DashboardBalanceGrid({
  arrears,
}: {
  arrears: MemberArrearsSummary;
}) {
  const savings = arrears.weeklySavings;
  const share = arrears.shareCapital;
  const welfare = arrears.welfareKitty;

  return (
    <MemberSectionCard title="My funds" subtitle="Balances across your welfare accounts">
      <div className="space-y-2">
        <MemberFundRow
          icon={<PiggyBank className="h-5 w-5" />}
          title="Weekly savings"
          subtitle={
            savings.status === "PAID_CURRENT_WEEK"
              ? "Current week paid"
              : `${savings.unpaidPeriods ?? 0} past meeting(s) unpaid`
          }
          amount={money(savings.actual)}
          accent="primary"
        />
        <MemberFundRow
          icon={<Landmark className="h-5 w-5" />}
          title="Share capital"
          subtitle="Used for loan eligibility"
          amount={money(share.actual)}
          accent="secondary"
        />
        <MemberFundRow
          icon={<Shield className="h-5 w-5" />}
          title="Welfare kitty"
          subtitle={
            welfare.arrears > 0
              ? `${money(welfare.arrears)} in arrears`
              : "Up to date"
          }
          amount={money(welfare.actual)}
          accent="neutral"
        />
      </div>
    </MemberSectionCard>
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
    <MemberSectionCard
      title="Upcoming meetings"
      subtitle="Stay on top of welfare sessions and loan windows"
      action={
        <Link
          to="/member/meetings"
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      {upcoming.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-500">
          No upcoming meetings scheduled.
        </p>
      ) : (
        <ul className="divide-y divide-ink-100 rounded-xl border border-ink-100">
          {upcoming.map((meeting) => {
            const loanOpen = meeting.loanWindows?.some(
              (w) => w.status === "OPEN",
            );
            return (
              <li key={meeting.id}>
                <Link
                  to={`/member/meetings/${meeting.id}`}
                  className="flex flex-col gap-1 px-4 py-3 transition hover:bg-ink-50 sm:flex-row sm:items-center sm:justify-between"
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
    </MemberSectionCard>
  );
}

export function DashboardOverviewLayout({
  summary,
  arrears,
  alerts,
  activeLoan,
  loanStatement,
  eligibility,
  meetings,
}: {
  summary: MemberDashboardSummary;
  arrears: MemberArrearsSummary;
  alerts: Array<{ id: string; title: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }>;
  activeLoan: Loan | null;
  loanStatement: LoanStatement | null;
  eligibility: LoanEligibility | null;
  meetings: DashboardMeeting[];
}) {
  const goodStanding =
    summary.status === "ACTIVE" && summary.registrationFeePaid;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-6">
      <DashboardSlimHeader summary={summary} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={summary.status === "ACTIVE" ? "success" : "warning"}>
          {normalizeStatus(summary.status)}
        </Badge>
        <Badge tone={summary.registrationFeePaid ? "success" : "warning"}>
          Registration {summary.registrationFeePaid ? "paid" : "pending"}
        </Badge>
        {goodStanding ? (
          <span className="text-xs font-semibold text-primary-700">
            Member in good standing
          </span>
        ) : null}
      </div>

      <MemberAlertChips alerts={alerts} />

      <DashboardPortfolioHero summary={summary} arrears={arrears} />
      <MemberQuickActions />

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MemberContributionsTrendChart />
        </div>
        <div className="lg:col-span-2">
          <DashboardBalanceGrid arrears={arrears} />
        </div>
      </div>

      <DashboardLoanSection
        loan={activeLoan}
        statement={loanStatement}
        eligibility={eligibility}
      />

      <DashboardMeetingsPreview meetings={meetings} />

      {alerts.some((a) => a.tone === "warning" || a.tone === "danger") ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-amber-900">
            You have items that need attention.
          </p>
          <Link to="/member/contributions" className="mt-2 inline-block sm:mt-0">
            <Button variant="outline" size="sm">
              Review contributions
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
