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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
    : "rounded-2xl border border-ink-100 bg-white p-4 shadow-sm md:p-5 lg:p-6";

  if (loading) {
    return (
      <div className={shellClass}>
        <div className="flex items-center justify-center gap-3 py-10 text-sm font-semibold text-ink-600">
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
            <h3 className="text-lg font-bold text-ink-900">{title}</h3>
          ) : null}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800 lg:text-sm"
            >
              <FiRefreshCw className="h-4 w-4" />
              Refresh
            </button>
          ) : null}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-semibold text-ink-600">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-ink-100">
                  <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Date
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Amount
                  </th>
                  <th className="hidden px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500 lg:table-cell">
                    Payment mode
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-ink-50 last:border-0"
                  >
                    <td className="px-2 py-3 text-sm text-ink-800">
                      {formatDate(row.date)}
                      {row.subtitle ? (
                        <p className="text-xs text-ink-500">{row.subtitle}</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-3 text-sm font-semibold text-ink-900">
                      KSh {Number(row.amount).toLocaleString()}
                    </td>
                    <td className="hidden px-2 py-3 text-sm text-ink-700 lg:table-cell">
                      {formatPaymentMode(row.paymentMethod)}
                    </td>
                    <td className="px-2 py-3">
                      {row.status ? (
                        <Badge tone={statusTone(row.status)}>
                          {row.status.replace(/_/g, " ").toLowerCase()}
                        </Badge>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <article
                key={row.id}
                className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-500">
                      {formatDate(row.date)}
                    </p>
                    {row.subtitle ? (
                      <p className="mt-0.5 truncate text-sm font-bold text-ink-800">
                        {row.subtitle}
                      </p>
                    ) : null}
                  </div>
                  {row.status ? (
                    <Badge tone={statusTone(row.status)}>
                      {row.status.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <p className="font-google text-xl font-extrabold text-ink-950">
                    KSh {Number(row.amount).toLocaleString()}
                  </p>
                  {onDownloadReceipt ? (
                    <button
                      type="button"
                      onClick={() => onDownloadReceipt(row.id)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-100 text-brand-700"
                      aria-label="Download receipt"
                    >
                      <FiDownload className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                {row.paymentMethod ? (
                  <p className="mt-2 text-xs text-ink-500">
                    {formatPaymentMode(row.paymentMethod)}
                    {row.reference ? ` · ${row.reference}` : ""}
                  </p>
                ) : null}
              </article>
            ))}
          </div>

          <p className="mt-3 text-right text-xs font-semibold text-ink-500">
            {rows.length} transaction{rows.length === 1 ? "" : "s"}
          </p>
        </>
      )}
    </div>
  );
}
