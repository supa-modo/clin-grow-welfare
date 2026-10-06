import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "@/services/api";
import { ledgerApi } from "@/services/ledgerApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/Card";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/uiStore";
import type { FinancialYear } from "@/types/ledger";
const money = (v: unknown) =>
  `KES ${Number(v ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
type MemberRow = {
  id?: string;
  memberId: string;
  memberName: string;
  membershipNumber: string;
  shareBalance: number;
  savingsBalance: number;
  allocatedAmount: number;
  totalPayout: number;
  paidAt?: string;
  paymentReference?: string;
};
type Overview = {
  financialYear: FinancialYear;
  closing?: { id: string; status: string } | null;
  members: MemberRow[];
  blockers: string[];
  memberCapital: number;
  surplus: number;
  totalPayout: number;
  paidAmount: number;
  remainingPayout: number;
  welfareKitty: number;
  availableCash: number;
};
export function AgmDistributionPage() {
  const prefix = useLocation().pathname.startsWith("/officials")
    ? "/officials"
    : "/dashboard";
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const manage = permissions.includes("officialsPortal.yearEnd.manage"),
    approve = permissions.includes("officialsPortal.yearEnd.approve");
  const success = useUiStore((s) => s.toastSuccess),
    failure = useUiStore((s) => s.toastError);
  const [years, setYears] = useState<FinancialYear[]>([]),
    [year, setYear] = useState(""),
    [data, setData] = useState<Overview | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [action, setAction] = useState<
      "initiate" | "approve" | "post" | "finish" | MemberRow | null
    >(null),
    [reference, setReference] = useState(""),
    [method, setMethod] = useState("BANK");
  useEffect(() => {
    ledgerApi
      .listFinancialYears()
      .then((y) => {
        setYears(y);
        setYear(
          y.find((f) => ["OPEN", "CLOSING"].includes(f.status))?.id ??
            y[0]?.id ??
            "",
        );
      })
      .catch(() => setError("Unable to load financial years"));
  }, []);
  const load = async () => {
    if (!year) return;
    try {
      const r = await api.get(`/audit-year-end/year-end/${year}`);
      setData(r.data.data);
      setError("");
    } catch (e: any) {
      setError(
        e.response?.data?.error ?? "Unable to load distribution register",
      );
    }
  };
  useEffect(() => {
    setData(null);
    void load();
  }, [year]);
  const submit = async () => {
    if (!data || !action) return;
    setBusy(true);
    try {
      if (typeof action === "object")
        await api.post(`/audit-year-end/allocations/${action.id}/pay`, {
          paymentReference: reference,
          paymentMethod: method,
        });
      else
        await api.post(
          `/audit-year-end/year-end/${action === "initiate" ? year : data.closing?.id}/${action}`,
          {},
        );
      setAction(null);
      setReference("");
      await load();
      success("AGM register updated");
    } catch (e: any) {
      failure(e.response?.data?.error ?? "Unable to update AGM register");
    } finally {
      setBusy(false);
    }
  };
  const status = data?.closing?.status;
  return (
    <div className="space-y-6">
      <PageHeader
        title="AGM Distribution"
        subtitle="Return member shares and savings with their approved share of surplus. Retain the welfare kitty for the next year."
      />
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm font-semibold">
          Financial year{" "}
          <select
            aria-label="Financial year"
            className="ml-2 rounded-lg border p-2"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name} · {y.status}
              </option>
            ))}
          </select>
        </label>
        <Link
          className="text-brand-700 underline"
          to={`${prefix}/ledger/financial-years`}
        >
          Plan next financial year
        </Link>
        <Link className="text-brand-700 underline" to={`${prefix}/welfare`}>
          Welfare claims and expenses
        </Link>
        <Button variant="secondary" onClick={() => void load()}>
          Refresh
        </Button>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Member capital"
              value={money(data.memberCapital)}
            />
            <StatCard
              label="Distributable surplus"
              value={money(data.surplus)}
            />
            <StatCard
              label="Remaining payouts"
              value={money(data.remainingPayout)}
              detail={`Paid: ${money(data.paidAmount)}`}
            />
            <StatCard
              label="Welfare kitty retained"
              value={money(data.welfareKitty)}
            />
          </div>
          <div className="rounded-xl border bg-white p-5 space-y-3">
            <p className="font-semibold">
              {data.financialYear.status === "CLOSED"
                ? "Year closed"
                : (status?.replaceAll("_", " ") ??
                  "Review before approval")}{" "}
              · AGM:{" "}
              {data.financialYear.agmDate
                ? new Date(data.financialYear.agmDate).toLocaleDateString(
                    "en-KE",
                  )
                : "Not set"}
            </p>
            <p className="text-sm text-ink-600">
              Total member payouts: {money(data.totalPayout)}. Available
              bank/cash: {money(data.availableCash)}. Preparation freezes
              ordinary collections and lending. Record payments only after the
              money has been sent.
            </p>
            {data.blockers.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-4">
                <p className="font-semibold">
                  Resolve before preparing distribution
                </p>
                <ul className="list-disc pl-5 text-sm">
                  {data.blockers.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {manage &&
                (!status ||
                  ["READY_FOR_AGM", "PRECHECK_FAILED"].includes(status)) && (
                  <Button
                    disabled={busy || data.blockers.length > 0}
                    onClick={() => setAction("initiate")}
                  >
                    {status === "READY_FOR_AGM"
                      ? "Recalculate register"
                      : "Prepare distribution"}
                  </Button>
                )}
              {approve && status === "READY_FOR_AGM" && (
                <Button
                  disabled={busy || data.blockers.length > 0}
                  onClick={() => setAction("approve")}
                >
                  Record AGM approval
                </Button>
              )}
              {manage && status === "AGM_APPROVED" && (
                <Button disabled={busy} onClick={() => setAction("post")}>
                  Open payout register
                </Button>
              )}
              {manage &&
                status === "POSTED" &&
                data.financialYear.status === "CLOSING" && (
                  <Button
                    disabled={busy || data.remainingPayout !== 0}
                    onClick={() => setAction("finish")}
                  >
                    Close year after payouts
                  </Button>
                )}
            </div>
          </div>
          <DataTable
            rows={data.members}
            getRowKey={(m) => m.memberId}
            columns={[
              {
                key: "member",
                header: "Member",
                render: (m) => (
                  <div>
                    <strong>{m.memberName}</strong>
                    <p className="text-xs text-ink-500">{m.membershipNumber}</p>
                  </div>
                ),
              },
              {
                key: "shares",
                header: "Shares",
                render: (m) => money(m.shareBalance),
              },
              {
                key: "savings",
                header: "Weekly savings",
                render: (m) => money(m.savingsBalance),
              },
              {
                key: "surplus",
                header: "Surplus",
                render: (m) => money(m.allocatedAmount),
              },
              {
                key: "total",
                header: "Total payout",
                render: (m) => <strong>{money(m.totalPayout)}</strong>,
              },
              {
                key: "payment",
                header: "Payment",
                render: (m) =>
                  m.paidAt ? (
                    <div className="text-green-700">
                      Paid · {new Date(m.paidAt).toLocaleDateString("en-KE")}
                      <p className="text-xs">{m.paymentReference}</p>
                    </div>
                  ) : Number(m.totalPayout) === 0 ? (
                    "No amount due"
                  ) : manage &&
                    status === "POSTED" &&
                    data.financialYear.status === "CLOSING" ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setReference("");
                        setAction(m);
                      }}
                    >
                      Record disbursement
                    </Button>
                  ) : (
                    "Awaiting approval"
                  ),
              },
            ]}
          />
        </>
      )}
      <Modal
        open={action !== null}
        onClose={() => {
          if (!busy) setAction(null);
        }}
        title={
          typeof action === "object" && action
            ? `Record payout — ${action.memberName}`
            : "Confirm AGM step"
        }
        footer={
          <div className="flex justify-end gap-2 p-4">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              Cancel
            </Button>
            <Button
              isLoading={busy}
              disabled={
                typeof action === "object" && reference.trim().length < 3
              }
              onClick={() => void submit()}
            >
              Confirm
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-5">
          {typeof action === "object" && action ? (
            <>
              <p>
                Record the actual payment of{" "}
                <strong>{money(action.totalPayout)}</strong>. This clears this
                member’s shares, savings and allocated surplus.
              </p>
              <label className="block">
                Payment reference
                <input
                  aria-label="Payment reference"
                  className="mt-1 w-full rounded-lg border p-2"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  maxLength={120}
                />
              </label>
              <label className="block">
                Payment method
                <select
                  aria-label="Payment method"
                  className="mt-1 w-full rounded-lg border p-2"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="BANK">Bank transfer</option>
                  <option value="MPESA">M-Pesa</option>
                  <option value="CASH">Cash</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
            </>
          ) : (
            <p>
              {action === "initiate"
                ? "Freeze collections and prepare the exact member payout register after all loans have been settled."
                : action === "approve"
                  ? "Confirm that the AGM approved the displayed distribution amounts."
                  : action === "post"
                    ? "Close distributable income to surplus and open the register for recording actual payments."
                    : "Confirm all member payments are complete and the only remaining balance is the welfare kitty. Financial history will remain available."}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
