import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { contributionApi } from "@/services/contributionApi";
import { loanApi } from "@/services/loanApi";
import { memberPortalApi } from "@/services/memberApi";
import type { Contribution, MemberArrears } from "@/types/contribution";
import type { Loan, LoanEligibility, LoanStatement } from "@/types/loan";
import {
  ActiveLoanCard,
  AlertStrip,
  ContributionProgressCard,
  DashboardShell,
  FinancialSummaryCards,
  MemberAlertsCard,
  MemberWelcomeCard,
  MobileFinancialCard,
  QuickActionsPanel,
  RecentActivityFeed,
  ShareCapitalCard,
  UpcomingMeetingsCard,
  buildActivities,
  buildAlerts,
  findActiveLoan,
  formatDate,
  money,
  percent,
  summaryIcons,
  type DashboardMeeting,
  type DashboardNotification,
  type MemberDashboardSummary,
  type MemberArrearsSummary,
} from "@/components/member/dashboard/MemberDashboardSections";

const emptyArrears: MemberArrearsSummary = {
  shareCapital: { expected: 0, actual: 0, arrears: 0 },
  weeklySavings: { expected: 0, actual: 0, arrears: 0 },
  welfareKitty: { expected: 0, actual: 0, arrears: 0 },
};

type DashboardState = {
  summary: MemberDashboardSummary | null;
  arrears: MemberArrearsSummary;
  contributions: Contribution[];
  loans: Loan[];
  activeLoan: Loan | null;
  loanStatement: LoanStatement | null;
  eligibility: LoanEligibility | null;
  meetings: DashboardMeeting[];
  notifications: DashboardNotification[];
};

function normalizeArrears(
  arrears: MemberArrears | undefined,
  summary: MemberDashboardSummary,
): MemberArrearsSummary {
  return {
    shareCapital: {
      expected: Number(arrears?.shareCapital.expected ?? 0),
      actual: Number(arrears?.shareCapital.actual ?? summary.financialSummary.shareCapital ?? 0),
      arrears: Number(arrears?.shareCapital.arrears ?? 0),
    },
    weeklySavings: {
      expected: Number(arrears?.weeklySavings.expected ?? 0),
      actual: Number(arrears?.weeklySavings.actual ?? summary.financialSummary.weeklySavings ?? 0),
      arrears: Number(arrears?.weeklySavings.arrears ?? 0),
    },
    welfareKitty: {
      expected: Number(arrears?.welfareKitty.expected ?? 0),
      actual: Number(arrears?.welfareKitty.actual ?? summary.financialSummary.welfareKitty ?? 0),
      arrears: Number(arrears?.welfareKitty.arrears ?? 0),
    },
  };
}

function contributionPeriodLabel(summary: MemberDashboardSummary | null) {
  const now = new Date();
  const start = new Date(summary?.approvedAt ?? summary?.dateJoined ?? now);
  const activeFrom = start > now ? now : start;
  return `${formatDate(activeFrom.toISOString())} - ${formatDate(now.toISOString())}`;
}

function nextRepaymentValue(activeLoan: Loan | null, statement: LoanStatement | null) {
  if (!activeLoan) return { amount: 0, date: "" };
  const outstanding = Number(statement?.outstanding ?? activeLoan.outstandingPrincipal ?? 0);
  const estimatedWeekly = activeLoan.termWeeks
    ? Math.ceil(outstanding / Math.max(1, activeLoan.termWeeks))
    : outstanding;
  return {
    amount: Math.max(0, estimatedWeekly),
    date: activeLoan.nextInterestDate ?? "",
  };
}

