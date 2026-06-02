import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBell,
  FiCreditCard,
  FiFileText,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { TbPigMoney, TbWallet } from "react-icons/tb";
import { memberPortalApi } from "@/services/memberApi";
import { loanApi } from "@/services/loanApi";
import { contributionApi } from "@/services/contributionApi";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import {
  ActiveLoanProgress,
  MemberHero,
  MemberQuickActionCard,
  MemberSection,
  SetupState,
  findActiveLoan,
  money,
} from "@/components/member/MemberCards";
import type { Loan, LoanStatement } from "@/types/loan";
import type { Contribution } from "@/types/contribution";

type MemberBalances = {
  shareCapital: number;
  weeklySavings: number;
  welfareKitty: number;
  loanEligibilityBase: number;
  activeLoanBalance: number;
  finesBalance: number;
};

type DashboardSummary = {
  firstName: string;
  membershipNumber: string;
  status: string;
  registrationFeePaid: boolean;
  dateJoined: string;
  membershipDuration?: { months?: number };
  financialSummary: MemberBalances;
};

const TYPE_LABELS: Record<string, string> = {
  REGISTRATION: "Registration",
  SHARE_CAPITAL: "Share Capital",
  WEEKLY_SAVINGS: "Weekly Savings",
  WELFARE_KITTY: "Welfare Kitty",
  EMERGENCY_CONTRIBUTION: "Emergency",
  FINE_PAYMENT: "Fine",
  OTHER: "Other",
};

