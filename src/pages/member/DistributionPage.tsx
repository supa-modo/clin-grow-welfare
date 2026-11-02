import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import {
  LuArrowLeft,
  LuChevronDown,
  LuInfo,
  LuLockKeyhole,
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
      <span className="font-semibold text-slate-900">
        {memberDate(row.date)}
      </span>
    ),
  },

  {
    id: "meeting",
    header: "Meeting",
    cell: (row) => row.meeting || "Account entry",
  },
  {
    id: "shareCapital",
    header: "Share capital",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.shareCapital,
    cell: (row) => (
      <span className="block  font-semibold tabular-nums text-slate-900">
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
      <span className="block  font-semibold tabular-nums text-slate-900">
        {memberMoney(row.savings)}
      </span>
    ),
  },
];

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-2xl">
      <h2 className="mt-1.5 text-xl font-bold tracking-tight text-[#102e26]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
      ) : null}
    </div>
  );
}

function LedgerLine({
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
      className={`flex items-baseline justify-between gap-6 py-2.5 text-sm ${strong ? "font-bold text-[#102e26]" : "text-slate-600"}`}
    >
      <span className="min-w-0">
        {sign === "plus" ? (
          <span className="mr-2 font-semibold text-emerald-700">+</span>
        ) : null}
        {sign === "minus" ? (
          <span className="mr-2 font-semibold text-rose-700">−</span>
        ) : null}
        {label}
      </span>
      <span className="shrink-0 tabular-nums">{memberMoney(value)}</span>
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
    <section aria-label="Your contribution history" className="pt-10">
      <SectionTitle
        title="Contribution history"
        subtitle="Shares and savings by meeting or account entry, including corrections."
      />
      <div id="capital-history" className="mt-6">
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
            showAutoNumber
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
      className="border-b border-slate-200 pb-2"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)] lg:items-end">
        <div className="min-w-0">
          <p className="mt-3 text-sm font-medium text-slate-500">
            {approved
              ? "Approved income share"
              : "Projected year-end income share"}
          </p>
          <p className="mt-1 wrap-break-word font-google text-2xl font-extrabold  text-[#102e26] lg:text-3xl">
            {memberMoney(data.allocation.projectedShare)}
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            {approved
              ? "Your saved AGM-approved income allocation."
              : "A recorded-amounts estimate for the end of the financial year. Future income and contributions are not assumed."}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-slate-200 pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {stat.label}
              </dt>
              <dd className="mt-1 wrap-break-word font-google text-base font-extrabold tabular-nums text-[#102e26] sm:text-lg">
                {memberMoney(stat.value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function FormulaLine({
  mark,
  label,
  value,
  result = false,
}: {
  mark: string;
  label: string;
  value: number;
  result?: boolean;
}) {
  return (
    <li
      className={`flex items-baseline justify-between gap-6 py-3 ${result ? "font-bold text-[#102e26]" : "text-slate-600"}`}
    >
      <span className="min-w-0">
        <span
          className={`mr-3 inline-block w-4 text-center font-semibold ${result ? "text-emerald-800" : "text-slate-400"}`}
        >
          {mark}
        </span>
        {label}
      </span>
      <span className="shrink-0 tabular-nums">{memberMoney(value)}</span>
    </li>
  );
}

function CalculationSection({ data }: { data: DistributionView }) {
  const pct = data.allocation.percentage;
  const barWidth = Math.min(100, Math.max(pct, 1.5));
  const steps = [
    { mark: "", label: "Your capital", value: data.member.capital },
    { mark: "÷", label: "Total group capital", value: data.group.capital },
    { mark: "×", label: "Net shareable pool", value: data.group.shareablePool },
    {
      mark: "=",
      label: "Your income share",
      value: data.allocation.currentShare,
      result: true,
    },
  ];
  return (
    <section className="grid gap-10 border-b border-slate-200 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)] lg:gap-16">
      <div className="min-w-0">
        <SectionTitle
          title="How your share is calculated"
          subtitle="The welfare kitty is not part of the calculation."
        />
        <p className="mt-6 font-google text-lg font-semibold leading-7 text-[#102e26]">
          Your income share = (your capital ÷ total group capital) × net
          shareable pool
        </p>
        <div className="mt-8">
          <div className="flex items-end justify-between gap-3">
            <p className="text-xs text-slate-500">
              Your percentage of group capital
            </p>
            <p className="font-google text-2xl font-extrabold tabular-nums text-emerald-800">
              {pct.toLocaleString("en-KE", { maximumFractionDigits: 6 })}%
            </p>
          </div>

          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-[#075e46]"
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Group capital · {data.group.memberCount} capital accounts ·{" "}
            <span className="font-semibold tabular-nums text-slate-800">
              {memberMoney(data.group.capital)}
            </span>
          </p>
        </div>
      </div>
      <div className="min-w-0 lg:border-l lg:border-slate-200 lg:pl-10">
        {data.group.capital > 0 ? (
          <ol
            className="divide-y divide-slate-200"
            aria-label="Your calculation"
          >
            {steps.map((step) => (
              <FormulaLine key={step.label} {...step} />
            ))}
          </ol>
        ) : (
          <p className="text-sm leading-6 text-slate-600">
            No capital has been recorded, so no income share can be allocated
            yet.
          </p>
        )}
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Use the full capital values above when calculating, rather than the
          rounded percentage. The final one-cent rounding is reconciled across
          the group.
        </p>
      </div>
    </section>
  );
}

function PoolSection({ data }: { data: DistributionView }) {
  const b = data.group.breakdown;
  const segments = b
    ? [
        { label: "Loan interest", value: b.interest, color: "bg-emerald-700" },
        { label: "Fines", value: b.fines, color: "bg-amber-500" },
        { label: "Other income", value: b.otherIncome, color: "bg-sky-600" },
      ]
    : [];
  const segmentTotal = segments.reduce(
    (sum, item) => sum + Math.max(0, item.value),
    0,
  );
  return (
    <section className="border-b border-slate-200 py-10">
      <SectionTitle title="Shareable pool" subtitle="" />
      {b ? (
        <>
          {segmentTotal > 0 && (
            <div className="mt-5 pb-6">
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
          <div className="mt-4 lg:mt-6 grid gap-4 md:gap-6 lg:gap-10 xl:gap-14 lg:grid-cols-2 ">
            <div>
              <p className="border-b border-slate-200 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
                Income
              </p>
              <LedgerLine
                sign="plus"
                label="Recorded loan interest, net of reversals"
                value={b.interest}
              />
              <LedgerLine
                sign="plus"
                label="Recorded fine income"
                value={b.fines}
              />
              <LedgerLine
                sign="plus"
                label="Other recorded income"
                value={b.otherIncome}
              />
              <div className="border-t border-slate-200">
                <LedgerLine
                  label="Total recorded income"
                  value={b.income}
                  strong
                />
              </div>
            </div>
            <div>
              <p className="border-b border-slate-200 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">
                Deductions
              </p>
              <LedgerLine
                sign="minus"
                label="Recorded expenses"
                value={b.expenses}
              />
              <LedgerLine
                sign="minus"
                label="Distribution adjustments"
                value={b.adjustments}
              />
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Net pool = recorded income − expenses − distribution adjustments.
              </p>
            </div>
          </div>
          <div className="mt-4 lg:mt-6 flex flex-wrap items-baseline justify-between gap-3 border-t-2 border-[#102e26] pt-2 lg:pt-4">
            <span className="text-sm font-semibold text-[#102e26]">
              Net shareable pool
            </span>
            <span className="font-google text-2xl font-extrabold tabular-nums text-[#102e26]">
              {memberMoney(data.group.shareablePool)}
            </span>
          </div>
        </>
      ) : (
        <div className="mt-8 max-w-xl">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Approved shareable pool
          </p>
          <p className="mt-1 font-google text-2xl font-extrabold tabular-nums text-[#102e26]">
            {memberMoney(data.group.shareablePool)}
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
    <section className="border-b border-slate-200 py-10">
      <SectionTitle
        title={
          approved ? "Approved allocation basis" : "Current and year-end view"
        }
      />
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <caption className="sr-only">
            Recorded and projected distribution values
          </caption>
          <thead className="border-b border-slate-300 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="py-3 pr-4 font-semibold">
                Basis
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Recorded
              </th>
              <th scope="col" className="py-3 pl-4 text-right font-semibold">
                {secondLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value], index) => (
              <tr
                key={label}
                className={
                  index === rows.length - 1
                    ? "border-t-2 border-gray-500 font-bold text-[#102e26]"
                    : "border-b border-slate-100"
                }
              >
                <th
                  scope="row"
                  className={`py-3 pr-4 font-medium ${index === rows.length - 1 ? "font-bold" : "text-slate-600"}`}
                >
                  {label}
                </th>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {memberMoney(value)}
                </td>
                <td className="whitespace-nowrap py-3 pl-4 text-right font-semibold tabular-nums">
                  {memberMoney(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      <details open className="group border-b border-slate-200 py-8">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <span className="mt-1.5 block text-xl font-bold tracking-tight text-[#102e26]">
            Calculation notes and assumptions
          </span>
          <LuChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="mt-6 max-w-3xl space-y-4">
          {data.assumptions.map((note, index) => (
            <li key={note} className=" text-sm leading-6 text-slate-600">
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
    <div role="status" className="space-y-6 pt-6">
      <span className="sr-only">Loading your distribution…</span>
      <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
      <div className="h-10 w-80 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="h-16 w-64 animate-pulse rounded bg-emerald-900/10" />
      <div className="h-px bg-slate-200" />
      <div className="h-24 animate-pulse rounded bg-slate-100" />
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
        className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-slate-200 py-6"
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
    <div className="mx-auto w-full max-w-5xl pb-10 pt-2">

      {data.status === "UNAVAILABLE" ? (
        <section className="flex items-start gap-3 border-b border-slate-200 py-8">
          <LuInfo className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <p className="text-sm leading-6 text-slate-600">{data.message}</p>
        </section>
      ) : (
        <div className="">
          <DistributionNumbers data={data} />
        </div>
      )}
    </div>
  );
}