export function MemberDashboardPage() {
  const [state, setState] = useState<DashboardState>({
    summary: null,
    arrears: emptyArrears,
    contributions: [],
    loans: [],
    activeLoan: null,
    loanStatement: null,
    eligibility: null,
    meetings: [],
    notifications: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const summary = (await memberPortalApi.dashboard()) as MemberDashboardSummary;

        const [arrearsResult, contributionsResult, loansResult, eligibilityResult, meetingsResult, notificationsResult] =
          await Promise.allSettled([
            contributionApi.myArrears(),
            contributionApi.myContributions({ page: 1, pageSize: 12 }),
            loanApi.myLoans(),
            loanApi.myEligibility(),
            api.get<{ meetings: DashboardMeeting[] }>("/member-portal/meetings"),
            api.get<{ notifications: DashboardNotification[] }>("/notifications", {
              params: { status: "UNREAD" },
            }),
          ]);

        const arrears =
          arrearsResult.status === "fulfilled"
            ? normalizeArrears(arrearsResult.value.arrears, summary)
            : normalizeArrears(undefined, summary);
        const contributions =
          contributionsResult.status === "fulfilled" ? contributionsResult.value.data ?? [] : [];
        const loans = loansResult.status === "fulfilled" ? loansResult.value ?? [] : [];
        const activeLoan = findActiveLoan(loans);
        const eligibility = eligibilityResult.status === "fulfilled" ? eligibilityResult.value : null;
        const meetings = meetingsResult.status === "fulfilled" ? meetingsResult.value.data.meetings ?? [] : [];
        const notifications =
          notificationsResult.status === "fulfilled" ? notificationsResult.value.data.notifications ?? [] : [];

        let loanStatement: LoanStatement | null = null;
        if (activeLoan) {
          try {
            const loanDetail = await loanApi.myLoan(activeLoan.id);
            loanStatement = loanDetail.statement;
          } catch {
            loanStatement = null;
          }
        }

        if (!cancelled) {
          setState({
            summary,
            arrears,
            contributions,
            loans,
            activeLoan,
            loanStatement,
            eligibility,
            meetings,
            notifications,
          });
        }
      } catch {
        if (!cancelled) {
          setError(
            "We could not load your member dashboard. Please confirm your account is linked to a member profile or try again later.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const derived = useMemo(() => {
    if (!state.summary) return null;

    const financial = state.summary.financialSummary;
    const weeklySavings = state.arrears.weeklySavings.actual;
    const expectedWeekly = state.arrears.weeklySavings.expected;
    const contributionCompletion = percent(weeklySavings, expectedWeekly);
    const nextRepayment = nextRepaymentValue(state.activeLoan, state.loanStatement);
    const outstandingLoan = Number(
      state.loanStatement?.outstanding ?? state.activeLoan?.outstandingPrincipal ?? financial.activeLoanBalance ?? 0,
    );
    const outstandingTotal =
      outstandingLoan + Number(financial.finesBalance ?? 0) + Number(state.arrears.weeklySavings.arrears ?? 0);

    const cards = [
      {
        label: "Weekly savings this year",
        value: money(weeklySavings),
        helper: "Posted member savings for the open contribution period",
        icon: summaryIcons.weekly,
        tone: "success" as const,
        status: weeklySavings > 0 ? "Posted" : "None",
      },
      {
        label: "Expected savings so far",
        value: money(expectedWeekly),
        helper: "Based on active membership date and current welfare settings",
        icon: summaryIcons.expected,
        tone: "info" as const,
      },
      {
        label: "Contribution completion",
        value: `${contributionCompletion}%`,
        helper:
          state.arrears.weeklySavings.arrears > 0
            ? `${money(state.arrears.weeklySavings.arrears)} currently behind`
            : "Savings are up to date for the expected period",
        icon: summaryIcons.completion,
        tone: state.arrears.weeklySavings.arrears > 0 ? "warning" as const : "success" as const,
      },
      {
        label: "Share capital balance",
        value: money(state.arrears.shareCapital.actual),
        helper: "Ownership capital used in loan eligibility",
        icon: summaryIcons.share,
        tone: "info" as const,
      },
      {
        label: "Welfare kitty balance",
        value: money(state.arrears.welfareKitty.actual),
        helper: "Welfare contribution balance",
        icon: summaryIcons.welfare,
        tone: "neutral" as const,
      },
      {
        label: "Active loan balance",
        value: money(outstandingLoan),
        helper: state.activeLoan ? `${state.activeLoan.loanNumber} outstanding` : "No active loan",
        icon: summaryIcons.loan,
        tone: outstandingLoan > 0 ? "warning" as const : "success" as const,
      },
      {
        label: "Next loan repayment",
        value: state.activeLoan ? money(nextRepayment.amount) : "No active loan",
        helper: state.activeLoan ? `Due ${formatDate(nextRepayment.date)}` : "Apply when eligible and a window is open",
        icon: summaryIcons.repayment,
        tone: state.activeLoan ? "info" as const : "neutral" as const,
      },
      {
        label: "Total outstanding",
        value: money(outstandingTotal),
        helper: "Loan balance, fines, and savings arrears combined",
        icon: summaryIcons.outstanding,
        tone: outstandingTotal > 0 ? "danger" as const : "success" as const,
      },
    ];

    return {
      financial,
      weeklySavings,
      contributionCompletion,
      outstandingTotal,
      outstandingLoan,
      cards,
      alerts: buildAlerts({
        summary: state.summary,
        arrears: state.arrears,
        activeLoan: state.activeLoan,
        statement: state.loanStatement,
        meetings: state.meetings,
        notifications: state.notifications,
      }),
      activities: buildActivities({
        contributions: state.contributions,
        loans: state.loans,
        meetings: state.meetings,
        notifications: state.notifications,
      }),
    };
  }, [state]);

  return (
    <DashboardShell loading={loading} error={error}>
      {state.summary && derived ? (
        <div className="mx-auto w-full max-w-7xl space-y-4 pb-6 sm:space-y-5">
          <MemberWelcomeCard
            summary={state.summary}
            contributionPeriod={contributionPeriodLabel(state.summary)}
          />

          <AlertStrip alerts={derived.alerts} />

          <MobileFinancialCard
            weeklySavings={derived.weeklySavings}
            shareCapital={state.arrears.shareCapital.actual}
            welfareKitty={state.arrears.welfareKitty.actual}
            activeLoanBalance={derived.outstandingLoan}
            outstandingTotal={derived.outstandingTotal}
            completion={derived.contributionCompletion}
          />

          <FinancialSummaryCards cards={derived.cards} />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="space-y-4">
              <ContributionProgressCard
                arrears={state.arrears}
                recentContributions={state.contributions}
              />
              <ActiveLoanCard
                loan={state.activeLoan}
                statement={state.loanStatement}
                eligibility={state.eligibility}
              />
              <RecentActivityFeed activities={derived.activities} />
            </div>

            <aside className="space-y-4">
              <ShareCapitalCard arrears={state.arrears} />
              <QuickActionsPanel />
              <UpcomingMeetingsCard meetings={state.meetings} />
              <MemberAlertsCard alerts={derived.alerts} />
            </aside>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}

export default MemberDashboardPage;
