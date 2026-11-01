import { useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import {
  LuArrowLeft,
  LuBadgeCheck,
  LuCalculator,
  LuCalendarDays,
  LuChevronDown,
  LuDivide,
  LuEqual,
  LuHistory,
  LuInfo,
  LuLayers,
  LuLockKeyhole,
  LuMinus,
  LuPlus,
  LuScale,
  LuSparkles,
  LuWallet,
  LuX,
} from "react-icons/lu";
import { RefreshIconButton } from "@/components/ui/RefreshIconButton";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useMemberDistribution } from "@/hooks/useMemberDistribution";
import { useAuthStore } from "@/store/auth";
import {
  memberDate,
  memberDistributionApi,
  memberMoney,
} from "@/services/memberDistribution";
import type {
  CapitalHistory,
  DistributionView,
} from "@/services/memberDistribution";

type CapitalHistoryRow = CapitalHistory["rows"][number];

const historyColumns: Column<CapitalHistoryRow>[] = [
  {
    id: "date",
    header: "Date",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.date,
    cell: (row) => (
      <span className="font-semibold text-slate-900">{memberDate(row.date)}</span>
    ),
  },
  {
    id: "reference",
    header: "Reference",
    sortable: true,
    sortValue: (row) => row.reference,
    cell: (row) => (
      <span className="font-medium text-slate-600">{row.reference}</span>
    ),
  },
  {
    id: "meeting",
    header: "Meeting",
    sortable: true,
    sortValue: (row) => row.meeting ?? "",
    cell: (row) => row.meeting || "Account entry",
  },
  {
    id: "shareCapital",
    header: "Share capital",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.shareCapital,
    cell: (row) => (
      <span className="block text-right font-semibold tabular-nums text-slate-900">
        {memberMoney(row.shareCapital)}
      </span>
    ),
  },
  {
    id: "savings",
    header: "Savings",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.savings,
    cell: (row) => (
      <span className="block text-right font-semibold tabular-nums text-slate-900">
        {memberMoney(row.savings)}
      </span>
    ),
  },
];

const cardClass =
  "min-w-0 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_32px_-24px_rgba(15,23,42,0.35)] sm:p-6";

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="shrink-0 rounded-2xl bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-inset ring-emerald-100">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-6 text-[#102e26]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs leading-5 text-slate-600">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function NumberRow({
  label,
  value,
  strong = false,
  sign,
}: {
  label: string;
  value: number;
  strong?: boolean;
  sign?: "plus" | "minus";
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 py-3 text-sm ${strong ? "font-bold text-[#102e26]" : "text-slate-600"}`}
    >
      <span className="flex min-w-0 items-start gap-2">
        {sign && (
          <span
            aria-hidden="true"
            className={`mt-0.5 shrink-0 rounded-full p-0.5 ${sign === "plus" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
          >
            {sign === "plus" ? (
              <LuPlus className="h-3 w-3" />
            ) : (
              <LuMinus className="h-3 w-3" />
            )}
          </span>
        )}
        <span>{label}</span>
      </span>
      <span className="shrink-0 text-right tabular-nums">
        {memberMoney(value)}
      </span>
    </div>
  );
}

