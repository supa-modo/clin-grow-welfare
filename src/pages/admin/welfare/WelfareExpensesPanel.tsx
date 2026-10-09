import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { ledgerApi } from "@/services/ledgerApi";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/uiStore";
import type { FinancialYear } from "@/types/ledger";
type Expense = {
  id: string;
  description: string;
  payee: string;
  amount: number;
  status: string;
  paymentReference?: string;
  financialYear: { name: string };
};
export function WelfareExpensesPanel() {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []),
    approve = permissions.includes("officialsPortal.welfareClaims.approve"),
    pay = permissions.includes("officialsPortal.welfareClaims.pay");
  const success = useUiStore((s) => s.toastSuccess),
    failure = useUiStore((s) => s.toastError);
  const [rows, setRows] = useState<Expense[]>([]),
    [years, setYears] = useState<FinancialYear[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [action, setAction] = useState<{
    kind: "new" | "approve" | "pay" | "reject";
    expense?: Expense;
  } | null>(null);
  const [form, setForm] = useState({
    financialYearId: "",
    description: "",
    payee: "",
    amount: "",
    paymentReference: "",
  });
  const load = async () => {
    try {
      const [r, y] = await Promise.all([
        api.get("/welfare/expenses"),
        ledgerApi.listFinancialYears(),
      ]);
      setRows(r.data.data);
      setYears(y.filter((f) => ["OPEN", "CLOSING"].includes(f.status)));
      setError("");
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Unable to load welfare expenses");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const submit = async () => {
    if (!action) return;
    setBusy(true);
    try {
      if (action.kind === "new")
        await api.post("/welfare/expenses", {
          financialYearId: form.financialYearId,
          description: form.description,
          payee: form.payee,
          amount: Number(form.amount),
        });
      else
        await api.post(
          `/welfare/expenses/${action.expense?.id}/${action.kind}`,
            { paymentReference: form.paymentReference, reason:form.description },
        );
      setAction(null);
      await load();
      success("Welfare expense updated");
    } catch (e: any) {
      failure(e.response?.data?.error ?? "Unable to update expense");
    } finally {
      setBusy(false);
    }
  };
  const money = (v: number) =>
    `KES ${Number(v).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <section className="space-y-4 rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Welfare kitty expenses</h2>
          <p className="text-sm text-ink-600">
            Record AGM and welfare costs here. Approved payments reduce the
            restricted kitty and cash, preserving members’ distributable
            savings.
          </p>
        </div>
        {approve && (
          <Button
            disabled={busy || !years.length}
            onClick={() => {
              setForm({
                financialYearId: years[0]?.id ?? "",
                description: "",
                payee: "",
                amount: "",
                paymentReference: "",
              });
              setAction({ kind: "new" });
            }}
          >
            Add expense
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <DataTable
        rows={rows}
        getRowKey={(e) => e.id}
        columns={[
          {
            key: "description",
            header: "Expense / payee",
            render: (e) => (
              <div>
                <strong>{e.description}</strong>
                <p className="text-xs text-ink-500">
                  {e.payee} · {e.financialYear.name}
                </p>
              </div>
            ),
          },
          { key: "amount", header: "Amount", render: (e) => money(e.amount) },
          {
            key: "status",
            header: "Status",
            render: (e) => (
              <div>
                {e.status}
                <p className="text-xs">{e.paymentReference}</p>
              </div>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            render: (e) => (
              <div className="flex items-center justify-end gap-2">
                {e.status === "SUBMITTED" && approve ? (
                  <Button size="sm" disabled={busy} onClick={() => setAction({ kind: "approve", expense: e })}>Approve</Button>
                ) : e.status === "APPROVED" && pay ? (
                  <Button size="sm" disabled={busy} onClick={() => { setForm({ ...form, paymentReference: "" }); setAction({ kind: "pay", expense: e }); }}>Record payment</Button>
                ) : null}
                {approve && ["SUBMITTED", "APPROVED"].includes(e.status) ? (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => { setForm({ ...form, description: "" }); setAction({ kind: "reject", expense: e }); }}>Reject / cancel</Button>
                ) : null}
              </div>
            ),
          },
        ]}
        emptyTitle="No welfare expenses"
        emptyMessage="AGM and other approved welfare costs will appear here."
      />
      <Modal
        open={!!action}
        title={
          action?.kind === 'reject' ? 'Reject unpaid expense' : action?.kind === "new"
            ? "Add welfare expense"
            : action?.kind === "approve"
              ? "Approve welfare expense"
              : "Record welfare expense payment"
        }
        onClose={() => {
          if (!busy) setAction(null);
        }}
        footer={
          <div className="flex justify-end gap-2 p-4">
            <Button
              disabled={busy}
              variant="secondary"
              onClick={() => setAction(null)}
            >
              Cancel
            </Button>
            <Button
              isLoading={busy}
              disabled={
                action?.kind === 'reject' ? form.description.trim().length<3 : action?.kind === "new"
                  ? !form.financialYearId ||
                    form.description.trim().length < 5 ||
                    form.payee.trim().length < 2 ||
                    Number(form.amount) <= 0
                  : action?.kind === "pay"
                    ? form.paymentReference.trim().length < 3
                    : false
              }
              onClick={() => void submit()}
            >
              Confirm
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-5">
          {action?.kind === "new" ? (
            <>
              <label className="block">
                Financial year
                <select
                  className="mt-1 w-full rounded-lg border p-2"
                  value={form.financialYearId}
                  onChange={(e) =>
                    setForm({ ...form, financialYearId: e.target.value })
                  }
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </label>
              {(["description", "payee", "amount"] as const).map((field) => (
                <label className="block capitalize" key={field}>
                  {field}
                  {field === "amount" ? " (KES)" : ""}
                  <input
                    aria-label={`Expense ${field}`}
                    type={field === "amount" ? "number" : "text"}
                    step={field === "amount" ? "0.01" : undefined}
                    className="mt-1 w-full rounded-lg border p-2"
                    value={form[field]}
                    onChange={(e) =>
                      setForm({ ...form, [field]: e.target.value })
                    }
                  />
                </label>
              ))}
            </>
          ) : (
            <>
              <p>
                {action?.expense?.description} — {action?.expense?.payee}:{" "}
                <strong>{money(action?.expense?.amount ?? 0)}</strong>
              </p>
              {action?.kind==='reject'?<label className="block">Reason for rejection<input aria-label="Expense rejection reason" className="mt-1 w-full rounded-lg border p-2" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>:action?.kind === "pay" ? (
                <>
                  <p>
                    Confirm the actual payment has been sent. This deducts the
                    expense from the welfare kitty.
                  </p>
                  <label className="block">
                    Payment reference
                    <input
                      aria-label="Expense payment reference"
                      className="mt-1 w-full rounded-lg border p-2"
                      value={form.paymentReference}
                      onChange={(e) =>
                        setForm({ ...form, paymentReference: e.target.value })
                      }
                    />
                  </label>
                </>
              ) : (
                <p>Approve this expense for payment from the welfare kitty.</p>
              )}
            </>
          )}
        </div>
      </Modal>
    </section>
  );
}
