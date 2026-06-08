import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { contributionApi } from "@/services/contributionApi";
import { loanApi } from "@/services/loanApi";
import { memberPortalApi } from "@/services/memberApi";
import type { MemberArrears } from "@/types/contribution";
import type { Loan, LoanEligibility, LoanStatement } from "@/types/loan";
import {
  DashboardShell,
  buildAlerts,
  findActiveLoan,
  type DashboardMeeting,
  type DashboardNotification,
  type MemberDashboardSummary,
  type MemberArrearsSummary,
} from "@/components/member/dashboard/MemberDashboardSections";
import { DashboardOverviewLayout } from "@/components/member/dashboard/MemberDashboardOverview";

const emptyArrears: MemberArrearsSummary = {
  shareCapital: { expected: 0, actual: 0, arrears: 0 },
  weeklySavings: { expected: 0, actual: 0, arrears: 0 },
  welfareKitty: { expected: 0, actual: 0, arrears: 0 },
};

type DashboardState = {
  summary: MemberDashboardSummary | null;
  arrears: MemberArrearsSummary;
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
      actual: Number(
        arrears?.shareCapital.actual ?? summary.financialSummary.shareCapital ?? 0,
      ),
      arrears: 0,
      status: arrears?.shareCapital.status,
      minimumRequired: arrears?.shareCapital.minimumRequired,
      maximumAllowed: arrears?.shareCapital.maximumAllowed,
      windowClosesAt: arrears?.shareCapital.windowClosesAt,
    },
    weeklySavings: {
      expected: Number(arrears?.weeklySavings.expected ?? 0),
      actual: Number(
        arrears?.weeklySavings.actual ??
          summary.financialSummary.weeklySavings ??
          0,
      ),
      arrears: 0,
      status: arrears?.weeklySavings.status,
      currentWeekPaid: arrears?.weeklySavings.currentWeekPaid,
      currentWeekMinimum: arrears?.weeklySavings.currentWeekMinimum,
      unpaidPeriods: arrears?.weeklySavings.unpaidPeriods,
      unpaidMeetings: arrears?.weeklySavings.unpaidMeetings,
    },
    welfareKitty: {
      expected: Number(arrears?.welfareKitty.expected ?? 0),
      actual: Number(
        arrears?.welfareKitty.actual ?? summary.financialSummary.welfareKitty ?? 0,
      ),
      arrears: Number(arrears?.welfareKitty.arrears ?? 0),
    },
  };
}

export function MemberDashboardPage() {
  const [state, setState] = useState<DashboardState>({
    summary: null,
    arrears: emptyArrears,
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

        const [
          arrearsResult,
          loansResult,
          eligibilityResult,
          meetingsResult,
          notificationsResult,
        ] = await Promise.allSettled([
          contributionApi.myArrears(),
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
        const loans = loansResult.status === "fulfilled" ? loansResult.value ?? [] : [];
        const activeLoan = findActiveLoan(loans);
        const eligibility =
          eligibilityResult.status === "fulfilled" ? eligibilityResult.value : null;
        const meetings =
          meetingsResult.status === "fulfilled"
            ? meetingsResult.value.data.meetings ?? []
            : [];
        const notifications =
          notificationsResult.status === "fulfilled"
            ? notificationsResult.value.data.notifications ?? []
            : [];

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

  const alerts = useMemo(() => {
    if (!state.summary) return [];
    return buildAlerts({
      summary: state.summary,
      arrears: state.arrears,
      activeLoan: state.activeLoan,
      statement: state.loanStatement,
      meetings: state.meetings,
      notifications: state.notifications,
    });
  }, [state]);

  return (
    <DashboardShell loading={loading} error={error}>
      {state.summary ? (
        <DashboardOverviewLayout
          summary={state.summary}
          arrears={state.arrears}
          alerts={alerts}
          activeLoan={state.activeLoan}
          loanStatement={state.loanStatement}
          eligibility={state.eligibility}
          meetings={state.meetings}
        />
      ) : null}
    </DashboardShell>
  );
}

export default MemberDashboardPage;
