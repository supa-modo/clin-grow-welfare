import { useMemo, useState } from "react";
import { FiAlertTriangle, FiChevronDown, FiChevronRight, FiRotateCcw } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { LoanDetailModal } from "@/components/loans/LoanDetailModal";
import { money } from "@/pages/admin/shared/adminFormatters";
import type { MeetingRecord, MeetingRoster, RolloverCandidate } from "../../types";
import { collectionDraftKey } from "../../utils";
import { PostedItemsCorrectionPanel } from "../PostedItemsCorrectionPanel";
import { TbMoneybagMoveBack } from "react-icons/tb";
import {
  compareLoansForRepayment,
  formatLoanDate,
  isLoanOverdue,
  loanDueDate,
  loanRepaymentBucket,
  type LoanRepaymentBucket,
} from "@/lib/loanDates";

type RepaymentRow = {
  key: string;
  memberId: string;
  memberName: string;
  membershipNumber: string;
  loanId: string;
  loanNumber: string;
  outstanding: number;
  status: string;
  applicationDate?: string;
  dueDate?: string;
  rolloverCount: number;
  rolloverCandidate?: RolloverCandidate;
  bucket: LoanRepaymentBucket;
};

type CollectionDraft = Record<
  string,
  {
    type: string;
    amount: string;
    reference: string;
    paymentMethod?: string;
    loanId?: string;
  }
>;

type Props = {
  meeting: MeetingRecord;
  roster: MeetingRoster | null;
  busy: string;
  collectionDraft: CollectionDraft;
  setCollectionDraft: React.Dispatch<React.SetStateAction<CollectionDraft>>;
  rolloverCandidates: RolloverCandidate[];
  rolloverLoading?: boolean;
  rolloverLoadError?: string | null;
  onRefreshRollovers?: () => void;
  onConfirmRollover: (loanId: string, periodNumber: number) => void;
  onWaiveRollover: (loanId: string, periodNumber: number, reason: string) => void;
  onPost: (memberId: string, loanId: string, amount: number) => void;
  onReverseItem?: (itemId: string, reason: string) => void;
  onAdjustItem?: (itemId: string, amount: number, reason: string) => void;
};

const PAYMENT_METHODS = ["CASH", "BANK", "MPESA", "TRANSFER", "OTHER"] as const;

function filterRows(rows: RepaymentRow[], search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) =>
    [r.memberName, r.membershipNumber, r.loanNumber].some((v) =>
      v.toLowerCase().includes(q),
    ),
  );
}

