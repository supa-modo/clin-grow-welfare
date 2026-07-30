import { useEffect, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { TbHeartbeat, TbTool } from 'react-icons/tb';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Spinner } from '@/components/ui/Feedback';
import { NotificationModal } from '@/components/ui/NotificationModal';
import { loanApi } from '@/services/loanApi';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/auth';
import { getApiError } from '@/pages/admin/shared/adminFormatters';
import type {
  Loan,
  LoanInterestCharge,
  LoanIntegrityResult,
  LoanMeetingRollover,
  LoanRepayment,
  LoanStatement,
} from '@/types/loan';
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
  const [waivingId, setWaivingId] = useState<string | null>(null);
  const [integrity, setIntegrity] = useState<LoanIntegrityResult | null>(null);
  const [auditingIntegrity, setAuditingIntegrity] = useState(false);
  const [repairingIntegrity, setRepairingIntegrity] = useState(false);
  const [repairConfirmOpen, setRepairConfirmOpen] = useState(false);
  const toastSuccess = useUiStore((state) => state.toastSuccess);
  const toastError = useUiStore((state) => state.toastError);
  const user = useAuthStore((state) => state.user);
  const canRepairIntegrity = Boolean(
    user?.roles.includes('SystemAdmin')
      || user?.permissions.includes('officialsPortal.loans.postRepayment'),
  );

  const reload = async (id: string) => {
    const detail = await loanApi.get(id);
    setLoan(detail.loan);
    setStatement(detail.statement);
  };

  useEffect(() => {
    if (!open || !loanId) {
      return;
    }
    let cancelled = false;
    loanApi
      .get(loanId)
      .then((detail) => {
        if (cancelled) return;
        setIntegrity(null);
        setLoan(detail.loan);
        setStatement(detail.statement);
      })
    return () => {
      cancelled = true;
    };
  }, [open, loanId]);

  const handleIntegrityAudit = async () => {
    if (!loan) return;
    setAuditingIntegrity(true);
    try {
      const result = await loanApi.auditIntegrity(loan.id);
      setIntegrity(result);
      if (result.healthy) {
        toastSuccess('Loan integrity verified', `${loan.loanNumber} passed every integrity check.`);
      }
    } catch (error) {
      toastError('Integrity check failed', getApiError(error));
    } finally {
      setAuditingIntegrity(false);
    }
  };

  const handleIntegrityRepair = async (reason: string) => {
    if (!loan || !reason.trim()) return;
    setRepairingIntegrity(true);
    try {
      const result = await loanApi.repairIntegrity(loan.id, reason.trim());
      setIntegrity(result.after);
      await reload(loan.id);
      setRepairConfirmOpen(false);
      toastSuccess(
        'Loan tracking repaired',
        result.repairedCodes.length
          ? `${result.repairedCodes.length} deterministic discrepancy record(s) corrected and audited.`
          : 'No automatically repairable discrepancy remained.',
      );
    } catch (error) {
      toastError('Loan repair failed', getApiError(error));
    } finally {
      setRepairingIntegrity(false);
    }
  };

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
  const interestCharges = loan?.interestCharges ?? [];
  const rollovers = loan?.meetingRollovers ?? [];
  const confirmedRollovers = rollovers.filter((row) => row.status === 'CONFIRMED');
  const accumulatedRolloverInterest = interestCharges
    .filter((charge) => charge.periodNumber >= 2 && !charge.waivedAt)
    .reduce((sum, charge) => sum + Number(charge.interestAmount), 0);
  const dueDate = loan ? loanDueDate(loan) : undefined;
  const loading = Boolean(open && loanId && loan?.id !== loanId);

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
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.waivedAt ? 'neutral' : 'success'}>
          {row.waivedAt ? 'Waived' : 'Applied'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        row.periodNumber >= 2 && !row.waivedAt ? (
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

  const rolloverColumns: Column<LoanMeetingRollover>[] = [
    {
      key: 'period',
      header: 'Period',
      render: (row) => `P${row.periodNumber}`,
    },
    {
      key: 'meeting',
      header: 'Meeting',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-800">{row.meeting?.meetingNumber ?? 'Meeting unavailable'}</p>
          <p className="text-xs text-ink-500">{formatLoanDate(row.meeting?.meetingDate)}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Interest',
      render: (row) => money(row.confirmedAmount ?? row.proposedAmount),
    },
    {
      key: 'status',
      header: 'Resolution',
      render: (row) => (
        <div>
          <Badge tone={row.status === 'CONFIRMED' ? 'warning' : row.status === 'WAIVED' ? 'neutral' : 'danger'}>
            {row.status.toLowerCase()}
          </Badge>
          {row.waiverReason ? <p className="mt-1 max-w-xs text-xs text-ink-500">{row.waiverReason}</p> : null}
        </div>
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
      size="full"
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
              <span className="font-semibold text-ink-600">Applied on:</span>{' '}
              {formatLoanDate(loan.applicationDate)}
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
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3 xl:grid-cols-6">
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
              <div>
                <span className="text-ink-500">Confirmed rollovers</span>
                <p className="font-semibold text-ink-900">{confirmedRollovers.length}</p>
              </div>
              <div>
                <span className="text-ink-500">Rollover interest</span>
                <p className="font-semibold text-ink-900">{money(accumulatedRolloverInterest)}</p>
              </div>
            </div>
            <p className="mt-3 border-t border-ink-200 pt-3 text-base font-bold text-ink-900">
              Total outstanding: {money(statement.outstanding)}
            </p>
          </div>

          {integrity ? (
            <section className={`rounded-xl border p-4 ${
              integrity.healthy
                ? 'border-green-200 bg-green-50'
                : 'border-amber-200 bg-amber-50/60'
            }`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-ink-900">
                    {integrity.healthy ? 'Integrity verified' : 'Integrity discrepancies found'}
                  </h3>
                  <p className="mt-1 text-xs text-ink-600">
                    {integrity.errorCount} error(s), {integrity.warningCount} warning(s) checked at{' '}
                    {new Date(integrity.generatedAt).toLocaleString()}.
                  </p>
                </div>
                {!integrity.healthy
                  && integrity.issues.some((issue) => issue.repairable)
                  && canRepairIntegrity ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<TbTool />}
                      disabled={repairingIntegrity}
                      onClick={() => setRepairConfirmOpen(true)}
                    >
                      Fix safe discrepancies
                    </Button>
                  ) : null}
              </div>
              {!integrity.healthy ? (
                <div className="mt-3 space-y-2">
                  {integrity.issues.map((issue, index) => (
                    <article
                      key={`${issue.code}-${index}`}
                      className="rounded-lg border border-white/80 bg-white/80 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-ink-900">{issue.code.replace(/_/g, ' ')}</p>
                          <p className="mt-1 text-xs text-ink-600">{issue.message}</p>
                        </div>
                        <Badge tone={issue.repairable ? 'success' : issue.severity === 'ERROR' ? 'danger' : 'warning'}>
                          {issue.repairable ? 'Safe automatic fix' : 'Manual review'}
                        </Badge>
                      </div>
                      {issue.expected !== undefined || issue.actual !== undefined ? (
                        <p className="mt-2 text-xs text-ink-500">
                          Expected: <strong>{String(issue.expected ?? '—')}</strong>
                          {' · '}Recorded: <strong>{String(issue.actual ?? '—')}</strong>
                        </p>
                      ) : null}
                    </article>
                  ))}
                  {integrity.issues.some((issue) => !issue.repairable) ? (
                    <p className="text-xs font-semibold text-amber-800">
                      Financial journals, repayment allocations, and missing rollover decisions are never
                      silently rewritten. Items marked manual review require a controlled correction.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <div>
            <h3 className="mb-2 text-sm font-bold text-ink-800">Interest periods</h3>
            <DataTable
              columns={interestColumns}
              rows={interestCharges}
              getRowKey={(row) => row.id}
              emptyTitle="No interest charges"
              emptyMessage="Applied and waived interest periods will appear here."
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-ink-800">Rollover history</h3>
            <DataTable
              columns={rolloverColumns}
              rows={rollovers}
              getRowKey={(row) => row.id}
              emptyTitle="No rollover history"
              emptyMessage="This loan has not had a rollover confirmed or waived."
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

          <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 pt-4">
            <Button
              size="sm"
              variant="secondary"
              icon={<TbHeartbeat size={15} />}
              isLoading={auditingIntegrity}
              disabled={auditingIntegrity}
              onClick={() => void handleIntegrityAudit()}
            >
              Check integrity
            </Button>
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
          <NotificationModal
            isOpen={repairConfirmOpen}
            onClose={() => setRepairConfirmOpen(false)}
            title="Fix safe loan discrepancies?"
            message="Only deterministic tracking fields such as outstanding principal, period counters, status, and next due date will be corrected. Financial journals, interest amounts, repayments, and rollover decisions will not be changed automatically. Every correction is audit logged."
            confirmText={repairingIntegrity ? 'Fixing…' : 'Fix discrepancies'}
            showInput
            inputType="textarea"
            inputLabel="Reason for repair"
            inputPlaceholder="Explain why this controlled repair is being applied"
            inputRequired
            onConfirm={(reason) => void handleIntegrityRepair(reason)}
          />
        </div>
      ) : (
        <p className="p-5 text-sm text-ink-500">Loan details could not be loaded.</p>
      )}
    </Modal>
  );
}
