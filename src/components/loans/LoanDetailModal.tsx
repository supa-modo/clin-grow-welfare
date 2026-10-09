import { useEffect, useMemo, useState } from 'react';
import { FiChevronDown, FiDownload } from 'react-icons/fi';
import { TbHeartbeat, TbTool } from 'react-icons/tb';
import clsx from 'clsx';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Spinner } from '@/components/ui/Feedback';
import { NotificationModal } from '@/components/ui/NotificationModal';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
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
  return `KES ${Number(n ?? 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
}

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

type StatusLook = {
  tone: BadgeTone;
  shell: string;
  bar: string;
  track: string;
};

function statusLook(status: string): StatusLook {
  if (['OVERDUE', 'DEFAULTED', 'RECOVERY', 'WRITTEN_OFF', 'REJECTED'].includes(status)) {
    return {
      tone: 'danger',
      shell: 'border-red-200 bg-gradient-to-br from-red-50 via-white to-rose-50',
      bar: 'bg-red-600',
      track: 'bg-red-100',
    };
  }
  if (status === 'IN_ROLLOVER') {
    return {
      tone: 'warning',
      shell: 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50',
      bar: 'bg-amber-500',
      track: 'bg-amber-100',
    };
  }
  if (['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_MEETING_APPROVAL', 'APPROVED', 'AGREEMENT_PENDING', 'READY_FOR_DISBURSEMENT'].includes(status)) {
    return {
      tone: 'warning',
      shell: 'border-sky-200 bg-gradient-to-br from-sky-50 via-white to-slate-50',
      bar: 'bg-sky-600',
      track: 'bg-sky-100',
    };
  }
  if (status === 'CLOSED') {
    return {
      tone: 'neutral',
      shell: 'border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-50',
      bar: 'bg-slate-700',
      track: 'bg-slate-200',
    };
  }
  return {
    tone: 'success',
    shell: 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-green-50',
    bar: 'bg-emerald-600',
    track: 'bg-emerald-100',
  };
}

function duePresentation(status: string, dueIso: string | undefined) {
  if (status === 'CLOSED') return { label: 'Settled', value: null as string | null, overdue: false };
  if (status === 'WRITTEN_OFF') return { label: 'Written off', value: null, overdue: false };
  if (!dueIso) return { label: 'Due date', value: 'Not set', overdue: false };
  const overdue = ['OVERDUE', 'DEFAULTED', 'RECOVERY'].includes(status) || new Date(dueIso).getTime() < Date.now();
  return {
    label: overdue ? 'Overdue since' : 'Next due',
    value: formatLoanDate(dueIso),
    overdue,
  };
}

type InterestPeriodRow = {
  id: string;
  periodNumber: number;
  charges: LoanInterestCharge[];
  rollovers: LoanMeetingRollover[];
};

function buildPeriodRows(charges: LoanInterestCharge[], rollovers: LoanMeetingRollover[]): InterestPeriodRow[] {
  const numbers = new Set<number>();
  for (const charge of charges) numbers.add(charge.periodNumber);
  for (const rollover of rollovers) numbers.add(rollover.periodNumber);
  return [...numbers]
    .sort((left, right) => left - right)
    .map((periodNumber) => {
      const periodCharges = charges.filter((charge) => charge.periodNumber === periodNumber);
      return {
        id: periodCharges[0]?.id ?? `period-${periodNumber}`,
        periodNumber,
        charges: periodCharges,
        rollovers: rollovers.filter((rollover) => rollover.periodNumber === periodNumber),
      };
    });
}

function rolloverTone(status: LoanMeetingRollover['status']): BadgeTone {
  if (status === 'CONFIRMED') return 'warning';
  if (status === 'WAIVED') return 'neutral';
  return 'danger';
}

function periodInterest(row: InterestPeriodRow) {
  return row.charges.reduce((sum, charge) => sum + Number(charge.interestAmount), 0);
}

function periodDate(row: InterestPeriodRow) {
  const dated = row.charges[0]?.chargeDate ?? row.rollovers[0]?.confirmedAt ?? row.rollovers[0]?.meeting?.meetingDate;
  return dated ? formatLoanDate(dated) : '—';
}

type DetailTab = 'periods' | 'repayments';

type Props = {
  loanId: string | null;
  open: boolean;
  onClose: () => void;
};

export function LoanDetailModal({ loanId, open, onClose }: Props) {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [statement, setStatement] = useState<LoanStatement | null>(null);
  const [tab, setTab] = useState<DetailTab>('periods');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
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
    setTab('periods');
    setSelectedPeriodId(null);
    loanApi
      .get(loanId)
      .then((detail) => {
        if (cancelled) return;
        setIntegrity(null);
        setLoan(detail.loan);
        setStatement(detail.statement);
      });
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

  const repayments = (loan?.repayments ?? []).filter((row) => !row.reversedAt);
  const reversedCount = (loan?.repayments ?? []).filter((row) => row.reversedAt).length;
  const interestCharges = loan?.interestCharges ?? [];
  const rollovers = loan?.meetingRollovers ?? [];
  const periodRows = useMemo(
    () => buildPeriodRows(interestCharges, rollovers),
    [interestCharges, rollovers],
  );
  const selectedPeriod = periodRows.find((row) => row.id === selectedPeriodId) ?? null;
  const accumulatedRolloverInterest = interestCharges
    .filter((charge) => charge.periodNumber >= 2 && !charge.waivedAt)
    .reduce((sum, charge) => sum + Number(charge.interestAmount), 0);
  const dueDate = loan ? loanDueDate(loan) : undefined;
  const loading = Boolean(open && loanId && loan?.id !== loanId);

  const look = loan ? statusLook(loan.status) : statusLook('ACTIVE');
  const due = loan ? duePresentation(loan.status, dueDate) : null;
  const disbursed = Number(statement?.disbursed ?? 0);
  const interest = Number(statement?.totalInterest ?? 0);
  const penalties = Number(statement?.totalPenalties ?? 0);
  const repaid = Number(statement?.totalRepaid ?? 0);
  const outstanding = Number(statement?.outstanding ?? loan?.totalOutstanding ?? loan?.outstandingPrincipal ?? 0);
  const principal = Number(loan?.outstandingPrincipal ?? 0);
  const obligation = disbursed + interest + penalties;
  const progress = obligation > 0 ? Math.max(0, Math.min(100, Math.round((repaid / obligation) * 100))) : 0;
  const showPrincipalSplit = Math.abs(principal - outstanding) > 0.5 && principal > 0;
  const hasDisbursement = Boolean(loan?.disbursedAt);

  const periodColumns: Column<InterestPeriodRow>[] = [
    {
      key: 'period',
      header: 'Period',
      render: (row) => <span className="font-semibold text-ink-900">P{row.periodNumber}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => periodDate(row),
    },
    {
      key: 'principal',
      header: 'Principal',
      render: (row) => (row.charges[0] ? money(row.charges[0].principalBalance) : '—'),
    },
    {
      key: 'interest',
      header: 'Interest',
      render: (row) => <span className="font-semibold">{row.charges.length ? money(periodInterest(row)) : '—'}</span>,
    },
    {
      key: 'charge',
      header: 'Charge',
      render: (row) => {
        if (!row.charges.length) return <span className="text-ink-400">None</span>;
        const waived = row.charges.every((charge) => charge.waivedAt);
        return <Badge tone={waived ? 'neutral' : 'success'}>{waived ? 'Waived' : 'Applied'}</Badge>;
      },
    },
    {
      key: 'rollover',
      header: 'Rollover',
      render: (row) => {
        if (!row.rollovers.length) return <span className="text-ink-400">None</span>;
        const latest = row.rollovers[row.rollovers.length - 1];
        if (!latest) return null;
        return (
          <Badge tone={rolloverTone(latest.status)}>
            {row.rollovers.length > 1 ? `${row.rollovers.length} · ` : ''}
            {statusLabel(latest.status)}
          </Badge>
        );
      },
    },
    {
      key: 'more',
      header: 'More',
      render: (row) => (
        <FiChevronDown
          aria-hidden
          className={clsx(
            'h-4 w-4 text-ink-400 transition-transform',
            selectedPeriodId === row.id && 'rotate-180 text-ink-700',
          )}
        />
      ),
    },
  ];

  const repaymentColumns: Column<LoanRepayment>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (row) => formatLoanDate(row.paymentDate),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => <span className="font-semibold">{money(row.amount)}</span>,
    },
    {
      key: 'principal',
      header: 'Principal',
      render: (row) => money(row.principalPaid),
    },
    {
      key: 'interest',
      header: 'Interest',
      render: (row) => money(row.interestPaid),
    },
    {
      key: 'penalty',
      header: 'Penalty',
      render: (row) => money(row.penaltyPaid),
    },
    {
      key: 'method',
      header: 'Method',
      render: (row) => (
        <div>
          <p>{row.paymentMethod}</p>
          {row.paymentReference ? <p className="text-xs text-ink-500">{row.paymentReference}</p> : null}
        </div>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={loan ? loan.loanNumber : 'Loan details'}
      subtitle={loan?.member ? `${loan.member.name} · ${loan.member.membershipNumber}` : undefined}
      onClose={onClose}
      size="full"
      footer={loan && statement && !loading ? (
        <div className="flex flex-wrap justify-end gap-2">
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
            onClick={() => loanApi.downloadStatement(loan.id, `statement-${loan.loanNumber}.pdf`)}
          >
            Download statement
          </Button>
        </div>
      ) : undefined}
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : loan && statement && due ? (
        <div className="space-y-4">
          <section className={clsx('rounded-2xl border p-4 shadow-sm sm:p-5', look.shell)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-ink-500">Outstanding</p>
                <p className="mt-1 font-google text-3xl font-extrabold tracking-tight text-ink-950">{money(outstanding)}</p>
                {showPrincipalSplit ? (
                  <p className="mt-1 text-xs text-ink-600">Principal still owed {money(principal)}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge tone={look.tone}>{statusLabel(loan.status)}</Badge>
                <div className={clsx('rounded-xl bg-white/80 px-3 py-2 text-right ring-1 ring-black/5', due.overdue && 'ring-red-200')}>
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-500">{due.label}</p>
                  <p className={clsx('text-sm font-extrabold', due.overdue ? 'text-red-700' : 'text-ink-900')}>
                    {due.value ?? formatLoanDate(loan.closedAt)}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-ink-600">
              {loan.interestRate}% per month
              {' · '}
              Applied {formatLoanDate(loan.applicationDate)}
              {loan.disbursedAt ? ` · Disbursed ${formatLoanDate(loan.disbursedAt)}` : ' · Not disbursed'}
              {loan.approvedAmount != null && Number(loan.approvedAmount) !== Number(loan.requestedAmount)
                ? ` · Approved ${money(loan.approvedAmount)} of ${money(loan.requestedAmount)} requested`
                : ''}
            </p>
            {loan.purpose ? <p className="mt-1 line-clamp-2 text-xs text-ink-500">{loan.purpose}</p> : null}

            <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl bg-white/85 ring-1 ring-black/5 sm:grid-cols-4">
              {[
                { label: 'Disbursed', value: money(disbursed) },
                { label: 'Interest', value: money(interest) },
                { label: 'Penalties', value: money(penalties) },
                { label: 'Repaid', value: money(repaid) },
              ].map((fact) => (
                <div key={fact.label} className="px-3 py-2.5">
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-500">{fact.label}</p>
                  <p className="mt-0.5 text-sm font-extrabold tabular-nums text-ink-900">{fact.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-ink-700">Repayment progress</span>
                <span className="font-extrabold tabular-nums text-ink-950">{hasDisbursement ? `${progress}%` : '—'}</span>
              </div>
              <div
                className="relative h-2 rounded-full"
                role="progressbar"
                aria-valuenow={hasDisbursement ? progress : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Repayment progress"
              >
                <div className={clsx('absolute inset-0 rounded-full', look.track)} />
                <div
                  className={clsx('absolute inset-y-0 left-0 rounded-full transition-all duration-500', look.bar)}
                  style={{ width: `${hasDisbursement ? progress : 0}%` }}
                />
                <span
                  className="absolute top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full border-[3px] border-white bg-white shadow-md"
                  style={{ left: `clamp(0px, calc(${hasDisbursement ? progress : 0}% - 9px), calc(100% - 18px))` }}
                >
                  <span className={clsx('absolute inset-[2px] rounded-full', look.bar)} />
                </span>
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-ink-600">
                <span>{money(repaid)} repaid</span>
                <span>{hasDisbursement ? `${money(obligation)} to clear` : 'Progress starts after disbursement'}</span>
              </div>
            </div>
          </section>

          {integrity ? (
            <section className={clsx(
              'rounded-xl border p-4',
              integrity.healthy ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50/60',
            )}>
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

          <SegmentedTabs<DetailTab>
            aria-label="Loan activity"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'periods', label: 'Interest periods', count: periodRows.length },
              { value: 'repayments', label: 'Repayments', count: repayments.length },
            ]}
          />

          {tab === 'periods' ? (
            <div className="space-y-3">
              {accumulatedRolloverInterest > 0 ? (
                <p className="text-xs text-ink-600">
                  Rollover interest still on the loan: <span className="font-semibold text-ink-900">{money(accumulatedRolloverInterest)}</span>
                </p>
              ) : null}
              <DataTable
                columns={periodColumns}
                rows={periodRows}
                getRowKey={(row) => row.id}
                selectedRowId={selectedPeriodId}
                onRowClick={(row) => setSelectedPeriodId((current) => (current === row.id ? null : row.id))}
                clientPagination={false}
                emptyTitle="No interest periods"
                emptyMessage="Applied charges and rollover decisions will appear here."
              />
              {selectedPeriod ? (
                <PeriodDetail
                  row={selectedPeriod}
                  waivingId={waivingId}
                  onWaive={(charge) => void handleWaiveCharge(charge)}
                />
              ) : periodRows.length ? (
                <p className="text-xs text-ink-500">Select a period to open its charge and rollover detail.</p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              {reversedCount > 0 ? (
                <p className="text-xs text-ink-500">{reversedCount} reversed payment{reversedCount === 1 ? '' : 's'} omitted.</p>
              ) : null}
              <DataTable
                columns={repaymentColumns}
                rows={repayments}
                getRowKey={(row) => row.id}
                clientPagination={false}
                emptyTitle="No repayments yet"
                emptyMessage="Repayments will appear here once recorded."
              />
            </div>
          )}

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

function PeriodDetail({
  row,
  waivingId,
  onWaive,
}: {
  row: InterestPeriodRow;
  waivingId: string | null;
  onWaive: (charge: LoanInterestCharge) => void;
}) {
  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold text-ink-900">Period {row.periodNumber}</h3>
        <Badge tone="neutral">Detail</Badge>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-3 ring-1 ring-ink-100">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-500">Interest charge</p>
          {row.charges.length ? row.charges.map((charge) => (
            <div key={charge.id} className="mt-2 space-y-1 text-sm text-ink-800">
              <p>Charged {formatLoanDate(charge.chargeDate)} on principal {money(charge.principalBalance)}</p>
              <p>Interest {money(charge.interestAmount)}{Number(charge.compoundedInterest) > 0 && Math.abs(Number(charge.compoundedInterest) - Number(charge.interestAmount)) > 0.5 ? ` · compounded ${money(charge.compoundedInterest)}` : ''}</p>
              {charge.waivedAt ? (
                <p className="text-xs text-ink-500">
                  Waived {formatLoanDate(charge.waivedAt)}
                  {charge.waiverReason ? ` · ${charge.waiverReason}` : ''}
                </p>
              ) : charge.periodNumber >= 2 ? (
                <Button
                  size="xs"
                  variant="secondary"
                  className="mt-2"
                  disabled={waivingId === charge.id}
                  onClick={() => onWaive(charge)}
                >
                  Waive charge
                </Button>
              ) : (
                <p className="text-xs text-ink-500">Opening period interest stays on the loan.</p>
              )}
            </div>
          )) : (
            <p className="mt-2 text-sm text-ink-500">No interest charge was posted for this period.</p>
          )}
        </div>
        <div className="rounded-lg bg-white p-3 ring-1 ring-ink-100">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-500">Rollover</p>
          {row.rollovers.length ? row.rollovers.map((rollover) => (
            <div key={rollover.id} className="mt-2 space-y-1 text-sm text-ink-800">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={rolloverTone(rollover.status)}>{statusLabel(rollover.status)}</Badge>
                <span className="font-semibold">{rollover.meeting?.meetingNumber ?? 'Meeting unavailable'}</span>
                <span className="text-xs text-ink-500">{formatLoanDate(rollover.meeting?.meetingDate)}</span>
              </div>
              <p>
                Proposed {money(rollover.proposedAmount)}
                {' · '}
                Retained {money(rollover.status === 'WAIVED' ? 0 : rollover.confirmedAmount ?? rollover.proposedAmount)}
              </p>
              {rollover.confirmedAt ? <p className="text-xs text-ink-500">Decided {formatLoanDate(rollover.confirmedAt)}</p> : null}
              {rollover.chargeDecision?.waiveInterest ? <p className="text-xs text-ink-600">Interest waived: {money(rollover.chargeDecision.interestAmount)}</p> : null}
              {rollover.chargeDecision?.waivePenalty ? <p className="text-xs text-ink-600">Penalty waived: {money(rollover.chargeDecision.penaltyAmount)}</p> : null}
              {rollover.waiverReason ? <p className="text-xs text-ink-500">{rollover.waiverReason}</p> : null}
              {rollover.chargeDecision?.reason ? <p className="text-xs text-ink-500">{rollover.chargeDecision.reason}</p> : null}
            </div>
          )) : (
            <p className="mt-2 text-sm text-ink-500">This period was not rolled over.</p>
          )}
        </div>
      </div>
    </div>
  );
}
