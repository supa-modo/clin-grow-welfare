import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiDownload, FiFileText } from "react-icons/fi";
import { TbPigMoney, TbWallet } from "react-icons/tb";
import { memberPortalApi } from "@/services/memberApi";
import { loanApi } from "@/services/loanApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Spinner, EmptyState } from "@/components/ui/Feedback";
import {
  MemberSection,
  SetupState,
  money,
} from "@/components/member/MemberCards";
import type { Loan } from "@/types/loan";

type MemberBalances = {
  shareCapital: number;
  weeklySavings: number;
  welfareKitty: number;
  activeLoanBalance: number;
  loanEligibilityBase: number;
  finesBalance: number;
};

const STATEMENT_LOAN_STATUSES = new Set([
  "ACTIVE",
  "PARTIALLY_PAID",
  "IN_ROLLOVER",
  "OVERDUE",
  "DEFAULTED",
  "CLOSED",
  "DISBURSED",
]);

export function MemberStatementsPage() {
  const [balances, setBalances] = useState<MemberBalances | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([memberPortalApi.dashboard(), loanApi.myLoans()])
      .then(([summary, loanList]) => {
        setBalances(summary.financialSummary as MemberBalances);
        setLoans(
          loanList.filter((l) => STATEMENT_LOAN_STATUSES.has(l.status)),
        );
      })
      .catch(() =>
        setError("We could not load your account statements. Please try again."),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SetupState
        loading
        title="Loading statements"
        message="Fetching your balances and loan records…"
      />
    );
  }

  if (error || !balances) {
    return (
      <SetupState
        title="Statements unavailable"
        message={error || "Unable to load statement data."}
      />
    );
  }

  const portfolioTotal =
    balances.shareCapital + balances.weeklySavings + balances.welfareKitty;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account statements"
        subtitle="Download loan statements and review your savings portfolio summary"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Share capital"
          value={money(balances.shareCapital)}
          subtitle="Current balance"
          icon={TbWallet}
        />
        <StatCard
          label="Weekly savings"
          value={money(balances.weeklySavings)}
          subtitle="Current balance"
          icon={FiFileText}
        />
        <StatCard
          label="Welfare kitty"
          value={money(balances.welfareKitty)}
          subtitle="Current balance"
          icon={TbPigMoney}
        />
        <StatCard
          label="Portfolio total"
          value={money(portfolioTotal)}
          subtitle="Excludes active loan balance"
        />
      </div>

      <MemberSection
        title="Contribution receipts"
        description="Individual contribution receipts are available from your contributions history."
        action={
          <Link to="/member/contributions">
            <Button size="sm" variant="outline">
              View contributions
            </Button>
          </Link>
        }
      >
        <p className="text-sm text-slate-600">
          Posted contributions include downloadable PDF receipts. Use the
          contributions page to browse history and download receipts by period.
        </p>
      </MemberSection>

      <MemberSection
        title="Loan statements"
        description="Download PDF statements for loans on your record"
      >
        {loans.length ? (
          <ul className="divide-y divide-slate-100">
            {loans.map((loan) => (
              <li
                key={loan.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
              >
                <div>
                  <p className="font-mono text-sm font-bold text-brand-700">
                    {loan.loanNumber}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Applied {new Date(loan.applicationDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">
                    {loan.status.replace(/_/g, " ")}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<FiDownload size={14} />}
                    onClick={() =>
                      loanApi.downloadMyStatement(loan.id, loan.loanNumber)
                    }
                  >
                    Download
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No loan statements"
            message="Loan statements appear here once you have a disbursed or closed loan."
          />
        )}
      </MemberSection>

      {balances.finesBalance > 0 ? (
        <MemberSection
          title="Outstanding fines"
          description="Clear fines to maintain good standing"
        >
          <p className="text-lg font-bold text-red-700">
            {money(balances.finesBalance)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Contact the treasurer or attend the next meeting to resolve outstanding
            fines.
          </p>
        </MemberSection>
      ) : null}
    </div>
  );
}

export default MemberStatementsPage;
