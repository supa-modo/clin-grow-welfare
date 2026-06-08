import { FiDownload, FiRefreshCw } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Feedback";

export type CashTransactionRow = {
  id: string;
  date: string;
  amount: number;
  reference?: string | null;
  paymentMethod?: string | null;
  status?: string | null;
  subtitle?: string | null;
};

type Props = {
  title: string;
  rows: CashTransactionRow[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRefresh?: () => void;
  onDownloadReceipt?: (id: string) => void;
  embedded?: boolean;
};

function formatPaymentMode(method?: string | null) {
  if (!method) return "Cash";
  const normalized = method.toUpperCase();
  if (normalized === "CASH") return "Cash";
  if (normalized === "MPESA") return "M-Pesa";
  return method;
}

function statusTone(
  status?: string | null,
): "success" | "warning" | "danger" | "neutral" {
  const s = (status ?? "").toUpperCase();
  if (["POSTED", "PAID", "ALLOCATED", "ACTIVE", "COMPLETED"].includes(s))
    return "success";
  if (["PENDING", "PARTIAL"].includes(s)) return "warning";
  if (["FAILED", "REVERSED", "CANCELLED"].includes(s)) return "danger";
  return "neutral";
}

export function CashTransactionHistory({
  title,
  rows,
  loading = false,
  error = null,
  emptyMessage = "No transactions yet.",
  onRefresh,
  onDownloadReceipt,
  embedded = false,
}: Props) {
  const shellClass = embedded
    ? ""
    : "rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm lg:p-6";

  if (loading) {
    return (
      <div className={shellClass}>
        <div className="flex items-center justify-center gap-3 py-10 text-sm font-semibold text-slate-600">
          <Spinner />
          Loading history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={
          embedded ? "" : "rounded-2xl border border-red-200 bg-red-50 p-6"
        }
      >
        <p className="text-sm font-semibold text-red-700">{error}</p>
        {onRefresh ? (
          <Button
            size="xs"
            icon={<FiRefreshCw className="h-3.5 w-3.5" />}
            variant="secondary"
            className="mt-3"
            onClick={onRefresh}
          >
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={shellClass}>
      {title || onRefresh ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {title ? (
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          ) : null}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1 text-xs lg:text-sm underline underline-offset-4 font-semibold text-brand-700 hover:text-brand-800"
            >
              <FiRefreshCw className="h-4 w-4" />
              Refresh
            </button>
          ) : null}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-semibold text-slate-600">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                </th>
                <th className="hidden lg:block px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Payment mode
                </th>
                <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-2 py-3 text-sm text-slate-800">
                    {new Date(row.date).toLocaleDateString("en-KE", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {row.subtitle ? (
                      <p className="text-xs text-slate-500">{row.subtitle}</p>
                    ) : null}
                  </td>
                  <td className="px-2 py-3 text-sm font-semibold text-slate-900">
                    KSh {Number(row.amount).toLocaleString()}
                  </td>
                  <td className="hidden lg:block px-2 py-3 text-sm text-slate-700">
                    {formatPaymentMode(row.paymentMethod)}
                  </td>
                  <td className="px-2 py-3">
                    {row.status ? (
                      <Badge tone={statusTone(row.status)}>
                        {row.status.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-right text-xs font-semibold text-slate-500">
            {rows.length} transaction{rows.length === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}
