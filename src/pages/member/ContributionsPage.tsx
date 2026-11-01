import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  LuTriangleAlert,
  LuCalendarDays,
  LuLandmark,
  LuPiggyBank,
  LuX,
} from "react-icons/lu";
import clsx from "clsx";
import DateInput from "@/components/ui/DateInput";
import Select from "@/components/ui/Select";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { RefreshIconButton } from "@/components/ui/RefreshIconButton";
import { api } from "@/services/api";
import { contributionApi } from "@/services/contributionApi";
import { money } from "@/components/member/MemberCards";
import { useAuthStore } from "@/store/auth";
import type {
  Contribution,
  ContributionType,
  MemberArrears,
  PaymentMethod,
  PostingStatus,
} from "@/types/contribution";

const TYPE_LABELS: Record<ContributionType, string> = {
  REGISTRATION: "Registration",
  SHARE_CAPITAL: "Share Capital",
  WEEKLY_SAVINGS: "Weekly Savings",
  WELFARE_KITTY: "Welfare Kitty",
  EMERGENCY_CONTRIBUTION: "Emergency",
  FINE_PAYMENT: "Fine",
  OTHER: "Other",
};

const TYPE_DOT: Record<ContributionType, string> = {
  REGISTRATION: "bg-violet-500",
  SHARE_CAPITAL: "bg-sky-600",
  WEEKLY_SAVINGS: "bg-emerald-600",
  WELFARE_KITTY: "bg-indigo-500",
  EMERGENCY_CONTRIBUTION: "bg-orange-500",
  FINE_PAYMENT: "bg-rose-500",
  OTHER: "bg-slate-400",
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK: "Bank",
  MPESA: "M-Pesa",
  TRANSFER: "Transfer",
  OTHER: "Other",
};

const STATUS_PILL: Record<PostingStatus, string> = {
  POSTED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  REVERSED: "bg-rose-50 text-rose-800 ring-rose-200",
};

const CONTRIBUTION_TYPES = Object.keys(TYPE_LABELS) as ContributionType[];
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const fieldClass =
  "mt-1 w-full rounded-[0.6rem] border border-slate-300 bg-white px-3 py-2 text-xs text-ink-800 outline-none transition focus:border-primary-600 focus:ring-1 focus:ring-primary-600 lg:text-sm";

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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type ListMeta = {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
};

type FinancialYear = { name: string; startDate: string; endDate: string };

