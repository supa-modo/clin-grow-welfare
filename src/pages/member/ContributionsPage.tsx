import { useEffect, useState } from "react";
import { FiAlertCircle, FiDownload } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Spinner, EmptyState } from "@/components/ui/Feedback";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { contributionApi } from "@/services/contributionApi";
import { money } from "@/components/member/MemberCards";
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

  useEffect(() => {
    setLoading(true);
    Promise.all([
      contributionApi.myContributions({ page }),
      contributionApi.myArrears(),
    ])
      .then(([{ data, meta: m }, { arrears: a }]) => {
        setContributions(data);
        setMeta(m);
        setArrears(a);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const totalArrears = arrears
    ? arrears.shareCapital.arrears +
      arrears.weeklySavings.arrears +
      arrears.welfareKitty.arrears
    : 0;

  const totalPosted = contributions.reduce(
    (sum, c) => sum + (c.status === "POSTED" ? Number(c.amount) : 0),
    0,
  );

  const columns: Column<Contribution>[] = [
    {
      key: "receipt",
      header: "Receipt",
      render: (c) => (
        <span className="font-mono text-xs">{c.receiptNo ?? "—"}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (c) => (
        <Badge tone="neutral">
          {TYPE_LABELS[c.contributionType] ?? c.contributionType}
        </Badge>
      ),
    },
    {
      key: "fund",
      header: "Fund",
      render: (c) => c.fund?.name ?? "—",
    },
    {
      key: "amount",
      header: "Amount",
      render: (c) => (
        <span className="font-semibold">{money(Number(c.amount))}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (c) => new Date(c.periodDate).toLocaleDateString(),
    },
    {
      key: "method",
      header: "Method",
      render: (c) => c.paymentMethod,
    },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <Badge tone={c.status === "POSTED" ? "success" : "danger"}>
          {c.status}
        </Badge>
      ),
    },
    {
      key: "receipt_dl",
      header: "",
      render: (c) => (
        <Button
          size="sm"
          variant="ghost"
          icon={<FiDownload size={12} />}
          onClick={(e) => {
            e.stopPropagation();
            contributionApi.downloadMyReceipt(c.id);
          }}
        >
          Receipt
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Contributions"
        subtitle="View contribution history and download receipts"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="This page total"
          value={money(totalPosted)}
          subtitle="Posted on current page"
        />
        <StatCard
          label="Share capital arrears"
          value={money(arrears?.shareCapital.arrears ?? 0)}
          subtitle={
            arrears
              ? `${money(arrears.shareCapital.actual)} of ${money(arrears.shareCapital.expected)}`
              : "—"
          }
        />
        <StatCard
          label="Savings arrears"
          value={money(arrears?.weeklySavings.arrears ?? 0)}
          subtitle={
            arrears
              ? `${money(arrears.weeklySavings.actual)} of ${money(arrears.weeklySavings.expected)}`
              : "—"
          }
        />
        <StatCard
          label="Welfare arrears"
          value={money(arrears?.welfareKitty.arrears ?? 0)}
          subtitle={
            arrears
              ? `${money(arrears.welfareKitty.actual)} of ${money(arrears.welfareKitty.expected)}`
              : "—"
          }
        />
      </div>

      {arrears && totalArrears > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <FiAlertCircle className="shrink-0" />
            Outstanding arrears: {money(totalArrears)}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(
              [
                ["Share Capital", arrears.shareCapital],
                ["Weekly Savings", arrears.weeklySavings],
                ["Welfare Kitty", arrears.welfareKitty],
              ] as const
            )
              .filter(([, data]) => data.arrears > 0)
              .map(([label, data]) => (
                <div
                  key={label}
                  className="rounded-xl border border-amber-100 bg-white p-3 text-xs"
                >
                  <p className="font-semibold text-slate-700">{label}</p>
                  <p className="mt-1 font-bold text-red-600">
                    {money(data.arrears)} arrears
                  </p>
                  <p className="text-slate-500">
                    {money(data.actual)} / {money(data.expected)} expected
                  </p>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : contributions.length === 0 ? (
        <EmptyState
          title="No contributions yet"
          message="Your contribution history will appear here once the treasurer posts them."
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              rows={contributions}
              getRowKey={(c) => c.id}
              currentPage={meta?.page ?? page}
              totalPages={meta?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
          <div className="space-y-3 md:hidden">
            {contributions.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <Badge tone="neutral">
                    {TYPE_LABELS[c.contributionType] ?? c.contributionType}
                  </Badge>
                  <Badge tone={c.status === "POSTED" ? "success" : "danger"}>
                    {c.status}
                  </Badge>
                </div>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {money(Number(c.amount))}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(c.periodDate).toLocaleDateString()} ·{" "}
                  {c.paymentMethod}
                </p>
                {c.receiptNo ? (
                  <p className="mt-1 font-mono text-[0.65rem] text-slate-400">
                    {c.receiptNo}
                  </p>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  icon={<FiDownload size={12} />}
                  onClick={() => contributionApi.downloadMyReceipt(c.id)}
                >
                  Receipt
                </Button>
              </div>
            ))}
            {meta && meta.totalPages > 1 ? (
              <div className="flex justify-between gap-2 pt-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!meta.hasPrev}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="self-center text-xs text-slate-500">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!meta.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
