import { useEffect, useState } from "react";
import { FiAlertCircle, FiDownload } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  CashTransactionHistory,
  type CashTransactionRow,
} from "@/components/member/CashTransactionHistory";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/services/api";
import { contributionApi } from "@/services/contributionApi";
import { money } from "@/components/member/MemberCards";
import { FinanceMetric } from "@/components/member/MemberFinancePrimitives";
import type { Contribution } from "@/types/contribution";
import type { MemberArrears } from "@/types/contribution";

const TYPE_LABELS: Record<string, string> = {
  REGISTRATION: "Registration",
  SHARE_CAPITAL: "Share Capital",
  WEEKLY_SAVINGS: "Weekly Savings",
  WELFARE_KITTY: "Welfare Kitty",
  EMERGENCY_CONTRIBUTION: "Emergency",
  FINE_PAYMENT: "Fine",
  OTHER: "Other",
};

type ListMeta = {
  page: number;
  totalPages: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export function MemberContributionsPage() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [arrears, setArrears] = useState<MemberArrears | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [financialYear, setFinancialYear] = useState<{
    name: string;
    startDate: string;
    endDate: string;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      contributionApi.myContributions({ page }),
      contributionApi.myArrears(),
      api.get<{
        financialYear?: {
          name: string;
          startDate: string;
          endDate: string;
        } | null;
      }>("/member-portal/dashboard"),
    ])
      .then(([{ data, meta: m }, { arrears: a }, dash]) => {
        setContributions(data);
        setMeta(m);
        setArrears(a);
        setFinancialYear(dash.data.financialYear ?? null);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const totalArrears = arrears ? arrears.welfareKitty.arrears : 0;

  const historyRows: CashTransactionRow[] = contributions.map((c) => ({
    id: c.id,
    date: c.periodDate,
    amount: Number(c.amount),
    reference: c.receiptNo ?? c.paymentReference ?? null,
    paymentMethod: c.paymentMethod,
    status: c.status,
    subtitle: TYPE_LABELS[c.contributionType] ?? c.contributionType,
  }));

  const reloadContributions = () => {
    setLoading(true);
    void contributionApi
      .myContributions({ page })
      .then(({ data, meta: m }) => {
        setContributions(data);
        setMeta(m);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title="My Contributions"
        subtitle={
          financialYear
            ? `Active year ${financialYear.name} (${new Date(financialYear.startDate).toLocaleDateString()} – ${new Date(financialYear.endDate).toLocaleDateString()})`
            : "Contribution history and receipts"
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FinanceMetric
          label="Weekly savings balance"
          value={money(arrears?.weeklySavings.actual ?? 0)}
          hint={
            arrears
              ? `${money(arrears.weeklySavings.currentWeekPaid ?? 0)} paid this week - ${arrears.weeklySavings.unpaidPeriods ?? 0} past meeting(s) unpaid`
              : "—"
          }
        />
        <FinanceMetric
          label="Share capital balance"
          value={money(arrears?.shareCapital.actual ?? 0)}
          hint={
            arrears
              ? `${money(arrears.shareCapital.actual)} of ${money(arrears.shareCapital.maximumAllowed ?? arrears.shareCapital.expected)} maximum - ${arrears.shareCapital.status === "WINDOW_OPEN" ? "payment window open" : "payment window closed"}`
              : "—"
          }
        />
      </section>

      {arrears && totalArrears > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <FiAlertCircle className="shrink-0" />
            Outstanding arrears: {money(totalArrears)}
          </div>
          <ul className="mt-3 divide-y divide-amber-100/80 rounded-lg border border-amber-100 bg-white">
            {([["Welfare Kitty", arrears.welfareKitty]] as const)
              .filter(([, data]) => data.arrears > 0)
              .map(([label, data]) => (
                <li
                  key={label}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm"
                >
                  <span className="font-semibold text-ink-700">{label}</span>
                  <span className="text-right">
                    <span className="block font-extrabold text-red-600">
                      {money(data.arrears)} arrears
                    </span>
                    <span className="text-xs text-ink-500">
                      {money(data.actual)} / {money(data.expected)} expected
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <CashTransactionHistory
        title="Contribution history"
        rows={historyRows}
        loading={loading}
        emptyMessage="Your contribution history will appear here once the treasurer posts them."
        onRefresh={reloadContributions}
      />
    </div>
  );
}