export function RepaymentsStep({
  meeting,
  roster,
  busy,
  collectionDraft,
  setCollectionDraft,
  rolloverCandidates,
  rolloverLoading,
  rolloverLoadError,
  onRefreshRollovers,
  onConfirmRollover,
  onWaiveRollover,
  onPost,
  onReverseItem,
  onAdjustItem,
}: Props) {
  const [search, setSearch] = useState("");
  const [detailLoanId, setDetailLoanId] = useState<string | null>(null);
  const [rolloverModal, setRolloverModal] = useState<RolloverCandidate | null>(null);
  const [waiveModal, setWaiveModal] = useState<RolloverCandidate | null>(null);
  const [waiveReason, setWaiveReason] = useState("");
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const blocked = !!busy || meeting.status === "CLOSED";

  const pendingRollovers = useMemo(
    () => rolloverCandidates.filter((c) => c.status === "PENDING"),
    [rolloverCandidates],
  );

  const rows = useMemo<RepaymentRow[]>(() => {
    const meetingDate = meeting.meetingDate;
    const candidateByLoan = new Map(
      rolloverCandidates.map((candidate) => [candidate.loanId, candidate]),
    );
    const built = (roster?.members ?? []).flatMap((row) =>
      row.expectations.loans.active.map((loan) => {
        const status = loan.status ?? "ACTIVE";
        const dueDate = loanDueDate(loan) ?? undefined;
        return {
          key: collectionDraftKey(meeting.id, row.member.id, "LOAN_REPAYMENT", loan.id),
          memberId: row.member.id,
          memberName: row.member.name,
          membershipNumber: row.member.membershipNumber,
          loanId: loan.id,
          loanNumber: loan.loanNumber ?? loan.id.slice(0, 8),
          outstanding: Number(loan.totalOutstanding ?? loan.outstandingPrincipal ?? 0),
          status,
          applicationDate: loan.applicationDate,
          dueDate,
          rolloverCount: loan.meetingRollovers?.length ?? loan.currentRolloverMonth ?? 0,
          rolloverCandidate: candidateByLoan.get(loan.id),
          bucket: loanRepaymentBucket(loan, meetingDate),
        };
      }),
    );
    return built.sort(compareLoansForRepayment);
  }, [meeting.id, meeting.meetingDate, rolloverCandidates, roster]);

  const dueRows = useMemo(
    () => filterRows(rows.filter((r) => r.bucket === "due"), search),
    [rows, search],
  );
  const advanceRows = useMemo(
    () => filterRows(rows.filter((r) => r.bucket === "advance"), search),
    [rows, search],
  );

  const columns: Column<RepaymentRow>[] = [
    {
      key: "loan",
      header: "Loan",
      render: (r) => (
        <button
          type="button"
          className="text-left hover:underline"
          onClick={() => setDetailLoanId(r.loanId)}
        >
          <p className="font-semibold text-brand-700">{r.loanNumber}</p>
          <p className="text-xs text-ink-500">
            {r.memberName} · {r.membershipNumber}
          </p>
        </button>
      ),
    },
    {
      key: "applied",
      header: "Applied",
      render: (r) => formatLoanDate(r.applicationDate),
    },
    {
      key: "due",
      header: "Due",
      render: (r) => {
        const overdue = isLoanOverdue(r.dueDate, meeting.meetingDate);
        return (
          <span className={overdue ? "font-semibold text-red-700" : "text-ink-700"}>
            {formatLoanDate(r.dueDate)}
          </span>
        );
      },
    },
    {
      key: "outstanding",
      header: "Outstanding",
      render: (r) => money(r.outstanding),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge
          size="sm"
          tone={
            ["OVERDUE", "DEFAULTED"].includes(r.status) ? "danger" : "success"
          }
        >
          {r.status.toLowerCase().replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "rollovers",
      header: "Rollovers",
      render: (r) => (
        <Badge tone={r.rolloverCount > 0 ? "warning" : "neutral"}>
          {r.rolloverCount}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (r) => {
        const draft = collectionDraft[r.key] ?? {
          type: "LOAN_REPAYMENT",
          amount: String(r.outstanding),
          reference: "",
          paymentMethod: "CASH",
          loanId: r.loanId,
        };
        const amount = Number(draft.amount || 0);
        const overLimit = amount > r.outstanding;
        return (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <input
                className={`w-28 rounded-lg border px-2 py-1 text-sm ${overLimit ? "border-red-400" : "border-ink-200"}`}
                value={draft.amount}
                onChange={(e) =>
                  setCollectionDraft((s) => ({
                    ...s,
                    [r.key]: {
                      ...(s[r.key] ?? {
                        type: "LOAN_REPAYMENT",
                        reference: "",
                        paymentMethod: "CASH",
                        loanId: r.loanId,
                      }),
                      amount: e.target.value,
                    },
                  }))
                }
              />
              <Button
                size="xs"
                variant="secondary"
                onClick={() =>
                  setCollectionDraft((s) => ({
                    ...s,
                    [r.key]: {
                      ...(s[r.key] ?? {
                        type: "LOAN_REPAYMENT",
                        reference: "",
                        paymentMethod: "CASH",
                        loanId: r.loanId,
                      }),
                      amount: String(r.outstanding),
                    },
                  }))
                }
              >
                Full
              </Button>
            </div>
            {overLimit ? (
              <p className="text-xs font-semibold text-red-700">
                Exceeds outstanding
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "payment",
      header: "Payment",
      render: (r) => {
        const draft = collectionDraft[r.key] ?? {
          type: "LOAN_REPAYMENT",
          amount: String(r.outstanding),
          reference: "",
          paymentMethod: "CASH",
          loanId: r.loanId,
        };
        return (
          <div className="flex flex-col gap-1">
            <select
              className="rounded-lg border border-ink-200 px-2 py-1 text-xs"
              value={draft.paymentMethod ?? "CASH"}
              onChange={(e) =>
                setCollectionDraft((s) => ({
                  ...s,
                  [r.key]: {
                    ...(s[r.key] ?? {
                      type: "LOAN_REPAYMENT",
                      amount: String(r.outstanding),
                      reference: "",
                      loanId: r.loanId,
                    }),
                    paymentMethod: e.target.value,
                  },
                }))
              }
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              className="w-full min-w-28 rounded-lg border border-ink-200 px-2 py-1 text-xs"
              placeholder="Receipt ref"
              value={draft.reference}
              onChange={(e) =>
                setCollectionDraft((s) => ({
                  ...s,
                  [r.key]: {
                    ...(s[r.key] ?? {
                      type: "LOAN_REPAYMENT",
                      amount: String(r.outstanding),
                      paymentMethod: "CASH",
                      loanId: r.loanId,
                    }),
                    reference: e.target.value,
                  },
                }))
              }
            />
          </div>
        );
      },
    },
    {
      key: "post",
      header: "",
      render: (r) => {
        const draft = collectionDraft[r.key] ?? {
          type: "LOAN_REPAYMENT",
          amount: String(r.outstanding),
          reference: "",
          paymentMethod: "CASH",
          loanId: r.loanId,
        };
        const amount = Number(draft.amount || 0);
        const overLimit = amount > r.outstanding;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="xs"
              icon={<TbMoneybagMoveBack size={14} />}
              disabled={blocked || amount <= 0 || overLimit}
              isLoading={busy === `collect-${meeting.id}`}
              onClick={() => onPost(r.memberId, r.loanId, amount)}
            >
              Post payment
            </Button>
            {r.rolloverCandidate ? (
              <>
                <Button
                  size="xs"
                  variant="secondary2"
                  icon={<FiRotateCcw size={13} />}
                  disabled={blocked}
                  onClick={() => setRolloverModal(r.rolloverCandidate ?? null)}
                >
                  {r.rolloverCandidate.chargeKind === "LATE_CHARGE" ? "Late charge" : "Rollover"}
                </Button>
                <RowActionsMenu
                  ariaLabel={`Override actions for ${r.memberName}`}
                  items={[
                    {
                      key: "waive",
                      label: "Waive rollover",
                      variant: "danger",
                      disabled: blocked,
                      onClick: () => {
                        setWaiveModal(r.rolloverCandidate ?? null);
                        setWaiveReason("");
                      },
                    },
                  ]}
                />
              </>
            ) : null}
          </div>
        );
      },
    },
  ];

  const rowClassName = (r: RepaymentRow) =>
    ["OVERDUE", "DEFAULTED"].includes(r.status) ? "bg-red-50" : "";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Due queue</p>
          <p className="mt-1 text-2xl font-extrabold text-ink-900">{dueRows.length}</p>
          <p className="text-xs text-ink-500">Overdue, due today, or due within 2 days</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Rollover decisions</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-900">{pendingRollovers.length}</p>
          <p className="text-xs text-amber-700">Must be confirmed or waived</p>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Other active loans</p>
          <p className="mt-1 text-2xl font-extrabold text-ink-900">{advanceRows.length}</p>
          <p className="text-xs text-ink-500">Available for advance repayment</p>
        </div>
      </div>

      {pendingRollovers.length > 0 ? (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <FiAlertTriangle className="mt-0.5 shrink-0 text-lg" />
          <div>
            <p className="font-semibold">Loan rollovers awaiting confirmation</p>
            <p className="mt-1">
              {pendingRollovers.length} loan(s) need a decision. Post the member&apos;s
              repayment first. If no further payment is being made, use Rollover;
              use Waive only as a reasoned override.
            </p>
          </div>
        </div>
      ) : null}

      {rolloverLoading ? (
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm text-ink-700">
          Checking due rollovers before this step can be completed...
        </div>
      ) : null}
      {rolloverLoadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div>
            <p className="font-semibold">Rollover check could not be loaded</p>
            <p className="mt-1">{rolloverLoadError}. Repayments remain blocked until this check succeeds.</p>
          </div>
          <Button size="sm" variant="secondary" disabled={blocked} onClick={onRefreshRollovers}>
            Retry check
          </Button>
        </div>
      ) : null}

      {onReverseItem && onAdjustItem ? (
        <PostedItemsCorrectionPanel
          meeting={meeting}
          busy={busy}
          collectionTypes={["LOAN_REPAYMENT"]}
          onReverse={onReverseItem}
          onAdjust={onAdjustItem}
        />
      ) : null}
      <LoanDetailModal
        loanId={detailLoanId}
        open={Boolean(detailLoanId)}
        onClose={() => setDetailLoanId(null)}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-ink-900">Repayments due now</h3>
          <p className="text-sm text-ink-600">
            Clear overdue loans and loans due by {formatLoanDate(
              new Date(new Date(meeting.meetingDate).getTime() + 2 * 86_400_000).toISOString(),
            )} before moving to later loans.
          </p>
        </div>
        <input
          className="w-full max-w-xs rounded-lg border border-ink-200 px-3 py-2 text-sm sm:w-72"
          placeholder="Search loan or member"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <DataTable
          columns={columns}
          rows={dueRows}
          getRowKey={(r) => `due-${r.loanId}`}
          getRowClassName={rowClassName}
          emptyTitle="No loans due now"
          emptyMessage="No active loan is overdue or due within two days of this meeting."
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ink-50"
          aria-expanded={advanceOpen}
          onClick={() => setAdvanceOpen((value) => !value)}
        >
          <div>
            <p className="text-sm font-bold text-ink-900">Other active loans</p>
            <p className="text-xs text-ink-500">
              Due on later dates; expand to record an advance payment.
            </p>
          </div>
          <span className="flex items-center gap-2">
            <Badge tone="neutral">{advanceRows.length}</Badge>
            {advanceOpen ? <FiChevronDown /> : <FiChevronRight />}
          </span>
        </button>
        {advanceOpen ? (
          <div className="border-t border-ink-100 p-3">
            <DataTable
              columns={columns}
              rows={advanceRows}
              getRowKey={(r) => `advance-${r.loanId}`}
              emptyTitle="No other active loans"
              emptyMessage="All active loans are in the due queue."
            />
          </div>
        ) : null}
      </div>

      <Modal
        open={Boolean(rolloverModal)}
        title={rolloverModal?.chargeKind === "LATE_CHARGE" ? "Confirm constitutional late charge" : "Confirm loan rollover"}
        subtitle="The server will recalculate interest from the balance remaining after today's repayment."
        onClose={() => setRolloverModal(null)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRolloverModal(null)}>Cancel</Button>
            <Button
              variant="secondary2"
              disabled={blocked || !rolloverModal}
              isLoading={busy === `rollover-confirm-${rolloverModal?.loanId}`}
              onClick={() => {
                if (!rolloverModal) return;
                onConfirmRollover(
                  rolloverModal.loanId,
                  rolloverModal.periodNumber,
                );
                setRolloverModal(null);
              }}
            >
              Confirm rollover
            </Button>
          </div>
        )}
      >
        {rolloverModal ? (
          <div className="space-y-3 text-sm">
            <p><span className="font-semibold">Loan:</span> {rolloverModal.loanNumber} — {rolloverModal.memberName}</p>
            <p><span className="font-semibold">Applied:</span> {formatLoanDate(rolloverModal.applicationDate)} · Disbursed {formatLoanDate(rolloverModal.disbursedAt)}</p>
            <p><span className="font-semibold">Period:</span> {rolloverModal.periodNumber} · Due {formatLoanDate(rolloverModal.dueDate)}</p>
            <p><span className="font-semibold">Current outstanding:</span> {money(rolloverModal.outstandingBalance)} · {rolloverModal.rolloverCount} prior rollover(s)</p>
            <p>
              <span className="font-semibold">
                {rolloverModal.chargeKind === "LATE_CHARGE" ? "Calculated one-time late charge:" : "Calculated rollover interest:"}
              </span>{' '}
              {money(rolloverModal.proposedAmount)}
            </p>
            <p className="text-xs text-ink-500">
              This preview is refreshed after repayments. The final amount is recalculated and locked by the server when you confirm.
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(waiveModal)}
        title="Waive loan rollover"
        subtitle="Provide a reason if rollover was applied in error."
        onClose={() => setWaiveModal(null)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setWaiveModal(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={blocked || !waiveModal || waiveReason.trim().length < 3}
              isLoading={busy === `rollover-waive-${waiveModal?.loanId}`}
              onClick={() => {
                if (!waiveModal) return;
                onWaiveRollover(waiveModal.loanId, waiveModal.periodNumber, waiveReason.trim());
                setWaiveModal(null);
              }}
            >
              Waive rollover
            </Button>
          </div>
        )}
      >
        {waiveModal ? (
          <div className="space-y-3 text-sm">
            <p><span className="font-semibold">Loan:</span> {waiveModal.loanNumber} — {waiveModal.memberName}</p>
            <label className="block text-xs font-semibold text-ink-600">
              Waiver reason (required)
              <textarea
                className="mt-1 min-h-[88px] w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
