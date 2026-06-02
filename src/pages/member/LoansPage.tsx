import { useEffect, useState } from "react";
import { FiDownload, FiInfo, FiPlus } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Spinner, EmptyState } from "@/components/ui/Feedback";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import {
  ActiveLoanProgress,
  findActiveLoan,
  money,
} from "@/components/member/MemberCards";
import { loanApi } from "@/services/loanApi";
import { useUiStore } from "@/store/uiStore";
import type { Loan, LoanEligibility, LoanStatement } from "@/types/loan";

const STATUS_TONE: Record<
  string,
  "success" | "warning" | "danger" | "neutral"
> = {
  ACTIVE: "success",
  PARTIALLY_PAID: "success",
  CLOSED: "neutral",
  DEFAULTED: "danger",
  OVERDUE: "danger",
  SUBMITTED: "warning",
  PENDING_MEETING_APPROVAL: "warning",
  READY_FOR_DISBURSEMENT: "warning",
  REJECTED: "danger",
  IN_ROLLOVER: "warning",
  AGREEMENT_PENDING: "warning",
};

function getApiError(e: unknown): string {
  if (
    e &&
    typeof e === "object" &&
    "response" in e &&
    e.response &&
    typeof e.response === "object" &&
    "data" in e.response &&
    e.response.data &&
    typeof e.response.data === "object" &&
    "error" in e.response.data
  ) {
    return String(e.response.data.error);
  }
  return "Something went wrong. Please try again.";
}