export function MemberDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [loanStatement, setLoanStatement] = useState<LoanStatement | null>(null);
  const [recentContributions, setRecentContributions] = useState<Contribution[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      memberPortalApi.dashboard(),
      loanApi.myLoans(),
      contributionApi.myContributions({ page: 1, pageSize: 5 }),
    ])
      .then(async ([dash, loans, contribRes]) => {
        if (cancelled) return;
        setSummary(dash as DashboardSummary);
        setRecentContributions(contribRes.data ?? []);

        const active = findActiveLoan(loans);
        setActiveLoan(active);
        if (active) {
          const detail = await loanApi.myLoan(active.id);
          if (!cancelled) setLoanStatement(detail.statement);
        } else {
          setLoanStatement(null);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "We could not load your member dashboard. Please try again later.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <SetupState
        loading
        title="Loading your dashboard"
        message="Fetching savings, loan status, and recent activity…"
      />
    );
  }

  if (error || !summary) {
    return (
      <SetupState
        title="No member profile linked yet"
        message={
          error ||
          "Your user account is not linked to a member record. Contact the welfare office if this persists."
        }
      />
    );
  }

  const financial = summary.financialSummary ?? {
    shareCapital: 0,
    weeklySavings: 0,
    welfareKitty: 0,
    loanEligibilityBase: 0,
    activeLoanBalance: 0,
    finesBalance: 0,
  };
  const portfolioTotal =
    financial.shareCapital + financial.weeklySavings + financial.welfareKitty;
  const maxEligible = financial.loanEligibilityBase * 3;

  return (
    <div className="space-y-6">
      <MemberHero
        firstName={summary.firstName}
        membershipNumber={summary.membershipNumber}
        status={summary.status}
        registrationFeePaid={summary.registrationFeePaid}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Share Capital"
          value={money(financial.shareCapital)}
          subtitle="Cumulative share capital"
          icon={TbWallet}
        />
        <StatCard
          label="Weekly Savings"
          value={money(financial.weeklySavings)}
          subtitle="Savings balance"
          icon={FiCreditCard}
        />
        <StatCard
          label="Welfare Kitty"
          value={money(financial.welfareKitty)}
          subtitle="Welfare contributions"
          icon={TbPigMoney}
        />
        <StatCard
          label="Active Loan"
          value={money(financial.activeLoanBalance)}
          subtitle={
            financial.activeLoanBalance > 0
              ? "Outstanding balance"
              : "No active loan"
          }
          icon={FiShield}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <ActiveLoanProgress loan={activeLoan} statement={loanStatement} />

          <MemberSection
            title="Quick actions"
            description="Common tasks for your welfare account"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <MemberQuickActionCard
                title="View contributions"
                description="History and receipts"
                icon={<FiCreditCard className="h-6 w-6" />}
                to="/member/contributions"
              />
              <MemberQuickActionCard
                title="Apply for loan"
                description="Check eligibility and apply"
                icon={<FiFileText className="h-6 w-6" />}
                to="/member/loans"
              />
              <MemberQuickActionCard
                title="Account statements"
                description="Download summaries"
                icon={<FiFileText className="h-6 w-6" />}
                to="/member/statements"
              />
              <MemberQuickActionCard
                title="Update profile"
                description="Contact and dependants"
                icon={<FiUser className="h-6 w-6" />}
                to="/member/profile"
              />
            </div>
          </MemberSection>

          <MemberSection
            title="Recent contributions"
            description="Latest posted contributions"
            action={
              <Link
                to="/member/contributions"
                className="text-xs font-bold text-brand-700 hover:underline"
              >
                View all
              </Link>
            }
          >
            {recentContributions.length ? (
              <ul className="divide-y divide-slate-100">
                {recentContributions.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {TYPE_LABELS[c.contributionType] ?? c.contributionType}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(c.periodDate).toLocaleDateString()} ·{" "}
                        {c.paymentMethod}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">
                        {money(Number(c.amount))}
                      </p>
                      <Badge tone={c.status === "POSTED" ? "success" : "warning"}>
                        {c.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                No contributions posted yet.
              </p>
            )}
          </MemberSection>

          <MemberSection
            title="Portfolio breakdown"
            description={`${money(portfolioTotal)} total savings & welfare`}
          >
            <div className="space-y-3">
              {(
                [
                  ["Share Capital", financial.shareCapital, "bg-brand-600"],
                  ["Weekly Savings", financial.weeklySavings, "bg-emerald-500"],
                  ["Welfare Kitty", financial.welfareKitty, "bg-amber-500"],
                ] as const
              ).map(([lbl, val, color]) => {
                const pct =
                  portfolioTotal > 0
                    ? Math.round((val / portfolioTotal) * 100)
                    : 0;
                return (
                  <div key={lbl}>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>{lbl}</span>
                      <span className="font-semibold">{money(val)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </MemberSection>

          {financial.finesBalance > 0 ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <FiBell className="mr-1 inline" />
              Outstanding fines of {money(financial.finesBalance)}. Please clear
              to maintain good standing.
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <MemberSection
            title="Loan eligibility"
            description="Based on share capital + savings (welfare excluded)"
          >
            <p className="text-2xl font-bold text-brand-800">
              {money(maxEligible)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Base {money(financial.loanEligibilityBase)} × 3 multiplier
            </p>
            <Link
              to="/member/loans"
              className="mt-4 inline-block text-sm font-bold text-brand-700 hover:underline"
            >
              Manage loans →
            </Link>
          </MemberSection>

          <MemberSection title="Membership" description="Account snapshot">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Member since</dt>
                <dd className="font-semibold text-slate-800">
                  {new Date(summary.dateJoined).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Duration</dt>
                <dd className="font-semibold text-slate-800">
                  {summary.membershipDuration?.months ?? 0} months
                </dd>
              </div>
            </dl>
          </MemberSection>

          <MemberSection title="Quick links">
            <div className="flex flex-col gap-2 text-sm font-semibold">
              <Link
                to="/member/contributions"
                className="text-brand-700 hover:underline"
              >
                Contributions →
              </Link>
              <Link
                to="/member/profile?tab=family"
                className="text-brand-700 hover:underline"
              >
                Family & beneficiaries →
              </Link>
              <Link
                to="/member/notifications"
                className="text-brand-700 hover:underline"
              >
                Notifications →
              </Link>
            </div>
          </MemberSection>
        </aside>
      </div>
    </div>
  );
}

export default MemberDashboardPage;
