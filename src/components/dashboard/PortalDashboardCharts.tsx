import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { money, tone } from "@/pages/admin/shared/adminFormatters";
import type {
  ApprovalInboxItem,
  ExecutiveCharts,
  FundBalanceRow,
  LoanAgingRow,
} from "@/types/reports";
import {
  chartColors,
  chartTooltipStyle,
  formatStatusLabel,
} from "./portalDashboardUtils";

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center text-sm font-medium text-ink-500">
      {message}
    </div>
  );
}

export function MemberStatusChart({
  charts,
}: {
  charts: ExecutiveCharts | undefined;
}) {
  const breakdown = useMemo(() => {
    const rows = charts?.memberStatusBreakdown ?? [];
    return rows
      .map((row) => ({
        name: row.status,
        label: formatStatusLabel(row.status),
        value: row.count,
      }))
      .sort((a, b) => b.value - a.value);
  }, [charts]);

  const total = useMemo(
    () => breakdown.reduce((sum, item) => sum + item.value, 0),
    [breakdown],
  );

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h2 className="text-sm font-extrabold text-ink-900">
          Member status distribution
        </h2>
        <p className="mt-1 text-xs font-medium text-ink-500">
          {total.toLocaleString("en-KE")} members across {breakdown.length}{" "}
          statuses
        </p>
      </div>
      {breakdown.length > 0 ? (
        <div className="flex flex-col items-stretch gap-5 sm:flex-row sm:items-center xl:flex-col 2xl:flex-row">
          <div className="relative mx-auto h-[285px] w-[250px] shrink-0 xl:h-[245px] 2xl:h-[285px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdown}
                  cx="50%"
                  cy="50%"
                  dataKey="value"
                  nameKey="label"
                  innerRadius={65}
                  outerRadius={115}
                  paddingAngle={2}
                  cornerRadius={6}
                  strokeWidth={0}
                >
                  {breakdown.map((_, index) => (
                    <Cell
                      key={`status-${index}`}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => {
                    const count = Number(value ?? 0);
                    const percent =
                      total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
                    return [
                      `${count.toLocaleString("en-KE")} members (${percent}%)`,
                      String(name),
                    ];
                  }}
                  contentStyle={chartTooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-google text-[1.3rem] font-extrabold leading-none text-ink-900">
                {total.toLocaleString("en-KE")}
              </p>
              <p className="mt-1 text-[0.7rem] font-medium text-ink-500">
                Members
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {breakdown.map((item, index) => {
              const count = item.value;
              const percent = total > 0 ? (count / total) * 100 : 0;
              const color = chartColors[index % chartColors.length];
              return (
                <div
                  key={item.name}
                  className="flex min-w-0 items-center gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[0.78rem] font-semibold text-ink-700">
                        {item.label}
                      </p>
                      <p className="shrink-0 text-[0.78rem] font-bold text-ink-900">
                        {count.toLocaleString("en-KE")}
                      </p>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(percent, count > 0 ? 4 : 0))}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <p className="mt-0.5 text-[0.68rem] font-medium text-ink-500">
                      {percent.toFixed(1)}% of registry
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <ChartEmpty message="No member status data available" />
      )}
    </Card>
  );
}

export function FundBalancesChart({ funds }: { funds: FundBalanceRow[] }) {
  const chartData = useMemo(
    () =>
      [...funds]
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 8)
        .map((f) => ({ name: f.fund, value: f.balance })),
    [funds],
  );

  return (
    <Card className="p-4 xl:col-span-2">
      <h2 className="mb-3 text-sm font-extrabold text-ink-900">
        Fund balances
      </h2>
      {chartData.length > 0 ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: string) =>
                  value.length > 15 ? `${value.slice(0, 15)}…` : value
                }
              />
              <YAxis
                tickFormatter={(value) =>
                  `${Math.round(Number(value) / 1000)}k`
                }
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => money(value)}
                contentStyle={chartTooltipStyle}
              />
              <Bar dataKey="value" fill="#1f7a76" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty message="No fund balance data available" />
      )}
    </Card>
  );
}

