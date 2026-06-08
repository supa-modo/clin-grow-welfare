import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { contributionApi } from "@/services/contributionApi";
import { money } from "@/components/member/MemberCards";
import { Spinner } from "@/components/ui/Feedback";
import {
  MemberSectionCard,
  PeriodToggle,
  type TrendMonths,
} from "@/components/member/MemberPortalUi";

const chartTooltipStyle = {
  borderRadius: 12,
  borderColor: "#e2e8f0",
  fontSize: 12,
  padding: "6px 10px",
  color: "#374151",
};

export function MemberContributionsTrendChart() {
  const [months, setMonths] = useState<TrendMonths>(6);
  const [points, setPoints] = useState<Array<{ date: string; label: string; amount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    void contributionApi
      .myWeeklySavingsTrend(months)
      .then((data) => {
        if (!cancelled) setPoints(data.points);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load savings trend.");
          setPoints([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [months]);

  const total = points.reduce((sum, row) => sum + row.amount, 0);

  return (
    <MemberSectionCard
      title="Weekly savings trend"
      subtitle={`Posted contributions over the last ${months} months`}
      action={<PeriodToggle value={months} onChange={setMonths} />}
    >
      {loading ? (
        <div className="flex h-56 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <p className="flex h-56 items-center justify-center text-sm text-ink-500">
          {error}
        </p>
      ) : points.length === 0 ? (
        <p className="flex h-56 items-center justify-center text-sm text-ink-500">
          No weekly savings posted in this period yet.
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs font-semibold text-ink-500">
            Total posted:{" "}
            <span className="text-ink-900">{money(total)}</span>
          </p>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points}>
                <defs>
                  <linearGradient id="memberSavingsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(value) =>
                    Number(value) >= 1000
                      ? `${Math.round(Number(value) / 1000)}k`
                      : String(value)
                  }
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip
                  formatter={(value) => [money(Number(value)), "Weekly savings"]}
                  contentStyle={chartTooltipStyle}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  fill="url(#memberSavingsFill)"
                  dot={{ r: 3, fill: "#16a34a", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#15803d" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </MemberSectionCard>
  );
}
