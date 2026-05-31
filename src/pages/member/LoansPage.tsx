import { useEffect, useState } from 'react';
import { FiPlus, FiDownload, FiInfo } from 'react-icons/fi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Spinner, EmptyState } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/Card';
import { loanApi } from '@/services/loanApi';
import type { Loan, LoanEligibility, LoanStatement } from '@/types/loan';

function money(n: number | string | undefined) { return `KES ${Number(n ?? 0).toLocaleString()}`; }

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success', PARTIALLY_PAID: 'success', CLOSED: 'neutral', DEFAULTED: 'danger',
  OVERDUE: 'danger', SUBMITTED: 'warning', PENDING_MEETING_APPROVAL: 'warning',
  READY_FOR_DISBURSEMENT: 'warning', REJECTED: 'danger', IN_ROLLOVER: 'warning',
};

export function MemberLoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [eligibility, setEligibility] = useState<LoanEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [showDetail, setShowDetail] = useState<{ loan: Loan; statement: LoanStatement } | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ requestedAmount: '', purpose: '', termWeeks: '' });

  const load = () => {
    setLoading(true);
    Promise.all([loanApi.myLoans(), loanApi.myEligibility()])
      .then(([loans, elig]) => { setLoans(loans); setEligibility(elig); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (loan: Loan) => {
    const detail = await loanApi.myLoan(loan.id);
    setShowDetail(detail);
  };

  const apply = async () => {
    if (!form.requestedAmount) return;
    setSaving(true);
    try {
      await loanApi.applyMember({ requestedAmount: Number(form.requestedAmount), purpose: form.purpose || undefined, termWeeks: form.termWeeks ? Number(form.termWeeks) : undefined });
      setShowApply(false);
      setForm({ requestedAmount: '', purpose: '', termWeeks: '' });
      load();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Application failed');
    } finally {
      setSaving(false);
    }
  };

  const acknowledgeAgreement = async (loan: Loan) => {
    try {
      await loanApi.acknowledgeMyAgreement(loan.id);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Could not acknowledge agreement');
    }
  };

  const hasActiveLoan = loans.some((l) => ['ACTIVE', 'PARTIALLY_PAID', 'IN_ROLLOVER', 'OVERDUE', 'DEFAULTED', 'SUBMITTED', 'PENDING_MEETING_APPROVAL', 'AGREEMENT_PENDING', 'READY_FOR_DISBURSEMENT'].includes(l.status));

  const columns: Column<Loan>[] = [
    { key: 'loanNumber', header: 'Loan No', render: (l) => <span className="font-mono text-xs font-semibold text-brand-700">{l.loanNumber}</span> },
    { key: 'amount', header: 'Amount', render: (l) => money(l.approvedAmount ?? l.requestedAmount) },
    { key: 'rate', header: 'Rate', render: (l) => `${l.interestRate}% pm` },
    { key: 'status', header: 'Status', render: (l) => <Badge tone={STATUS_TONE[l.status] ?? 'neutral'}>{l.status.replace(/_/g, ' ')}</Badge> },
    { key: 'date', header: 'Applied', render: (l) => new Date(l.applicationDate).toLocaleDateString() },
    {
      key: 'actions', header: '', render: (l) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" icon={<FiInfo size={12} />} onClick={(e) => { e.stopPropagation(); openDetail(l); }}>Details</Button>
          {l.status === 'AGREEMENT_PENDING' && (
            <>
              <Button size="sm" variant="ghost" icon={<FiDownload size={12} />} onClick={(e) => { e.stopPropagation(); loanApi.downloadMyAgreement(l.id, l.loanNumber); }}>Agreement</Button>
              {!l.memberAcknowledgedAt && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); acknowledgeAgreement(l); }}>Acknowledge</Button>}
            </>
          )}
          {['ACTIVE', 'PARTIALLY_PAID', 'IN_ROLLOVER', 'OVERDUE', 'DEFAULTED', 'CLOSED'].includes(l.status) && (
            <Button size="sm" variant="ghost" icon={<FiDownload size={12} />} onClick={(e) => { e.stopPropagation(); loanApi.downloadMyStatement(l.id, l.loanNumber); }}>Statement</Button>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Loans"
        subtitle="Track your loan history, outstanding balance, and apply for new loans"
        action={
          eligibility && !eligibility.hasActiveLoan && (
            <Button icon={<FiPlus />} onClick={() => setShowApply(true)}>Apply for Loan</Button>
          )
        }
      />

      {eligibility && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Max Eligible Amount" value={money(eligibility.maxEligible)} detail={`${eligibility.multiplier}× base`} />
          <StatCard label="Base Amount (shares + savings)" value={money(eligibility.baseAmount)} detail="Welfare excluded" />
          <StatCard label="Status" value={eligibility.hasActiveLoan ? 'Has Active Loan' : 'Eligible'} detail={eligibility.hasActiveLoan ? 'Repay current loan first' : 'Can apply now'} />
        </div>
      )}

      {eligibility?.hasActiveLoan && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex items-center gap-2">
          <FiInfo className="shrink-0" />
          You have an active loan. You can apply for a new loan once the current one is fully repaid.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : loans.length === 0 ? (
        <EmptyState title="No loans yet" message="Apply for your first loan using the button above." />
      ) : (
        <DataTable columns={columns} rows={loans} getRowKey={(l) => l.id} onRowClick={openDetail} />
      )}

      {/* Apply Modal */}
      <Modal open={showApply} title="Apply for Loan" onClose={() => setShowApply(false)} footer={
        <div className="flex justify-end gap-2 px-5 py-3">
          <Button variant="secondary" onClick={() => setShowApply(false)}>Cancel</Button>
          <Button onClick={apply} disabled={!form.requestedAmount} isLoading={saving} loadingText="Submitting...">Submit Application</Button>
        </div>
      }>
        <div className="p-5 space-y-4">
          {eligibility && (
            <div className="rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
              Maximum eligible: <strong>{money(eligibility.maxEligible)}</strong> ({eligibility.multiplier}× base)
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-1">Requested Amount (KES) <span className="text-red-500">*</span></label>
            <input type="number" className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" value={form.requestedAmount} onChange={(e) => setForm({ ...form, requestedAmount: e.target.value })} max={eligibility?.maxEligible} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-1">Purpose</label>
            <textarea className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm resize-none" rows={2} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Brief description of loan purpose..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-1">Preferred Term (weeks)</label>
            <input type="number" className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" value={form.termWeeks} onChange={(e) => setForm({ ...form, termWeeks: e.target.value })} placeholder="e.g. 12" />
          </div>
        </div>
      </Modal>

      {/* Loan Detail Modal */}
      {showDetail && (
        <Modal open={!!showDetail} title={`Loan — ${showDetail.loan.loanNumber}`} onClose={() => setShowDetail(null)} size="lg">
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="font-semibold text-ink-600">Status:</span> <Badge tone={STATUS_TONE[showDetail.loan.status] ?? 'neutral'}>{showDetail.loan.status.replace(/_/g, ' ')}</Badge></div>
              <div><span className="font-semibold text-ink-600">Rate:</span> {showDetail.loan.interestRate}% per month</div>
              <div><span className="font-semibold text-ink-600">Applied:</span> {money(showDetail.loan.requestedAmount)}</div>
              {showDetail.loan.approvedAmount && <div><span className="font-semibold text-ink-600">Approved:</span> {money(showDetail.loan.approvedAmount)}</div>}
              {showDetail.loan.purpose && <div className="col-span-2"><span className="font-semibold text-ink-600">Purpose:</span> {showDetail.loan.purpose}</div>}
            </div>
            {showDetail.statement && (
              <div className="rounded-lg bg-ink-50 p-4 space-y-2 text-sm">
                <h3 className="font-bold text-ink-900">Statement Summary</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-ink-500">Disbursed:</span> <span className="font-semibold">{money(showDetail.statement.disbursed)}</span></div>
                  <div><span className="text-ink-500">Interest Accrued:</span> <span className="font-semibold">{money(showDetail.statement.totalInterest)}</span></div>
                  <div><span className="text-ink-500">Penalties:</span> <span className="font-semibold">{money(showDetail.statement.totalPenalties)}</span></div>
                  <div><span className="text-ink-500">Total Repaid:</span> <span className="font-semibold text-green-700">{money(showDetail.statement.totalRepaid)}</span></div>
                  <div className="col-span-2 border-t border-ink-200 pt-2"><span className="text-ink-600 font-semibold">Outstanding Balance:</span> <span className={`font-bold text-lg ${showDetail.statement.outstanding > 0 ? 'text-red-700' : 'text-green-700'}`}>{money(showDetail.statement.outstanding)}</span></div>
                </div>
              </div>
            )}
            {showDetail.loan.repayments && showDetail.loan.repayments.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-ink-900 mb-2">Repayment History</h3>
                <div className="space-y-1">
                  {showDetail.loan.repayments.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs text-ink-600 border-b border-ink-50 pb-1">
                      <span>{new Date(r.paymentDate).toLocaleDateString()} — {r.paymentMethod}</span>
                      <span className="font-semibold">{money(r.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" icon={<FiDownload size={13} />} onClick={() => loanApi.downloadMyStatement(showDetail.loan.id, showDetail.loan.loanNumber)}>Download Full Statement</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