function CapitalHistorySection() {
  const userId = useAuthStore((state) => state.user?.id);
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: ["member-capital-history", userId, page],
    queryFn: () => memberDistributionApi.history(page),
    gcTime: 0,
    retry: 1,
  });
  const pageSize = history.data?.pageSize ?? 20;
  const total = history.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const startIndex = total ? (page - 1) * pageSize + 1 : 0;
  const rows = history.data?.rows ?? [];
  return (
    <section className={cardClass} aria-label="Your contribution history">
      <SectionHeader
        icon={<LuHistory className="h-5 w-5" />}
        title="Your contribution history"
        subtitle="Shares and savings by meeting or account entry, including corrections."
      />
      <div id="capital-history" className="mt-5">
        {history.isError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800"
          >
            History could not be loaded.
            <RefreshIconButton
              size="sm"
              title="Try again"
              onClick={() => void history.refetch()}
            />
          </div>
        ) : (
          <DataTable
            columns={historyColumns}
            rows={rows}
            getRowKey={(row) => `${row.reference}-${row.date}`}
            tableLoading={history.isPending}
            loadingSkeletonRows={5}
            showCheckboxes={false}
            clientPagination={false}
            currentPage={page}
            totalPages={pageCount}
            totalItems={total}
            pageSize={pageSize}
            startIndex={startIndex}
            endIndex={rows.length ? startIndex + rows.length - 1 : 0}
            onPageChange={setPage}
            emptyTitle="No posted capital movements yet"
            emptyMessage="Share capital and savings entries will appear here once they are posted."
            containerClassName="shadow-none"
          />
        )}
      </div>
    </section>
  );
}

