import { useEffect, useMemo, useState } from "react";
import { FiAlertCircle } from "react-icons/fi";
import { Landmark, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/Button";
import DateInput from "@/components/ui/DateInput";
import {
  CashTransactionHistory,
  type CashTransactionRow,
} from "@/components/member/CashTransactionHistory";
import { api } from "@/services/api";
import { contributionApi } from "@/services/contributionApi";
import { money } from "@/components/member/MemberCards";
import { FinanceMetric } from "@/components/member/MemberFinancePrimitives";
import {
  MemberHeroCard,
  MemberSectionCard,
  MemberWelcomeHeader,
} from "@/components/member/MemberPortalUi";
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

const CONTRIBUTION_TYPES = Object.keys(TYPE_LABELS);

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return null;
  const start = new Date(year, monthNumber - 1, 1);
  const end = new Date(year, monthNumber, 0);
  return { from: isoDate(start), to: isoDate(end) };
}

function monthFromRange(from: string, to: string) {
  if (!from || !to) return "";
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  if (start.getDate() !== 1) return "";
  const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  if (isoDate(lastDay) !== isoDate(end)) return "";
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
}

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
  const [type, setType] = useState("");
  const [month, setMonth] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [financialYear, setFinancialYear] = useState<{
    name: string;
    startDate: string;
    endDate: string;
  } | null>(null);
  const filtersActive = Boolean(type || from || to);

  useEffect(() => {
    Promise.all([
      contributionApi.myArrears(),
      api.get<{
        financialYear?: {
          name: string;
          startDate: string;
          endDate: string;
        } | null;
      }>("/member-portal/dashboard"),
    ]).then(([{ arrears: a }, dash]) => {
      setArrears(a);
      setFinancialYear(dash.data.financialYear ?? null);
    });
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    contributionApi
      .myContributions({
        page,
        type: type || undefined,
        from: from || undefined,
        to: to || undefined,
      })
      .then(({ data, meta: m }) => {
        if (!active) return;
        setContributions(data);
        setMeta(m);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, type, from, to]);

  const totalArrears = arrears ? arrears.welfareKitty.arrears : 0;

  const portfolioTotal = useMemo(() => {
    if (!arrears) return 0;
    return (
      Number(arrears.weeklySavings.actual ?? 0) +
      Number(arrears.shareCapital.actual ?? 0)
    );
  }, [arrears]);

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
      .myContributions({
        page,
        type: type || undefined,
        from: from || undefined,
        to: to || undefined,
      })
      .then(({ data, meta: m }) => {
        setContributions(data);
        setMeta(m);
      })
      .finally(() => setLoading(false));
  };

  const applyType = (value: string) => {
    setType(value);
    setPage(1);
  };

  const applyMonth = (value: string) => {
    setMonth(value);
    const bounds = value ? monthBounds(value) : null;
    setFrom(bounds?.from ?? "");
    setTo(bounds?.to ?? "");
    setPage(1);
  };

  const applyFrom = (value: string) => {
    setFrom(value);
    setMonth(monthFromRange(value, to));
    setPage(1);
  };

  const applyTo = (value: string) => {
    setTo(value);
    setMonth(monthFromRange(from, value));
    setPage(1);
  };

  const yearSubtitle = financialYear
    ? `Active year ${financialYear.name} (${new Date(financialYear.startDate).toLocaleDateString()} – ${new Date(financialYear.endDate).toLocaleDateString()})`
    : "Savings and capital history";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-6">
      <MemberWelcomeHeader
        greeting=""
        name="My savings & capital"
        membershipNumber={yearSubtitle}
        statusLabel="Track balances and payment history"
      />

      <MemberHeroCard
        label="Portfolio balance"
        value={money(portfolioTotal)}
        hint="Share capital and weekly savings combined"
        trendLabel={
          arrears
            ? `${money(arrears.weeklySavings.currentWeekPaid ?? 0)} paid this week`
            : undefined
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FinanceMetric
          label="Weekly savings balance"
          value={money(arrears?.weeklySavings.actual ?? 0)}
          hint={
            arrears
              ? `${money(arrears.weeklySavings.currentWeekPaid ?? 0)} this week · ${arrears.weeklySavings.unpaidPeriods ?? 0} unpaid`
              : "—"
          }
          accent="primary"
          icon={<PiggyBank className="h-5 w-5" />}
        />
        <FinanceMetric
          label="Share capital balance"
          value={money(arrears?.shareCapital.actual ?? 0)}
          hint={
            arrears
              ? `${money(arrears.shareCapital.actual)} of ${money(arrears.shareCapital.maximumAllowed ?? arrears.shareCapital.expected)} maximum | ${arrears.shareCapital.status === "WINDOW_OPEN" ? "window open" : "window closed"}`
              : "—"
          }
          accent="secondary"
          icon={<Landmark className="h-5 w-5" />}
        />
      </section>

      {arrears && totalArrears > 0 ? (
        <div className="px-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <FiAlertCircle className="shrink-0" />
            Welfare kitty arrears: {money(totalArrears)}
          </div>
          <ul className="mt-3 divide-y divide-amber-100/80 rounded-xl border border-amber-100 bg-amber-50/50">
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

      <MemberSectionCard
        title="Contribution history"
        subtitle={
          meta
            ? `Page ${meta.page} of ${meta.totalPages} · ${meta.total} record(s)`
            : "Posted contributions and receipts"
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-[0.75rem] font-medium text-ink-500 lg:text-[0.8rem]">
            Contribution type
            <select
              value={type}
              onChange={(event) => applyType(event.target.value)}
              className="mt-1 w-full rounded-[0.6rem] border border-gray-300 bg-gray-100 px-3 py-2 text-xs text-ink-800 outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 lg:text-sm"
            >
              <option value="">All types</option>
              {CONTRIBUTION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[0.75rem] font-medium text-ink-500 lg:text-[0.8rem]">
            Month
            <input
              type="month"
              value={month}
              onChange={(event) => applyMonth(event.target.value)}
              className="mt-1 w-full rounded-[0.6rem] border border-gray-300 bg-gray-100 px-3 py-2 text-xs text-ink-800 outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 lg:text-sm"
            />
          </label>
          <DateInput
            label="From"
            value={from}
            max={to || undefined}
            onChange={(event) => applyFrom(event.target.value)}
          />
          <DateInput
            label="To"
            value={to}
            min={from || undefined}
            onChange={(event) => applyTo(event.target.value)}
          />
        </div>
        <CashTransactionHistory
          title=""
          rows={historyRows}
          loading={loading}
          emptyMessage={
            filtersActive
              ? "No contributions match these filters."
              : "Your contribution history will appear here once the treasurer posts them."
          }
          onRefresh={reloadContributions}
          onDownloadReceipt={(id) => contributionApi.downloadMyReceipt(id)}
          embedded
        />

        {meta && meta.totalPages > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
            <p className="text-xs font-semibold text-ink-500">
              Showing page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!meta.hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!meta.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </MemberSectionCard>
    </div>
  );
}
