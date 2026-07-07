import { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { LoanDetailModal } from "@/components/loans/LoanDetailModal";
import { money } from "@/pages/admin/shared/adminFormatters";
import type { MeetingRecord, MeetingRoster, RolloverCandidate } from "../../types";
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
  dueDate?: string;
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
  onConfirmRollover: (loanId: string, periodNumber: number, confirmedAmount?: number) => void;
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
  onConfirmRollover,
  onWaiveRollover,
  onPost,
  onReverseItem,
  onAdjustItem,
}: Props) {
  const [search, setSearch] = useState("");
  const [detailLoanId, setDetailLoanId] = useState<string | null>(null);
  const [rolloverModal, setRolloverModal] = useState<RolloverCandidate | null>(null);
  const [rolloverAmount, setRolloverAmount] = useState("");
  const [waiveModal, setWaiveModal] = useState<RolloverCandidate | null>(null);
  const [waiveReason, setWaiveReason] = useState("");
  const blocked = !!busy || meeting.status === "CLOSED";

  const pendingRollovers = useMemo(
    () => rolloverCandidates.filter((c) => c.status === "PENDING"),
    [rolloverCandidates],
  );

  useEffect(() => {
    if (rolloverModal) setRolloverAmount(String(rolloverModal.proposedAmount));
  }, [rolloverModal]);

  const rows = useMemo<RepaymentRow[]>(() => {
    const meetingDate = meeting.meetingDate;
    const built = (roster?.members ?? []).flatMap((row) =>
      row.expectations.loans.active.map((loan) => {
        const status = loan.status ?? "ACTIVE";
        const dueDate = loanDueDate(loan) ?? undefined;
        return {
          key: `${meeting.id}-${row.member.id}-LOAN_REPAYMENT`,
          memberId: row.member.id,
          memberName: row.member.name,
          membershipNumber: row.member.membershipNumber,
          loanId: loan.id,
          loanNumber: loan.loanNumber ?? loan.id.slice(0, 8),
          outstanding: Number(loan.totalOutstanding ?? loan.outstandingPrincipal ?? 0),
          status,
          dueDate,
          bucket: loanRepaymentBucket(loan, meetingDate),
        };
      }),
    );
    return built.sort(compareLoansForRepayment);
  }, [meeting.id, meeting.meetingDate, roster]);

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
          <Button
            size="xs"
            icon={<TbMoneybagMoveBack size={14} />}
            disabled={blocked || amount <= 0 || overLimit}
            isLoading={busy === `collect-${meeting.id}`}
            onClick={() => onPost(r.memberId, r.loanId, amount)}
          >
            Post
          </Button>
        );
      },
    },
  ];

  const rolloverColumns: Column<RolloverCandidate>[] = [
    {
      key: "loan",
      header: "Loan",
      render: (r) => (
        <div>
          <p className="font-semibold text-ink-900">{r.loanNumber}</p>
          <p className="text-xs text-ink-500">{r.memberName} · {r.membershipNumber}</p>
        </div>
      ),
    },
    {
      key: "period",
      header: "Period",
      render: (r) => `Period ${r.periodNumber}`,
    },
    {
      key: "due",
      header: "Due",
      render: (r) => formatLoanDate(r.dueDate),
    },
    {
      key: "amount",
      header: "Rollover interest",
      render: (r) => money(r.proposedAmount),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <RowActionsMenu
          ariaLabel={`Rollover actions for ${r.memberName}`}
          items={[
            {
              key: "confirm",
              label: "Confirm rollover",
              disabled: blocked,
              onClick: () => setRolloverModal(r),
            },
            {
              key: "waive",
              label: "Waive rollover",
              variant: "danger",
              disabled: blocked,
              onClick: () => {
                setWaiveModal(r);
                setWaiveReason("");
              },
            },
          ]}
        />
      ),
    },
  ];

  const rowClassName = (r: RepaymentRow) =>
    ["OVERDUE", "DEFAULTED"].includes(r.status) ? "bg-red-50" : "";

  return (
    <div className="space-y-4">
      {pendingRollovers.length > 0 ? (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <FiAlertTriangle className="mt-0.5 shrink-0 text-lg" />
          <div>
            <p className="font-semibold">Loan rollovers awaiting confirmation</p>
            <p className="mt-1">
              {pendingRollovers.length} loan(s) are due for rollover this meeting week.
              Confirm or waive each rollover before posting repayments so outstanding amounts stay accurate.
            </p>
          </div>
        </div>
      ) : null}

      {rolloverCandidates.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-ink-900">Rollover due this meeting</h3>
            <Badge tone="warning">{pendingRollovers.length} pending</Badge>
          </div>
          <DataTable
            columns={rolloverColumns}
            rows={rolloverCandidates}
            getRowKey={(r) => `${r.loanId}-${r.periodNumber}`}
            emptyTitle="No rollovers due"
            emptyMessage="No loans require rollover confirmation this week."
          />
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
        <p className="text-sm text-ink-600">
          Post repayments for loans due this meeting week first, or pay ahead on other active loans below.
        </p>
        <input
          className="w-full max-w-xs rounded-lg border border-ink-200 px-3 py-2 text-sm sm:w-72"
          placeholder="Search loan or member"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-ink-900">Due this week / overdue</h3>
          <Badge tone="warning">{dueRows.length}</Badge>
        </div>
        <DataTable
          columns={columns}
          rows={dueRows}
          getRowKey={(r) => `due-${r.loanId}`}
          getRowClassName={rowClassName}
          emptyTitle="No loans due this week"
          emptyMessage="No overdue or due-this-week loans on the roster."
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-ink-900">Other active loans (advance payment)</h3>
          <Badge tone="neutral">{advanceRows.length}</Badge>
        </div>
        <DataTable
          columns={columns}
          rows={advanceRows}
          getRowKey={(r) => `advance-${r.loanId}`}
          emptyTitle="No other active loans"
          emptyMessage="All active loans are due this week or overdue."
        />
      </div>

      <Modal
        open={Boolean(rolloverModal)}
        title="Confirm loan rollover"
        subtitle="Edit the rollover interest amount if needed, then confirm."
        onClose={() => setRolloverModal(null)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRolloverModal(null)}>Cancel</Button>
            <Button
              variant="secondary2"
              disabled={blocked || !rolloverModal || Number(rolloverAmount) <= 0}
              isLoading={busy === `rollover-confirm-${rolloverModal?.loanId}`}
              onClick={() => {
                if (!rolloverModal) return;
                onConfirmRollover(
                  rolloverModal.loanId,
                  rolloverModal.periodNumber,
                  Number(rolloverAmount),
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
            <p><span className="font-semibold">Period:</span> {rolloverModal.periodNumber} · Due {formatLoanDate(rolloverModal.dueDate)}</p>
            <label className="block text-xs font-semibold text-ink-600">
              Rollover interest (KES)
              <input
                type="number"
                min={0}
                step="0.01"
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
                value={rolloverAmount}
                onChange={(e) => setRolloverAmount(e.target.value)}
              />
            </label>
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