function DistributionHero({ data }: { data: DistributionView }) {
  const approved = data.status === "APPROVED";
  const stats = [
    { label: "Share capital", value: data.member.shareCapital },
    { label: "Savings", value: data.member.savings },
    { label: "Total capital", value: data.member.capital },
    {
      label: "Capital + income share",
      value: data.allocation.totalWithCapital,
    },
  ];
  return (
    <section
      aria-label="Your income share"
      className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(125deg,#062e26_0%,#075e46_60%,#0a8a63_100%)] p-5 text-white shadow-[0_18px_40px_-18px_rgba(6,78,59,0.6)] sm:p-7"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full border-[40px] border-white/[0.06]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-44 left-1/3 -z-10 h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl"
      />
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-10">
        <div className="min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${approved ? "bg-emerald-300/20 text-emerald-50 ring-emerald-200/40" : "bg-amber-300/15 text-amber-50 ring-amber-200/40"}`}
          >
            {approved ? (
              <LuBadgeCheck className="h-3.5 w-3.5" />
            ) : (
              <LuSparkles className="h-3.5 w-3.5" />
            )}
            {approved ? "AGM approved" : "Year-end estimate"}
          </span>
          <p className="mt-4 text-sm font-semibold text-emerald-50/90">
            {approved
              ? "Approved income share"
              : "Projected year-end income share"}
          </p>
          <p className="mt-1 wrap-break-word font-google text-[2.1rem] font-extrabold leading-tight tracking-tight tabular-nums sm:text-5xl">
            {memberMoney(data.allocation.projectedShare)}
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/85">
            {approved
              ? "Your saved AGM-approved income allocation."
              : "A recorded-amounts estimate for the end of the financial year. Future income and contributions are not assumed."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-emerald-50">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-inset ring-white/15">
              <LuWallet className="h-3.5 w-3.5" />
              {data.member.name} · {data.member.membershipNumber}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-inset ring-white/15">
              <LuCalendarDays className="h-3.5 w-3.5" />
              Calculated {memberDate(data.calculatedAt)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-inset ring-white/15">
              Year ends {memberDate(data.financialYear.endDate)}
            </span>
          </div>
        </div>
        <div className="min-w-0 rounded-2xl bg-white/[0.08] p-4 ring-1 ring-inset ring-white/15 backdrop-blur-sm sm:p-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`min-w-0 ${i >= 2 ? "border-t border-white/15 pt-4" : ""}`}
              >
                <dt className="text-xs text-emerald-50/80">{stat.label}</dt>
                <dd
                  className={`mt-1 wrap-break-word font-google font-extrabold tabular-nums ${i >= 2 ? "text-base sm:text-xl" : "text-sm sm:text-lg"}`}
                >
                  {memberMoney(stat.value)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 flex items-start gap-2 border-t border-white/15 pt-3 text-[11px] leading-5 text-emerald-50/80">
            <LuInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Capital plus income is not an amount currently available to
            withdraw. Final payouts require reconciliation, settled loans, cash
            availability and AGM approval.
          </p>
        </div>
      </div>
    </section>
  );
}

function FormulaStep({
  operator,
  label,
  value,
  highlight = false,
}: {
  operator?: ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 ${highlight ? "bg-[#075e46] text-white shadow-sm" : "bg-white ring-1 ring-inset ring-slate-200"}`}
    >
      <span
        aria-hidden="true"
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${highlight ? "bg-white/15 text-white" : "bg-emerald-50 text-emerald-700"}`}
      >
        {operator ?? <LuWallet className="h-3.5 w-3.5" />}
      </span>
      <span
        className={`min-w-0 flex-1 text-sm ${highlight ? "font-semibold" : "text-slate-600"}`}
      >
        {label}
      </span>
      <span
        className={`shrink-0 text-right text-sm tabular-nums ${highlight ? "font-extrabold" : "font-semibold text-slate-900"}`}
      >
        {memberMoney(value)}
      </span>
    </li>
  );
}

function CalculationSection({ data }: { data: DistributionView }) {
  const pct = data.allocation.percentage;
  const barWidth = Math.min(100, Math.max(pct, 1.5));
  return (
    <section className={cardClass}>
      <SectionHeader
        icon={<LuCalculator className="h-5 w-5" />}
        title="How your share is calculated"
        subtitle="Default capital-based formula"
      />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.1fr] lg:gap-8">
        <div className="min-w-0">
          <p className="text-sm leading-6 text-slate-600">
            Every shilling in share capital and savings has the same weight.
            Contribution timing does not change this weighting. The welfare
            kitty is held separately and is not part of the calculation.
          </p>
          <p className="mt-4 rounded-2xl border-l-4 border-emerald-600 bg-emerald-50/70 px-4 py-3 text-sm font-semibold leading-6 text-[#102e26]">
            Your income share = (your capital ÷ total group capital) × net
            shareable pool
          </p>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
            <div className="flex items-end justify-between gap-3">
              <p className="text-xs text-slate-600">
                Your percentage of group capital
              </p>
              <p className="font-google text-xl font-extrabold tabular-nums text-emerald-800">
                {pct.toLocaleString("en-KE", { maximumFractionDigits: 6 })}%
              </p>
            </div>
            <div
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#0a8a63,#075e46)]"
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-slate-600">
              Group capital · {data.group.memberCount} capital accounts:{" "}
              <span className="font-semibold tabular-nums text-slate-800">
                {memberMoney(data.group.capital)}
              </span>
            </p>
          </div>
        </div>
        <div className="min-w-0 rounded-3xl bg-[linear-gradient(160deg,#f0fdf4_0%,#f8fafc_100%)] p-3 ring-1 ring-inset ring-emerald-100 sm:p-4">
          {data.group.capital > 0 ? (
            <ol className="space-y-2" aria-label="Your calculation">
              <FormulaStep label="Your capital" value={data.member.capital} />
              <FormulaStep
                operator={<LuDivide className="h-3.5 w-3.5" />}
                label="Total group capital"
                value={data.group.capital}
              />
              <FormulaStep
                operator={<LuX className="h-3.5 w-3.5" />}
                label="Net shareable pool"
                value={data.group.shareablePool}
              />
              <FormulaStep
                operator={<LuEqual className="h-3.5 w-3.5" />}
                label="Your income share"
                value={data.allocation.currentShare}
                highlight
              />
            </ol>
          ) : (
            <p className="p-4 text-sm leading-6 text-emerald-900">
              No capital has been recorded, so no income share can be allocated
              yet.
            </p>
          )}
          <p className="mt-3 px-1 text-[11px] leading-5 text-slate-600">
            Use the full capital values above when calculating, rather than the
            rounded percentage. The final one-cent rounding is reconciled across
            the group.
          </p>
        </div>
      </div>
    </section>
  );
}

function PoolSection({ data }: { data: DistributionView }) {
  const b = data.group.breakdown;
  const segments = b
    ? [
        { label: "Loan interest", value: b.interest, color: "bg-emerald-600" },
        { label: "Fines", value: b.fines, color: "bg-amber-500" },
        { label: "Other income", value: b.otherIncome, color: "bg-sky-500" },
      ]
    : [];
  const segmentTotal = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  return (
    <section className={cardClass}>
      <SectionHeader
        icon={<LuLayers className="h-5 w-5" />}
        title="What makes up the shareable pool?"
        subtitle="Group totals only — no other member’s balance is revealed."
      />
      {b ? (
        <>
          {segmentTotal > 0 && (
            <div className="mt-5">
              <div
                className="flex h-3 overflow-hidden rounded-full bg-slate-100"
                aria-hidden="true"
              >
                {segments.map(
                  (s) =>
                    s.value > 0 && (
                      <div
                        key={s.label}
                        className={`${s.color} h-full first:rounded-l-full last:rounded-r-full`}
                        style={{ width: `${(s.value / segmentTotal) * 100}%` }}
                      />
                    ),
                )}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
                {segments.map((s) => (
                  <li
                    key={s.label}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span className={`h-2 w-2 rounded-full ${s.color}`} />
                    {s.label}
                    <span className="tabular-nums text-slate-500">
                      {((Math.max(0, s.value) / segmentTotal) * 100).toFixed(0)}
                      %
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl p-1 ring-1 ring-inset ring-slate-200 sm:p-2">
              <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Income
              </p>
              <div className="divide-y divide-slate-100 px-3">
                <NumberRow
                  sign="plus"
                  label="Recorded loan interest, net of reversals"
                  value={b.interest}
                />
                <NumberRow
                  sign="plus"
                  label="Recorded fine income"
                  value={b.fines}
                />
                <NumberRow
                  sign="plus"
                  label="Other recorded income"
                  value={b.otherIncome}
                />
                <NumberRow
                  label="Total recorded income"
                  value={b.income}
                  strong
                />
              </div>
            </div>
            <div className="rounded-2xl p-1 ring-1 ring-inset ring-slate-200 sm:p-2">
              <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-rose-700">
                Deductions
              </p>
              <div className="divide-y divide-slate-100 px-3">
                <NumberRow
                  sign="minus"
                  label="Less recorded expenses"
                  value={b.expenses}
                />
                <NumberRow
                  sign="minus"
                  label="Less distribution adjustments"
                  value={b.adjustments}
                />
              </div>
              <p className="px-3 pb-2 pt-1 text-xs leading-5 text-slate-600">
                Net pool = recorded income − expenses − distribution
                adjustments.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#075e46] px-4 py-3.5 text-white">
            <span className="text-sm font-semibold">Net shareable pool</span>
            <span className="font-google text-lg font-extrabold tabular-nums sm:text-xl">
              {memberMoney(data.group.shareablePool)}
            </span>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
          <p className="text-xs text-slate-600">Approved shareable pool</p>
          <p className="mt-1 font-google text-xl font-extrabold tabular-nums text-[#102e26]">
            {memberMoney(data.group.shareablePool)}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            The historical income breakdown was not saved with this approved
            allocation; current post-payout income is not substituted for it.
          </p>
        </div>
      )}
    </section>
  );
}

function BasisSection({ data }: { data: DistributionView }) {
  const approved = data.status === "APPROVED";
  const secondLabel = approved ? "Approved" : "Year-end estimate";
  const rows: Array<[string, number]> = [
    ["Your capital", data.member.capital],
    ["Group capital", data.group.capital],
    ["Net shareable pool", data.group.shareablePool],
    ["Your income share", data.allocation.projectedShare],
  ];
  return (
    <section className={cardClass}>
      <SectionHeader
        icon={<LuScale className="h-5 w-5" />}
        title={
          approved ? "Approved allocation basis" : "Current and year-end view"
        }
      />
      <ul className="mt-5 space-y-2 sm:hidden">
        {rows.map(([label, value], i) => (
          <li
            key={label}
            className={`rounded-2xl p-3.5 ${i === rows.length - 1 ? "bg-emerald-50 ring-1 ring-inset ring-emerald-100" : "ring-1 ring-inset ring-slate-200"}`}
          >
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <dl className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <dt className="text-[11px] text-slate-500">Recorded</dt>
                <dd className="text-sm tabular-nums text-slate-900">
                  {memberMoney(value)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">{secondLabel}</dt>
                <dd className="text-sm font-semibold tabular-nums text-slate-900">
                  {memberMoney(value)}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-slate-200 sm:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Recorded and projected distribution values
          </caption>
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Basis
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Recorded
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                {secondLabel}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(([label, value], i) => (
              <tr
                key={label}
                className={i === rows.length - 1 ? "bg-emerald-50/60" : ""}
              >
                <th
                  scope="row"
                  className={`px-4 py-3 ${i === rows.length - 1 ? "font-bold text-[#102e26]" : "font-medium text-slate-600"}`}
                >
                  {label}
                </th>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {memberMoney(value)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                  {memberMoney(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-600">
        {approved ? (
          "These amounts are taken from the saved AGM-approved allocation, not the balances remaining after payouts."
        ) : (
          <>
            The columns match because this estimate assumes no new, unrecorded
            transactions before {memberDate(data.financialYear.endDate)}. It
            does not invent future loans, fines, savings or investment returns.
          </>
        )}
      </p>
    </section>
  );
}

function DistributionNumbers({ data }: { data: DistributionView }) {
  return (
    <>
      <DistributionHero data={data} />
      <CalculationSection data={data} />
      <PoolSection data={data} />
      <BasisSection data={data} />
      <details className={`${cardClass} group`}>
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-secondary-600 lg:text-base [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            Calculation notes and assumptions
          </span>
          <LuChevronDown className="h-4 w-4 shrink-0 text-emerald-700 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
          {data.assumptions.map((note) => (
            <li key={note} className="flex gap-3">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </details>
      <CapitalHistorySection />
    </>
  );
}

function DistributionSkeleton() {
  return (
    <div role="status" className="space-y-5 pt-4">
      <span className="sr-only">Loading your distribution…</span>
      <div className="h-6 w-40 animate-pulse rounded-full bg-slate-200" />
      <div className="h-9 w-72 max-w-full animate-pulse rounded-xl bg-slate-200" />
      <div className="h-64 animate-pulse rounded-3xl bg-emerald-900/15" />
      <div className="h-52 animate-pulse rounded-3xl bg-slate-100" />
    </div>
  );
}

export function MemberDistributionPage() {
  const query = useMemberDistribution();
  if (query.isPending) return <DistributionSkeleton />;
  if (query.isError)
    return (
      <div
        role="alert"
        className={`mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between ${cardClass}`}
      >
        <p className="text-sm text-slate-600">
          Your distribution could not be loaded.
        </p>
        <RefreshIconButton
          title="Try again"
          onClick={() => void query.refetch()}
        />
      </div>
    );
  if (!query.data?.enabled) return <Navigate to="/member" replace />;
  const data = query.data;
  return (
    <div className="space-y-5 pb-4 pt-2 sm:space-y-6">
      <Link
        to="/member"
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
      >
        <LuArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold leading-6 text-secondary-600">
            {data.financialYear.name}
          </p>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[#102e26] lg:text-3xl">
            Your distribution, explained
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
          <LuLockKeyhole className="h-3.5 w-3.5 text-emerald-700" />
          Only your individual share is shown
        </span>
      </header>
      {data.status === "UNAVAILABLE" ? (
        <section className={`flex items-start gap-3 ${cardClass}`}>
          <span className="shrink-0 rounded-2xl bg-amber-50 p-2.5 text-amber-700 ring-1 ring-inset ring-amber-100">
            <LuInfo className="h-5 w-5" />
          </span>
          <p className="text-sm leading-6 text-slate-600">{data.message}</p>
        </section>
      ) : (
        <DistributionNumbers data={data} />
      )}
    </div>
  );
}
