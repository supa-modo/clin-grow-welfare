import { useEffect, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Spinner } from '@/components/ui/Feedback';
import { loanApi } from '@/services/loanApi';
import type { Loan, LoanInterestCharge, LoanRepayment, LoanStatement } from '@/types/loan';
import { formatLoanDate, loanDueDate } from '@/lib/loanDates';

function money(n: number | string | undefined) {
  return `KES ${Number(n ?? 0).toLocaleString()}`;
}

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success',
  PARTIALLY_PAID: 'success',
  CLOSED: 'neutral',
  DEFAULTED: 'danger',
  OVERDUE: 'danger',
  SUBMITTED: 'warning',
  PENDING_MEETING_APPROVAL: 'warning',
  READY_FOR_DISBURSEMENT: 'warning',
  REJECTED: 'danger',
  IN_ROLLOVER: 'warning',
};

type Props = {
  loanId: string | null;
  open: boolean;
  onClose: () => void;
};

export function LoanDetailModal({ loanId, open, onClose }: Props) {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [statement, setStatement] = useState<LoanStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [waivingId, setWaivingId] = useState<string | null>(null);

  const reload = async (id: string) => {
    const detail = await loanApi.get(id);
    setLoan(detail.loan);
    setStatement(detail.statement);
  };

  useEffect(() => {
    if (!open || !loanId) {
      setLoan(null);
      setStatement(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loanApi
      .get(loanId)
      .then((detail) => {
        if (cancelled) return;
        setLoan(detail.loan);
        setStatement(detail.statement);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loanId]);

  const handleWaiveCharge = async (charge: LoanInterestCharge) => {
    if (!loan) return;
    const reason = window.prompt('Reason for waiving this interest charge?');
    if (!reason?.trim()) return;
    setWaivingId(charge.id);
    try {
      await loanApi.waiveInterestCharge(loan.id, charge.id, reason.trim());
      await reload(loan.id);
    } finally {
      setWaivingId(null);
    }
  };

  const repayments = (loan?.repayments ?? []).filter((r) => !r.reversedAt);
  const interestCharges = (loan?.interestCharges ?? []).filter((charge) => !charge.waivedAt);
  const dueDate = loan ? loanDueDate(loan) : undefined;

  const interestColumns: Column<LoanInterestCharge>[] = [
    {
      key: 'period',
      header: 'Period',
      render: (row) => `P${row.periodNumber}`,
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => new Date(row.chargeDate).toLocaleDateString(),
    },
    {
      key: 'amount',
      header: 'Interest',
      render: (row) => <span className="font-semibold">{money(row.interestAmount)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        row.periodNumber >= 2 ? (
          <Button
            size="xs"
            variant="secondary"
            disabled={waivingId === row.id}
            onClick={() => void handleWaiveCharge(row)}
          >
            Waive
          </Button>
        ) : null
      ),
    },
  ];

  const repaymentColumns: Column<LoanRepayment>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (r) => new Date(r.paymentDate).toLocaleDateString(),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (r) => <span className="font-semibold">{money(r.amount)}</span>,
    },
    {
      key: 'principal',
      header: 'Principal',
      render: (r) => money(r.principalPaid),
    },
    {
      key: 'interest',
      header: 'Interest',
      render: (r) => money(r.interestPaid),
    },
    {
      key: 'penalty',
      header: 'Penalty',
      render: (r) => money(r.penaltyPaid),
    },
    {
      key: 'method',
      header: 'Method',
      render: (r) => r.paymentMethod,
    },
  ];

  return (
    <Modal
      open={open}
      title={loan ? `Loan — ${loan.loanNumber}` : 'Loan details'}
      onClose={onClose}
      size="xl"
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : loan && statement ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div>
              <span className="font-semibold text-ink-600">Member:</span>{' '}
              {loan.member?.name ?? '—'}
            </div>
            <div>
              <span className="font-semibold text-ink-600">Status:</span>{' '}
              <Badge tone={STATUS_TONE[loan.status] ?? 'neutral'}>
                {loan.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div>
              <span className="font-semibold text-ink-600">Rate:</span> {loan.interestRate}% pm
            </div>
            <div>
              <span className="font-semibold text-ink-600">Applied:</span> {money(loan.requestedAmount)}
            </div>
            <div>
              <span className="font-semibold text-ink-600">Approved:</span>{' '}
              {loan.approvedAmount ? money(loan.approvedAmount) : '—'}
            </div>
            {loan.disbursedAt ? (
              <div>
                <span className="font-semibold text-ink-600">Disbursed:</span>{' '}
                {formatLoanDate(loan.disbursedAt)}
              </div>
            ) : null}
            {dueDate ? (
              <div>
                <span className="font-semibold text-ink-600">Due:</span>{' '}
                <span className="font-semibold text-amber-700">{formatLoanDate(dueDate)}</span>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-ink-200 bg-ink-50 p-4">
            <h3 className="mb-3 text-sm font-bold text-ink-800">Outstanding balance</h3>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div>
                <span className="text-ink-500">Disbursed</span>
                <p className="font-semibold text-ink-900">{money(statement.disbursed)}</p>
              </div>
              <div>
                <span className="text-ink-500">Interest accrued</span>
                <p className="font-semibold text-ink-900">{money(statement.totalInterest)}</p>
              </div>
              <div>
                <span className="text-ink-500">Penalties</span>
                <p className="font-semibold text-ink-900">{money(statement.totalPenalties)}</p>
              </div>
              <div>
                <span className="text-ink-500">Total repaid</span>
                <p className="font-semibold text-ink-900">{money(statement.totalRepaid)}</p>
              </div>
            </div>
            <p className="mt-3 border-t border-ink-200 pt-3 text-base font-bold text-ink-900">
              Total outstanding: {money(statement.outstanding)}
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-ink-800">Interest charges</h3>
            <DataTable
              columns={interestColumns}
              rows={interestCharges}
              getRowKey={(row) => row.id}
              emptyTitle="No interest charges"
              emptyMessage="Accrued interest will appear here."
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-ink-800">Repayment history</h3>
            <DataTable
              columns={repaymentColumns}
              rows={repayments}
              getRowKey={(r) => r.id}
              emptyTitle="No repayments yet"
              emptyMessage="Repayments will appear here once recorded."
            />
          </div>

          <div className="flex justify-end border-t border-ink-100 pt-4">
            <Button
              size="sm"
              variant="secondary"
              icon={<FiDownload size={13} />}
              onClick={() =>
                loanApi.downloadStatement(loan.id, `statement-${loan.loanNumber}.pdf`)
              }
            >
              Download Statement
            </Button>
          </div>
        </div>
      ) : (
        <p className="p-5 text-sm text-ink-500">Loan details could not be loaded.</p>
      )}
    </Modal>
  );
}