export function LoanAgingBucketsChart({ aging }: { aging: LoanAgingRow[] }) {
  const chartData = useMemo(() => {
    const buckets = ["0-30 days", "30-60 days", "60-90 days", "90+ days"];
    const grouped = aging.reduce<Record<string, number>>((acc, loan) => {
      const key = loan.agingBucket;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return buckets.map((name) => ({
      name,
      value: grouped[name] ?? 0,
    }));
  }, [aging]);

  const hasData = chartData.some((row) => row.value > 0);

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-extrabold text-ink-900">
        Loan aging buckets
      </h2>
      {hasData ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [`${value} loans`, "Count"]}
                contentStyle={chartTooltipStyle}
              />
              <Bar dataKey="value" fill="#0369a1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty message="No active loans in aging report" />
      )}
    </Card>
  );
}

export function ContributionsTrendChart({
  charts,
}: {
  charts: ExecutiveCharts | undefined;
}) {
  const data = charts?.contributionsByMonth ?? [];

  return (
    <Card className="p-4 xl:col-span-2">
      <h2 className="mb-3 text-sm font-extrabold text-ink-900">
        Posted contributions (6 months)
      </h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient
                id="contributionsFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#0f766e" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
              tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [money(value), "Posted"]}
              contentStyle={chartTooltipStyle}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#0f766e"
              strokeWidth={2.5}
              fill="url(#contributionsFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function MemberGrowthChart({
  charts,
}: {
  charts: ExecutiveCharts | undefined;
}) {
  const data = charts?.membersJoinedByMonth ?? [];

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-extrabold text-ink-900">
        New member registrations (6 months)
      </h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="memberJoinsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [String(value), "New members"]}
              contentStyle={chartTooltipStyle}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#2563eb"
              strokeWidth={2.5}
              fill="url(#memberJoinsFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

const approvalColumns: Column<ApprovalInboxItem>[] = [
  {
    header: "Entity",
    cell: (row) => (
      <div>
        <p className="font-semibold text-ink-900">{row.entityType}</p>
        <p className="text-xs text-ink-500">{row.entityId}</p>
      </div>
    ),
  },
  {
    header: "Status",
    cell: (row) => <Badge tone={tone(row.status)}>{row.status}</Badge>,
  },
];

const loanWatchColumns: Column<LoanAgingRow>[] = [
  {
    header: "Loan",
    cell: (row) => (
      <div>
        <p className="font-semibold text-ink-900">{row.loanNumber}</p>
        <p className="text-xs text-ink-500">{row.member}</p>
      </div>
    ),
  },
  {
    header: "Aging",
    cell: (row) => <Badge>{row.agingBucket}</Badge>,
  },
  {
    header: "Outstanding",
    cell: (row) => (
      <span className="font-semibold">{money(row.outstandingBalance)}</span>
    ),
  },
];

export function PortalDashboardTables({
  approvals,
  aging,
  loading,
  approvalsHref,
  loansHref,
  showApprovals,
}: {
  approvals: ApprovalInboxItem[];
  aging: LoanAgingRow[];
  loading: boolean;
  approvalsHref: string;
  loansHref: string;
  showApprovals: boolean;
}) {
  const [search, setSearch] = useState("");
  const searchQuery = search.trim().toLowerCase();

  const watchlist = useMemo(() => {
    const sorted = [...aging].sort(
      (a, b) => b.outstandingBalance - a.outstandingBalance,
    );
    if (!searchQuery) return sorted.slice(0, 10);
    return sorted.filter(
      (row) =>
        row.loanNumber.toLowerCase().includes(searchQuery) ||
        row.member.toLowerCase().includes(searchQuery),
    );
  }, [aging, searchQuery]);

  return (
    <div className="">
      
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-extrabold text-ink-900">
            Loan portfolio watchlist
          </h2>
          <Link
            to={loansHref}
            className="text-xs font-bold text-brand-700 hover:underline"
          >
            View all loans
          </Link>
        </div>
        <DataTable
          search
          searchValue={search}
          onSearchChange={setSearch}
          hasSearched={searchQuery.length > 0}
          searchPlaceholder="Search by loan number or member name"
          searchAriaLabel="Search loan portfolio watchlist"
          columns={loanWatchColumns}
          rows={watchlist}
          getRowKey={(row) => row.loanNumber}
          showCheckboxes={false}
          showAutoNumber={false}
          tableLoading={loading}
          totalItems={watchlist.length}
          startIndex={watchlist.length ? 1 : 0}
          endIndex={watchlist.length}
          emptyTitle={searchQuery ? "No matching loans" : "No loans on watchlist"}
          emptyMessage={
            searchQuery
              ? "Try a different loan number or member name."
              : "No active or overdue loans in the aging report."
          }
        />
    </div>
  );
}
