import { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiX, FiDollarSign, FiEye, FiDownload, FiAlertTriangle, FiFileText } from 'react-icons/fi';
import { TbCash, TbClock, TbCreditCard, TbTrendingUp } from 'react-icons/tb';
import { AdminPageLayout, AdminPageMain, AdminPageStatsGrid } from '@/layouts/AdminPageLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import type { MultiFilterSection, MultiFilterValue } from '@/components/ui/MultiFilterDropdown';
import { LoanDetailModal } from '@/components/loans/LoanDetailModal';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { NotificationModal } from '@/components/ui/NotificationModal';
import StatCard from '@/components/ui/StatCard';
import { loanApi } from '@/services/loanApi';
import type { Loan, LoanStatus } from '@/types/loan';
import { formatLoanDate, loanDueDate } from '@/lib/loanDates';

function money(n: number | string | undefined) { return `KES ${Number(n ?? 0).toLocaleString()}`; }

function getApiError(e: unknown, fallback: string) {
  if (
    e &&
    typeof e === 'object' &&
    'response' in e &&
    e.response &&
    typeof e.response === 'object' &&
    'data' in e.response &&
    e.response.data &&
    typeof e.response.data === 'object' &&
    'error' in e.response.data
  ) {
    return String(e.response.data.error);
  }
  return fallback;
}

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success', PARTIALLY_PAID: 'success', CLOSED: 'neutral', DEFAULTED: 'danger',
  OVERDUE: 'danger', SUBMITTED: 'warning', PENDING_MEETING_APPROVAL: 'warning',
  READY_FOR_DISBURSEMENT: 'warning', REJECTED: 'danger', IN_ROLLOVER: 'warning',
};

const loanFilterSections: MultiFilterSection[] = [
  {
    id: 'status',
    title: 'Loan status',
    options: [
      'SUBMITTED',
      'PENDING_MEETING_APPROVAL',
      'AGREEMENT_PENDING',
      'READY_FOR_DISBURSEMENT',
      'ACTIVE',
      'PARTIALLY_PAID',
      'OVERDUE',
      'DEFAULTED',
      'CLOSED',
      'REJECTED',
    ].map((status) => ({ value: status, label: status.replace(/_/g, ' ') })),
  },
];