export function MemberLoansPage() {
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [eligibility, setEligibility] = useState<LoanEligibility | null>(null);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [activeStatement, setActiveStatement] = useState<LoanStatement | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [showDetail, setShowDetail] = useState<{
    loan: Loan;
    statement: LoanStatement;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    requestedAmount: "",
    purpose: "",
    termWeeks: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [loanList, elig] = await Promise.all([
        loanApi.myLoans(),
        loanApi.myEligibility(),
      ]);
      setLoans(loanList);
      setEligibility(elig);
      const active = findActiveLoan(loanList);
      setActiveLoan(active);
      if (active) {
        const detail = await loanApi.myLoan(active.id);
        setActiveStatement(detail.statement);
      } else {
        setActiveStatement(null);
      }
    } catch {
      toastError("Could not load loans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openDetail = async (loan: Loan) => {
    try {
      const detail = await loanApi.myLoan(loan.id);
      setShowDetail(detail);
    } catch {
      toastError("Could not load loan details");
    }
  };

  const apply = async () => {
    if (!form.requestedAmount) return;
    setSaving(true);
    try {
      await loanApi.applyMember({
        requestedAmount: Number(form.requestedAmount),
        purpose: form.purpose || undefined,
        termWeeks: form.termWeeks ? Number(form.termWeeks) : undefined,
      });
      setShowApply(false);
      setForm({ requestedAmount: "", purpose: "", termWeeks: "" });
      toastSuccess("Application submitted", "Your loan application was sent for review.");
      await load();
    } catch (e: unknown) {
      toastError("Application failed", getApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const acknowledgeAgreement = async (loan: Loan) => {
    try {
      await loanApi.acknowledgeMyAgreement(loan.id);
      toastSuccess("Agreement acknowledged");
      await load();
    } catch (e: unknown) {
      toastError("Could not acknowledge", getApiError(e));
    }
  };

  const columns: Column<Loan>[] = [
    {
      key: "loanNumber",
      header: "Loan No",
      render: (l) => (
        <span className="font-mono text-xs font-semibold text-brand-700">
          {l.loanNumber}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (l) => money(l.approvedAmount ?? l.requestedAmount),
    },
    {
      key: "rate",
      header: "Rate",
      render: (l) => `${l.interestRate}% pm`,
    },
    {
      key: "status",
      header: "Status",
      render: (l) => (
        <Badge tone={STATUS_TONE[l.status] ?? "neutral"}>
          {l.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "date",
      header: "Applied",
      render: (l) => new Date(l.applicationDate).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "",
      render: (l) => (
        <div className="flex flex-wrap items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            icon={<FiInfo size={12} />}
            onClick={(e) => {
              e.stopPropagation();
              void openDetail(l);
            }}
          >
            Details
          </Button>
          {l.status === "AGREEMENT_PENDING" ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                icon={<FiDownload size={12} />}
                onClick={(e) => {
                  e.stopPropagation();
                  loanApi.downloadMyAgreement(l.id, l.loanNumber);
                }}
              >
                Agreement
              </Button>
              {!l.memberAcknowledgedAt ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    void acknowledgeAgreement(l);
                  }}
                >
                  Acknowledge
                </Button>
              ) : null}
            </>
          ) : null}
          {[
            "ACTIVE",
            "PARTIALLY_PAID",
            "IN_ROLLOVER",
            "OVERDUE",
            "DEFAULTED",
            "CLOSED",
          ].includes(l.status) ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<FiDownload size={12} />}
              onClick={(e) => {
                e.stopPropagation();
                loanApi.downloadMyStatement(l.id, l.loanNumber);
              }}
            >
              Statement
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Loans"
        subtitle="Track your loan history, outstanding balance, and apply for new loans"
        action={
          eligibility && !eligibility.hasActiveLoan ? (
            <Button icon={<FiPlus />} onClick={() => setShowApply(true)}>
              Apply for Loan
            </Button>
          ) : undefined
        }
      />

      {eligibility ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Max eligible"
            value={money(eligibility.maxEligible)}
            subtitle={`${eligibility.multiplier}× base`}
          />
          <StatCard
            label="Base amount"
            value={money(eligibility.baseAmount)}
            subtitle="Shares + savings"
          />
          <StatCard
            label="Status"
            value={eligibility.hasActiveLoan ? "Active loan" : "Eligible"}
            subtitle={
              eligibility.hasActiveLoan
                ? "Repay current loan first"
                : "Can apply now"
            }
          />
        </div>
      ) : null}

      {!loading ? (
        <ActiveLoanProgress
          loan={activeLoan}
          statement={activeStatement}
          onViewDetails={
            activeLoan
              ? () => void openDetail(activeLoan)
              : undefined
          }
        />
      ) : null}

      {eligibility?.hasActiveLoan ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <FiInfo className="shrink-0" />
          You have an active loan. Apply for a new loan once the current one is
          fully repaid.
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : loans.length === 0 ? (
        <EmptyState
          title="No loans yet"
          message="Apply for your first loan using the button above."
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              rows={loans}
              getRowKey={(l) => l.id}
              onRowClick={(l) => void openDetail(l)}
            />
          </div>
          <div className="space-y-3 md:hidden">
            {loans.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => void openDetail(l)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-brand-700">
                    {l.loanNumber}
                  </span>
                  <Badge tone={STATUS_TONE[l.status] ?? "neutral"}>
                    {l.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {money(l.approvedAmount ?? l.requestedAmount)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {l.interestRate}% pm ·{" "}
                  {new Date(l.applicationDate).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      <Modal
        open={showApply}
        title="Apply for Loan"
        onClose={() => setShowApply(false)}
        footer={
          <div className="flex justify-end gap-2 px-5 py-3">
            <Button variant="secondary" onClick={() => setShowApply(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void apply()}
              disabled={!form.requestedAmount}
              isLoading={saving}
              loadingText="Submitting…"
            >
              Submit Application
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-5">
          {eligibility ? (
            <div className="rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
              Maximum eligible:{" "}
              <strong>{money(eligibility.maxEligible)}</strong> (
              {eligibility.multiplier}× base)
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Requested Amount (KES) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.requestedAmount}
              onChange={(e) =>
                setForm({ ...form, requestedAmount: e.target.value })
              }
              max={eligibility?.maxEligible}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Purpose
            </label>
            <textarea
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={2}
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="Brief description of loan purpose…"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Preferred Term (weeks)
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.termWeeks}
              onChange={(e) =>
                setForm({ ...form, termWeeks: e.target.value })
              }
              placeholder="e.g. 12"
            />
          </div>
        </div>
      </Modal>

      {showDetail ? (
        <Modal
          open={!!showDetail}
          title={`Loan — ${showDetail.loan.loanNumber}`}
          onClose={() => setShowDetail(null)}
          size="lg"
        >
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-semibold text-slate-600">Status:</span>{" "}
                <Badge tone={STATUS_TONE[showDetail.loan.status] ?? "neutral"}>
                  {showDetail.loan.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <div>
                <span className="font-semibold text-slate-600">Rate:</span>{" "}
                {showDetail.loan.interestRate}% per month
              </div>
              <div>
                <span className="font-semibold text-slate-600">Applied:</span>{" "}
                {money(showDetail.loan.requestedAmount)}
              </div>
              {showDetail.loan.approvedAmount ? (
                <div>
                  <span className="font-semibold text-slate-600">
                    Approved:
                  </span>{" "}
                  {money(showDetail.loan.approvedAmount)}
                </div>
              ) : null}
              {showDetail.loan.purpose ? (
                <div className="col-span-2">
                  <span className="font-semibold text-slate-600">Purpose:</span>{" "}
                  {showDetail.loan.purpose}
                </div>
              ) : null}
            </div>
            {showDetail.statement ? (
              <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
                <h3 className="font-bold text-slate-900">Statement Summary</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Disbursed:</span>{" "}
                    <span className="font-semibold">
                      {money(showDetail.statement.disbursed)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Interest:</span>{" "}
                    <span className="font-semibold">
                      {money(showDetail.statement.totalInterest)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Penalties:</span>{" "}
                    <span className="font-semibold">
                      {money(showDetail.statement.totalPenalties)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Repaid:</span>{" "}
                    <span className="font-semibold text-green-700">
                      {money(showDetail.statement.totalRepaid)}
                    </span>
                  </div>
                  <div className="col-span-2 border-t border-slate-200 pt-2">
                    <span className="font-semibold text-slate-600">
                      Outstanding:
                    </span>{" "}
                    <span
                      className={`text-lg font-bold ${showDetail.statement.outstanding > 0 ? "text-red-700" : "text-green-700"}`}
                    >
                      {money(showDetail.statement.outstanding)}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
            {showDetail.loan.repayments &&
            showDetail.loan.repayments.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-900">
                  Repayment History
                </h3>
                <div className="space-y-1">
                  {showDetail.loan.repayments.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between border-b border-slate-50 pb-1 text-xs text-slate-600"
                    >
                      <span>
                        {new Date(r.paymentDate).toLocaleDateString()} —{" "}
                        {r.paymentMethod}
                      </span>
                      <span className="font-semibold">{money(r.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                icon={<FiDownload size={13} />}
                onClick={() =>
                  loanApi.downloadMyStatement(
                    showDetail.loan.id,
                    showDetail.loan.loanNumber,
                  )
                }
              >
                Download Full Statement
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