function StatusPill({ status }: { status: PostingStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset",
        STATUS_PILL[status],
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}

export function MemberContributionsPage() {
  const userId = useAuthStore((state) => state.user?.id);
  const [arrears, setArrears] = useState<MemberArrears | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [type, setType] = useState("");
  const [month, setMonth] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [financialYear, setFinancialYear] = useState<FinancialYear | null>(
    null,
  );
  const filtersActive = Boolean(type || from || to);

  useEffect(() => {
    Promise.all([
      contributionApi.myArrears(),
      api.get<{ financialYear?: FinancialYear | null }>(
        "/member-portal/dashboard",
      ),
    ]).then(([{ arrears: a }, dash]) => {
      setArrears(a);
      setFinancialYear(dash.data.financialYear ?? null);
    });
  }, []);

  const history = useQuery({
    queryKey: ["member-contributions", userId, page, pageSize, type, from, to],
    queryFn: async () => {
      const result = await contributionApi.myContributions({
        page,
        pageSize,
        type: type || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      return { data: result.data, meta: result.meta as ListMeta };
    },
    placeholderData: keepPreviousData,
    gcTime: 0,
    retry: 1,
  });
  const contributions = history.data?.data ?? [];
  const meta = history.data?.meta ?? null;
  const loading = history.isFetching;

  const totalArrears = arrears ? arrears.welfareKitty.arrears : 0;
  const shareCapital = Number(arrears?.shareCapital.actual ?? 0);
  const weeklySavings = Number(arrears?.weeklySavings.actual ?? 0);
  const portfolioTotal = shareCapital + weeklySavings;
  const shareCapitalCap = Number(
    arrears?.shareCapital.maximumAllowed ?? arrears?.shareCapital.expected ?? 0,
  );
  const shareCapitalProgress =
    shareCapitalCap > 0
      ? Math.min(100, Math.round((shareCapital / shareCapitalCap) * 100))
      : 0;

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

  const clearFilters = () => {
    setType("");
    setMonth("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const columns = useMemo<Column<Contribution>[]>(
    () => [
      {
        key: "date",
        header: "Date",
        render: (row) => (
          <div className="min-w-0 py-1">
            <p className="whitespace-nowrap font-semibold text-slate-900">
              {formatDate(row.periodDate)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              <span className="sm:hidden">
                {TYPE_LABELS[row.contributionType] ?? row.contributionType}
                {row.meeting?.meetingNumber ? " · " : ""}
              </span>
              {row.meeting?.meetingNumber ?? (
                <span className="hidden sm:inline">Account entry</span>
              )}
            </p>
          </div>
        ),
      },
      {
        key: "type",
        header: "Type",
        headerClassName: "hidden sm:table-cell",
        cellClassName: "hidden sm:table-cell",
        render: (row) => (
          <span className="inline-flex items-center gap-2 whitespace-nowrap font-medium text-slate-800">
            <span
              aria-hidden="true"
              className={clsx(
                "h-2 w-2 shrink-0 rounded-full",
                TYPE_DOT[row.contributionType] ?? "bg-slate-400",
              )}
            />
            {TYPE_LABELS[row.contributionType] ?? row.contributionType}
          </span>
        ),
      },
      {
        key: "reference",
        header: "Reference",
        headerClassName: "hidden md:table-cell",
        cellClassName: "hidden md:table-cell",
        render: (row) => {
          const reference = row.receiptNo ?? row.paymentReference;
          return reference ? (
            <span className="font-mono text-xs text-slate-600">
              {reference}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          );
        },
      },
      {
        key: "method",
        header: "Method",
        headerClassName: "hidden lg:table-cell",
        cellClassName: "hidden lg:table-cell",
        render: (row) => (
          <span className="text-slate-600">
            {METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        headerClassName: "hidden sm:table-cell",
        cellClassName: "hidden sm:table-cell",
        render: (row) => <StatusPill status={row.status} />,
      },
      {
        key: "amount",
        header: "Amount",
        headerClassName: "text-right [&>span]:text-right",
        cellClassName: "text-right",
        render: (row) => (
          <div className="py-1">
            <p
              className={clsx(
                "whitespace-nowrap font-google text-[0.95rem] font-bold ",
                row.status === "REVERSED"
                  ? "text-slate-400 line-through"
                  : "text-slate-950",
              )}
            >
              {money(Number(row.amount))}
            </p>
            <div className="mt-1 sm:hidden">
              <StatusPill status={row.status} />
            </div>
          </div>
        ),
      },
    ],
    [],
  );

  const resolvedPageSize = meta?.pageSize ?? pageSize;
  const startIndex =
    meta && meta.total > 0 ? (meta.page - 1) * resolvedPageSize + 1 : 0;
  const endIndex = startIndex ? startIndex + contributions.length - 1 : 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-6">
      <header className="flex flex-wrap items-end justify-between gap-3 pt-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[#102e26] lg:text-3xl">
            Your Welfare contributions
          </h1>
        </div>
        {financialYear ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
            <LuCalendarDays className="h-3.5 w-3.5 text-emerald-700" />
            {financialYear.name} · {formatDate(financialYear.startDate)} –{" "}
            {formatDate(financialYear.endDate)}
          </span>
        ) : null}
      </header>

      <section
        aria-label="Portfolio balance"
        className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#083c32_0%,#075e46_65%,#087f5b_100%)] p-5 text-white shadow-[0_12px_30px_-12px_rgba(6,78,59,0.5)] sm:p-7"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full border-[40px] border-white/[0.06]"
        />
        <div className="grid gap-2 md:gap-6 lg:grid-cols-[1fr_1.3fr] lg:items-end lg:gap-10">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-50">
              Portfolio balance
            </p>
            <p className="mt-1 wrap-break-word font-google text-[2.1rem] font-extrabold lg:text-4xl">
              {money(portfolioTotal)}
            </p>
            <p className="hidden lg:block mt-1 text-sm text-emerald-50/85">
              Share capital and weekly savings combined
            </p>
          </div>
          <dl className="grid gap-5 border-t border-white/20 pt-5 sm:grid-cols-2 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div className="min-w-0">
              <dt className="flex items-center gap-2 text-xs text-emerald-50/85">
                <LuPiggyBank className="h-4 w-4" /> Weekly savings
              </dt>
              <dd className="mt-1 wrap-break-word font-google text-xl font-extrabold  sm:text-2xl">
                {money(weeklySavings)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="flex items-center gap-2 text-xs text-emerald-50/85">
                <LuLandmark className="h-4 w-4" /> Share capital
              </dt>
              <dd className="mt-1 wrap-break-word font-google text-xl font-extrabold  sm:text-2xl">
                {money(shareCapital)}
              </dd>
              {arrears && shareCapitalCap > 0 ? (
                <div className="mt-2">
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-white/15"
                    role="progressbar"
                    aria-valuenow={shareCapitalProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Share capital towards maximum"
                  >
                    <div
                      className="h-full rounded-full bg-emerald-300"
                      style={{ width: `${shareCapitalProgress}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-emerald-50/75">
                    {shareCapitalProgress}% of {money(shareCapitalCap)} maximum
                    ·{" "}
                    {arrears.shareCapital.status === "WINDOW_OPEN"
                      ? "window open"
                      : "window closed"}
                  </p>
                </div>
              ) : null}
            </div>
          </dl>
        </div>
      </section>

      <section aria-labelledby="contribution-history" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="contribution-history"
              className="flex items-center gap-3 text-base font-bold text-[#102e26]"
            >
              <span className="">Contribution history</span>
              <div className="w-px h-4  bg-gray-300" />
              <p className="text-xs text-slate-600">
                {meta
                  ? `${meta.total} record${meta.total === 1 ? "" : "s"}${filtersActive ? " match your filters" : ""}`
                  : "Posted contributions and receipts"}
              </p>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {filtersActive ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                <LuX className="h-3.5 w-3.5" /> Clear filters
              </button>
            ) : null}
            <RefreshIconButton
              size="sm"
              loading={loading}
              onClick={() => void history.refetch()}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Select
            label="Contribution type"
            placeholder=""
            value={type}
            onChange={(event) => applyType(event.target.value)}
            options={[
              { value: "", label: "All types" },
              ...CONTRIBUTION_TYPES.map((value) => ({
                value,
                label: TYPE_LABELS[value],
              })),
            ]}
          />
          <label className="block text-[0.75rem] font-medium text-ink-500 lg:text-[0.8rem]">
            Month
            <input
              type="month"
              value={month}
              onChange={(event) => applyMonth(event.target.value)}
              className={fieldClass}
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

        <DataTable
          showAutoNumber
          columns={columns}
          rows={contributions}
          getRowKey={(row) => row.id}
          getRowClassName={(row) =>
            row.status === "REVERSED" ? "bg-rose-50/30" : ""
          }
          tableLoading={loading}
          loadingSkeletonRows={6}
          hasSearched={filtersActive}
          emptyTitle={
            history.isError
              ? "Contributions could not be loaded"
              : filtersActive
                ? "No matching contributions"
                : "No contributions yet"
          }
          emptyMessage={
            history.isError
              ? "Use Refresh to try again."
              : filtersActive
                ? "No contributions match these filters."
                : "Your contribution history will appear here once the treasurer posts them."
          }
          currentPage={meta?.page ?? page}
          totalPages={meta?.totalPages ?? 1}
          totalItems={meta?.total ?? 0}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setPage}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          containerClassName="rounded-2xl shadow-[0_8px_32px_-24px_rgba(15,23,42,0.3)]"
        />
      </section>
    </div>
  );
}