export function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterValue, setFilterValue] = useState<MultiFilterValue>({ status: [] });
  const [detailLoanId, setDetailLoanId] = useState<string | null>(null);
  const [showApprove, setShowApprove] = useState<Loan | null>(null);
  const [showReject, setShowReject] = useState<Loan | null>(null);
  const [showRepay, setShowRepay] = useState<Loan | null>(null);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [repayForm, setRepayForm] = useState({ amount: '', paymentMethod: 'CASH', paymentReference: '' });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'portfolio' | 'defaulters' | 'aging'>('portfolio');
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [aging, setAging] = useState<any>(null);
  const [errorNotice, setErrorNotice] = useState<{ title: string; message: string } | null>(null);
  const [disburseConfirm, setDisburseConfirm] = useState<Loan | null>(null);

  const showError = (title: string, message: string) => setErrorNotice({ title, message });

  const load = () => {
    setLoading(true);
    loanApi.list({ page, search: search || undefined, status: statusFilter || undefined })
      .then(({ data, meta }) => { setLoans(data); setMeta(meta); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search, statusFilter]);

  useEffect(() => {
    const nextStatus = String(filterValue.status?.[0] ?? '');
    setStatusFilter((current) => {
      if (current === nextStatus) return current;
      setPage(1);
      return nextStatus;
    });
  }, [filterValue.status]);

  useEffect(() => {
    if (tab === 'defaulters') loanApi.getDefaulters().then((r) => setDefaulters(r.data));
    if (tab === 'aging') loanApi.getAging().then(setAging);
  }, [tab]);

  const openDetail = (loan: Loan) => {
    setDetailLoanId(loan.id);
  };

  const doVerify = async (loan: Loan) => {
    try {
      await loanApi.verify(loan.id);
      load();
    } catch (e: any) {
      showError('Verification failed', getApiError(e, 'Failed to verify loan.'));
    }
  };

  const doApprove = async () => {
    if (!showApprove) return;
    setSaving(true);
    try {
      await loanApi.approve(showApprove.id, approvedAmount ? Number(approvedAmount) : undefined);
      setShowApprove(null);
      load();
    } catch (e: any) {
      showError('Approval failed', getApiError(e, 'Failed to approve loan.'));
    } finally {
      setSaving(false);
    }
  };

  const doReject = async () => {
    if (!showReject || !rejectReason.trim()) return;
    setSaving(true);
    try {
      await loanApi.reject(showReject.id, rejectReason);
      setShowReject(null);
      load();
    } catch (e: any) {
      showError('Rejection failed', getApiError(e, 'Failed to reject loan.'));
    } finally {
      setSaving(false);
    }
  };

  const doDisburse = async () => {
    if (!disburseConfirm) return;
    const loan = disburseConfirm;
    setSaving(true);
    try {
      await loanApi.disburse(loan.id);
      setDisburseConfirm(null);
      load();
    } catch (e: any) {
      showError('Disbursement failed', getApiError(e, 'Failed to disburse loan.'));
    } finally {
      setSaving(false);
    }
  };

  const doAgreementAction = async (loan: Loan, action: 'generate' | 'verify' | 'authorize') => {
    try {
      if (action === 'generate') await loanApi.generateAgreement(loan.id);
      if (action === 'verify') await loanApi.verifyAgreement(loan.id);
      if (action === 'authorize') await loanApi.authorizeAgreement(loan.id);
      load();
    } catch (e: any) {
      showError('Agreement update failed', getApiError(e, 'Failed to update agreement.'));
    }
  };

  const doRepay = async () => {
    if (!showRepay) return;
    setSaving(true);
    try {
      await loanApi.repay(showRepay.id, { ...repayForm, amount: Number(repayForm.amount) });
      setShowRepay(null);
      setRepayForm({ amount: '', paymentMethod: 'CASH', paymentReference: '' });
      load();
    } catch (e: any) {
      showError('Repayment failed', getApiError(e, 'Failed to post repayment.'));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Loan>[] = [
    { key: 'loanNumber', header: 'Loan No', render: (l) => <span className="font-mono text-xs font-semibold text-brand-700">{l.loanNumber}</span> },
    { key: 'member', header: 'Member', render: (l) => <span className="font-medium">{l.member?.name ?? l.memberId}</span> },
    { key: 'applied', header: 'Applied', render: (l) => money(l.requestedAmount) },
    {
      key: 'outstanding',
      header: 'Outstanding',
      render: (l) => (
        <span className="font-semibold text-red-700">
          {money(l.totalOutstanding ?? l.outstandingPrincipal ?? 0)}
        </span>
      ),
    },
    { key: 'rate', header: 'Rate', render: (l) => `${l.interestRate}% pm` },
    { key: 'status', header: 'Status', render: (l) => <Badge tone={STATUS_TONE[l.status] ?? 'neutral'}>{l.status.replace(/_/g, ' ')}</Badge> },
    {
      key: 'date',
      header: 'Applied',
      render: (l) => {
        const dueDate = loanDueDate(l);
        return (
          <div className="min-w-0 leading-tight">
            <p className="font-semibold text-ink-800">{formatLoanDate(l.applicationDate)}</p>
            {dueDate ? (
              <p className="mt-1 text-[0.72rem] font-semibold text-amber-700">
                Due: {formatLoanDate(dueDate)}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'actions', header: '', render: (l) => (
        <div className="flex items-center gap-1 flex-wrap">
          <Button size="sm" variant="ghost" icon={<FiEye size={13} />} onClick={(e) => { e.stopPropagation(); openDetail(l); }}>View</Button>
          {l.status === 'SUBMITTED' && <Button size="sm" variant="ghost" icon={<FiCheck size={13} />} onClick={(e) => { e.stopPropagation(); doVerify(l); }} className="text-blue-600 hover:bg-blue-50">Verify</Button>}
          {['PENDING_MEETING_APPROVAL', 'UNDER_REVIEW'].includes(l.status) && (
            <>
              <Button size="sm" variant="ghost" icon={<FiCheck size={13} />} onClick={(e) => { e.stopPropagation(); setApprovedAmount(String(l.requestedAmount)); setShowApprove(l); }} className="text-green-600 hover:bg-green-50">Approve</Button>
              <Button size="sm" variant="ghost" icon={<FiX size={13} />} onClick={(e) => { e.stopPropagation(); setShowReject(l); }} className="text-red-600 hover:bg-red-50">Reject</Button>
            </>
          )}
          {l.status === 'AGREEMENT_PENDING' && (
            <>
              <Button size="sm" variant="ghost" icon={<FiFileText size={13} />} onClick={(e) => { e.stopPropagation(); loanApi.downloadAgreement(l.id, `agreement-${l.loanNumber}.pdf`); }}>Agreement</Button>
              {!l.agreementGeneratedAt && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); doAgreementAction(l, 'generate'); }}>Generate</Button>}
              {l.memberAcknowledgedAt && !l.treasurerVerifiedAt && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); doAgreementAction(l, 'verify'); }}>Treasurer Verify</Button>}
              {l.treasurerVerifiedAt && !l.chairpersonAuthorizedAt && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); doAgreementAction(l, 'authorize'); }}>Chair Authorize</Button>}
            </>
          )}
          {l.status === 'READY_FOR_DISBURSEMENT' && <Button size="sm" variant="ghost" icon={<FiDollarSign size={13} />} onClick={(e) => { e.stopPropagation(); setDisburseConfirm(l); }} className="text-purple-600 hover:bg-purple-50">Disburse</Button>}
          {['ACTIVE', 'PARTIALLY_PAID', 'IN_ROLLOVER', 'OVERDUE'].includes(l.status) && (
            <Button size="sm" variant="ghost" icon={<FiDollarSign size={13} />} onClick={(e) => { e.stopPropagation(); setShowRepay(l); }} className="text-green-600 hover:bg-green-50">Repay</Button>
          )}
        </div>
      )
    },
  ];

  const stats = useMemo(() => {
    const totalOutstanding = loans.reduce((sum, loan) => sum + Number(loan.totalOutstanding ?? loan.outstandingPrincipal ?? 0), 0);
    const activeCount = loans.filter((loan) => ['ACTIVE', 'PARTIALLY_PAID', 'IN_ROLLOVER', 'OVERDUE'].includes(loan.status)).length;
    const approvalQueue = loans.filter((loan) => ['SUBMITTED', 'UNDER_REVIEW', 'PENDING_MEETING_APPROVAL'].includes(loan.status)).length;
    const atRisk = loans.filter((loan) => ['OVERDUE', 'DEFAULTED'].includes(loan.status)).length;
    return {
      total: meta?.total ?? loans.length,
      totalOutstanding,
      activeCount,
      approvalQueue,
      atRisk,
    };
  }, [loans, meta]);

  return (
    <AdminPageLayout fillHeight>
      <PageHeader
        title="Loan Portfolio"
        subtitle="Manage loan applications, disbursements, and repayments"
        action={
          <div className="flex gap-2">
            {['portfolio', 'defaulters', 'aging'].map((t) => (
              <Button key={t} size="sm" variant={tab === t ? 'primary' : 'secondary'} onClick={() => setTab(t as any)} icon={t === 'defaulters' ? <FiAlertTriangle size={13} /> : undefined}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
        }
      />

      <AdminPageStatsGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TbCreditCard} iconColor="#1f7a76" label="Total loans" value={stats.total} subtitle="Portfolio records" />
        <StatCard icon={TbCash} iconColor="#dc2626" label="Outstanding" value={money(stats.totalOutstanding)} subtitle="Current page balance" />
        <StatCard icon={TbTrendingUp} iconColor="#16a34a" label="Active loans" value={stats.activeCount} subtitle="Repayment in progress" />
        <StatCard icon={TbClock} iconColor="#d97706" label="Approval queue" value={stats.approvalQueue} subtitle={`${stats.atRisk} at risk`} />
      </AdminPageStatsGrid>

      {tab === 'portfolio' && (
        <AdminPageMain fillHeight>
          <DataTable
            columns={columns}
            rows={loans}
            getRowKey={(l) => l.id}
            onRowClick={openDetail}
            selectedRowId={detailLoanId ?? undefined}
            search
            searchValue={search}
            onSearchChange={(value) => { setSearch(value); setPage(1); }}
            searchPlaceholder="Search member or loan number"
            filter
            filterValue={filterValue}
            onFilterChange={setFilterValue}
            filterSections={loanFilterSections}
            filterButtonLabel="Loan Filters"
            filterTitle="Loan Filters"
            tableLoading={loading}
            showAutoNumber
            startIndex={meta?.total ? (page - 1) * ((meta.pageSize ?? loans.length) || 20) + 1 : 0}
            endIndex={meta?.total ? Math.min(page * ((meta.pageSize ?? loans.length) || 20), meta.total) : loans.length}
            totalItems={meta?.total ?? loans.length}
            currentPage={page}
            totalPages={meta?.totalPages ?? 1}
            onPageChange={setPage}
            fillContainer
            containerClassName="h-full rounded-[1.3rem] border-gray-500/40 shadow-sm"
            emptyTitle="No loans found"
            emptyMessage="Loan applications and active facilities will appear here."
          />
        </AdminPageMain>
      )}

      {tab === 'defaulters' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-500">Loans that have exceeded the maximum rollover period and are considered defaulted.</p>
          {defaulters.length === 0 ? (
            <EmptyState title="No defaulters" message="All loans are within acceptable rollover periods." />
          ) : (
            <DataTable
              columns={[
                { key: 'loanNo', header: 'Loan No', render: (d) => <span className="font-mono text-xs">{d.loan.loanNumber}</span> },
                { key: 'member', header: 'Member', render: (d) => d.loan.member?.name },
                { key: 'overdue', header: 'Months Overdue', render: (d) => <Badge tone="danger">{d.monthsOverdue} months</Badge> },
                { key: 'outstanding', header: 'Outstanding', render: (d) => <span className="font-semibold text-red-700">{money(d.outstandingBalance)}</span> },
                { key: 'contact', header: 'Contact', render: (d) => d.loan.member?.phone ?? d.loan.member?.email ?? '—' },
              ]}
              rows={defaulters}
              getRowKey={(d) => d.loan.id}
            />
          )}
        </div>
      )}

      {tab === 'aging' && aging && (
        <div className="space-y-6">
          {Object.entries(aging).map(([bucket, entries]: any) => (
            <div key={bucket}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink-600">{bucket} days</h3>
                <Badge tone={bucket === '90+' ? 'danger' : bucket === '61-90' ? 'danger' : bucket === '31-60' ? 'warning' : 'neutral'}>{entries.length} loans</Badge>
                <span className="text-xs text-ink-500">(Outstanding: {money(entries.reduce((s: number, e: any) => s + e.outstanding, 0))})</span>
              </div>
              {entries.length > 0 && (
                <DataTable
                  columns={[
                    { key: 'loan', header: 'Loan No', render: (e: any) => e.loan.loanNumber },
                    { key: 'member', header: 'Member', render: (e: any) => e.loan.member?.name },
                    { key: 'days', header: 'Days Active', render: (e: any) => e.daysOverdue },
                    { key: 'outstanding', header: 'Outstanding', render: (e: any) => money(e.outstanding) },
                  ]}
                  rows={entries}
                  getRowKey={(e: any) => e.loan.id}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <LoanDetailModal
        loanId={detailLoanId}
        open={Boolean(detailLoanId)}
        onClose={() => setDetailLoanId(null)}
      />

      {/* Approve Modal */}
      {showApprove && (
        <Modal open={!!showApprove} title="Approve Loan" onClose={() => setShowApprove(null)} footer={
          <div className="flex justify-end gap-2 px-5 py-3">
            <Button variant="secondary" onClick={() => setShowApprove(null)}>Cancel</Button>
            <Button onClick={doApprove} isLoading={saving} loadingText="Approving...">Approve & Ready for Disbursement</Button>
          </div>
        }>
          <div className="p-5 space-y-3">
            <p className="text-sm text-ink-600">Approving loan for <strong>{showApprove.member?.name}</strong>.</p>
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">Approved Amount (KES)</label>
              <input type="number" className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {showReject && (
        <Modal open={!!showReject} title="Reject Loan Application" onClose={() => setShowReject(null)} footer={
          <div className="flex justify-end gap-2 px-5 py-3">
            <Button variant="secondary" onClick={() => setShowReject(null)}>Cancel</Button>
            <Button variant="danger" onClick={doReject} disabled={!rejectReason.trim()} isLoading={saving} loadingText="Rejecting...">Reject Application</Button>
          </div>
        }>
          <div className="p-5 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">Reason <span className="text-red-500">*</span></label>
              <textarea className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {/* Repay Modal */}
      {showRepay && (
        <Modal open={!!showRepay} title={`Record Repayment — ${showRepay.loanNumber}`} onClose={() => setShowRepay(null)} footer={
          <div className="flex justify-end gap-2 px-5 py-3">
            <Button variant="secondary" onClick={() => setShowRepay(null)}>Cancel</Button>
            <Button onClick={doRepay} disabled={!repayForm.amount} isLoading={saving} loadingText="Posting...">Post Repayment</Button>
          </div>
        }>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">Amount (KES)</label>
              <input type="number" className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" value={repayForm.amount} onChange={(e) => setRepayForm({ ...repayForm, amount: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-ink-700 mb-1">Payment Method</label>
                <select className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" value={repayForm.paymentMethod} onChange={(e) => setRepayForm({ ...repayForm, paymentMethod: e.target.value })}>
                  {['CASH', 'BANK', 'MPESA', 'TRANSFER', 'OTHER'].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink-700 mb-1">Reference</label>
                <input className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" value={repayForm.paymentReference} onChange={(e) => setRepayForm({ ...repayForm, paymentReference: e.target.value })} />
              </div>
            </div>
          </div>
        </Modal>
      )}

      <NotificationModal
        isOpen={!!disburseConfirm}
        onClose={() => setDisburseConfirm(null)}
        title="Confirm loan disbursement"
        message={
          disburseConfirm
            ? `Disburse ${money(disburseConfirm.approvedAmount ?? disburseConfirm.requestedAmount)} to ${disburseConfirm.member?.name ?? 'this member'}? A payment voucher will be prepared and marked paid if all controls pass.`
            : ''
        }
        confirmText={saving ? 'Disbursing...' : 'Disburse'}
        cancelText="Cancel"
        onConfirm={() => void doDisburse()}
      />

      <NotificationModal
        isOpen={!!errorNotice}
        onClose={() => setErrorNotice(null)}
        title={errorNotice?.title ?? 'Action failed'}
        message={errorNotice?.message ?? ''}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setErrorNotice(null)}
      />
    </AdminPageLayout>
  );
}
