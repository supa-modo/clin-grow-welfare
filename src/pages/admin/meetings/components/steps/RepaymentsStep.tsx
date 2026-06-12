import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { LoanDetailModal } from "@/components/loans/LoanDetailModal";
import { money } from "@/pages/admin/shared/adminFormatters";
import type { MeetingRecord, MeetingRoster } from "../../types";
import { PostedItemsCorrectionPanel } from "../PostedItemsCorrectionPanel";
import { TbMoneybagMoveBack } from "react-icons/tb";

type RepaymentRow = {
  key: string;
  memberId: string;
  memberName: string;
  membershipNumber: string;
  loanId: string;
  loanNumber: string;
  outstanding: number;
  status: string;
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
  onPost: (memberId: string, loanId: string, amount: number) => void;
  onReverseItem?: (itemId: string, reason: string) => void;
  onAdjustItem?: (itemId: string, amount: number, reason: string) => void;
};

const PAYMENT_METHODS = ["CASH", "BANK", "MPESA", "TRANSFER", "OTHER"] as const;

export function RepaymentsStep({
  meeting,
  roster,
  busy,
  collectionDraft,
  setCollectionDraft,
  onPost,
  onReverseItem,
  onAdjustItem,
}: Props) {
  const [search, setSearch] = useState("");
  const [detailLoanId, setDetailLoanId] = useState<string | null>(null);
  const blocked = !!busy || meeting.status === "CLOSED";

  const rows = useMemo<RepaymentRow[]>(() => {
    return (roster?.members ?? []).flatMap((row) =>
      row.expectations.loans.active.map((loan) => ({
        key: `${meeting.id}-${row.member.id}-LOAN_REPAYMENT`,
        memberId: row.member.id,
        memberName: row.member.name,
        membershipNumber: row.member.membershipNumber,
        loanId: loan.id,
        loanNumber: loan.loanNumber ?? loan.id.slice(0, 8),
        outstanding: Number(
          (loan as { totalOutstanding?: number }).totalOutstanding ??
            loan.outstandingPrincipal ??
            0,
        ),
        status: (loan as { status?: string }).status ?? "ACTIVE",
      })),
    );
  }, [meeting.id, roster]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.memberName, r.membershipNumber, r.loanNumber].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [rows, search]);

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

  return (
    <div className="space-y-3">
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
      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={(r) => r.loanId}
        getRowClassName={(r) =>
          ["OVERDUE", "DEFAULTED"].includes(r.status) ? "bg-red-50" : ""
        }
        search
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search loan or member"
        emptyTitle="No repayments"
        emptyMessage="No active loans on the meeting roster."
      />
    </div>
  );
}
