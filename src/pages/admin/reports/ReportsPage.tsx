import { useMemo, useState } from 'react';
import { FiDownload, FiMail, FiRefreshCw } from 'react-icons/fi';
import { TbChartBar, TbFileAnalytics, TbFileSpreadsheet, TbScale, TbWallet } from 'react-icons/tb';
import { api } from '@/services/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import DataTable, { type Column } from '@/components/ui/DataTable';
import type { MultiFilterSection, MultiFilterValue } from '@/components/ui/MultiFilterDropdown';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import StatCard from '@/components/ui/StatCard';
import { AdminPageLayout, AdminPageMain, AdminPageStatsGrid } from '@/layouts/AdminPageLayout';
import { downloadReport, getApiError, money } from '@/pages/admin/shared/adminFormatters';
import { StateBlock, useLoad } from '@/pages/admin/shared/adminUi';
import { useUiStore } from '@/store/uiStore';

type ReportFormat = 'pdf' | 'csv' | 'xlsx';
type ReportsTab = 'position' | 'distribution' | 'aging' | 'library';

type ReportRow = {
  key: string;
  title: string;
  category: 'finance' | 'loans' | 'welfare' | 'audit' | 'yearEnd';
  cadence: string;
  formats: ReportFormat[];
  shareWithMembers?: boolean;
};

type FundBalance = {
  code: string;
  fund: string;
  balance: number;
  isLoanable: boolean;
  isRestricted: boolean;
};

type DistributionRow = {
  memberId: string;
  memberName: string;
  membershipNumber: string;
  shareCapital: number;
  weeklySavings: number;
  allocationBasis: number;
  allocationPercentage: number;
  estimatedDistribution: number;
};

type AgingRow = {
  loanNumber: string;
  member: string;
  membershipNumber: string;
  dueDate: string | null;
  principalBalance: number;
  pendingInterest: number;
  pendingPenalties: number;
  outstandingBalance: number;
  daysOverdue: number;
  agingBucket: string;
  status: string;
};

const reportRows: ReportRow[] = [
  { key: 'welfare-accounts-overview', title: 'Welfare accounts overview', category: 'yearEnd', cadence: 'Member transparency', formats: ['pdf', 'xlsx'], shareWithMembers: true },
  { key: 'executive', title: 'Executive dashboard', category: 'finance', cadence: 'Board pack', formats: ['pdf', 'csv'] },
  { key: 'fund-balances', title: 'Fund balances', category: 'finance', cadence: 'Daily close', formats: ['pdf', 'csv'] },
  { key: 'trial-balance', title: 'Trial balance', category: 'finance', cadence: 'Month end', formats: ['pdf', 'csv'] },
  { key: 'loan-aging', title: 'Loan aging', category: 'loans', cadence: 'Credit review', formats: ['pdf', 'csv'] },
  { key: 'loan-applications', title: 'Loan applications', category: 'loans', cadence: 'Committee pack', formats: ['pdf', 'csv'] },
  { key: 'loan-repayments', title: 'Loan repayments', category: 'loans', cadence: 'Cash office', formats: ['pdf', 'csv'] },
  { key: 'contributions', title: 'Contributions register', category: 'finance', cadence: 'Cash office', formats: ['pdf', 'csv'] },
  { key: 'welfare-claims', title: 'Welfare claims', category: 'welfare', cadence: 'Committee pack', formats: ['pdf', 'csv'] },
  { key: 'year-end-allocation', title: 'Year-end allocation', category: 'yearEnd', cadence: 'AGM close', formats: ['pdf', 'csv'] },
];

const reportFilterSections: MultiFilterSection[] = [
  {
    id: 'category',
    title: 'Report family',
    options: [
      { value: 'finance', label: 'Finance' },
      { value: 'loans', label: 'Loans' },
      { value: 'welfare', label: 'Welfare' },
      { value: 'audit', label: 'Audit' },
      { value: 'yearEnd', label: 'Year end' },
    ],
  },
];

const categoryLabels: Record<ReportRow['category'], string> = {
  finance: 'Finance',
  loans: 'Loans',
  welfare: 'Welfare',
  audit: 'Audit',
  yearEnd: 'Year end',
};

function dateLabel(value: string | null) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString('en-KE', { dateStyle: 'medium' });
}

function positionMetric(label: string, value: unknown, note: string, tone = 'text-ink-900') {
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 text-xl font-extrabold tabular-nums ${tone}`}>{money(value)}</p>
      <p className="mt-1 text-xs font-medium text-ink-500">{note}</p>
    </div>
  );
}

export function ReportsPage() {
  const toastSuccess = useUiStore((state) => state.toastSuccess);
  const toastError = useUiStore((state) => state.toastError);
  const { data, loading, error, reload } = useLoad(async () => {
    const [overview, aging, trial] = await Promise.all([
      api.get('/reports/welfare-accounts-overview'),
      api.get('/reports/loan-aging'),
      api.get('/reports/trial-balance'),
    ]);
    return {
      overview: overview.data.data,
      aging: (aging.data.data ?? []) as AgingRow[],
      trial: trial.data.data,
    };
  }, []);

  const [tab, setTab] = useState<ReportsTab>('position');
  const [exporting, setExporting] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [includeExcelOnShare, setIncludeExcelOnShare] = useState(false);
  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState<MultiFilterValue>({ category: [] });

  const runExport = async (key: string, format: ReportFormat) => {
    setExporting(`${key}-${format}`);
    try {
      await downloadReport(key, format);
    } finally {
      setExporting('');
    }
  };

  const shareOverviewWithMembers = async () => {
    setSharing(true);
    try {
      const response = await api.post('/reports/welfare-accounts-overview/share', { includeExcel: includeExcelOnShare });
      const sent = Number(response.data.data?.sentCount ?? 0);
      if (sent <= 0) {
        toastError('No emails sent', 'No members with a valid email address were found.');
        return;
      }
      toastSuccess('Overview shared', `Welfare accounts overview emailed to ${sent} member(s).`);
      setShareModalOpen(false);
    } catch (shareError) {
      toastError('Share failed', getApiError(shareError));
    } finally {
      setSharing(false);
    }
  };

  const visibleReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    const category = String(filterValue.category?.[0] ?? '');
    return reportRows.filter((report) => {
      if (category && report.category !== category) return false;
      if (!term) return true;
      return [report.title, report.key, report.cadence, categoryLabels[report.category]].some((value) =>
        value.toLowerCase().includes(term),
      );
    });
  }, [filterValue.category, search]);

  const reportColumns: Column<ReportRow>[] = [
    {
      key: 'report',
      header: 'Report',
      render: (report) => (
        <div>
          <p className="font-bold text-ink-900">{report.title}</p>
          <p className="text-xs font-semibold text-ink-500">{report.key}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Family', render: (report) => <Badge tone="neutral">{categoryLabels[report.category]}</Badge> },
    { key: 'cadence', header: 'Use', render: (report) => <span className="text-sm text-ink-600">{report.cadence}</span> },
    {
      key: 'formats',
      header: 'Download',
      render: (report) => (
        <div className="flex flex-wrap gap-2">
          {report.formats.map((format) => (
            <Button
              key={format}
              size="sm"
              variant={format === 'pdf' ? 'secondary' : 'secondary2'}
              icon={<FiDownload />}
              disabled={!!exporting || sharing}
              isLoading={exporting === `${report.key}-${format}`}
              onClick={() => void runExport(report.key, format)}
            >
              {format === 'xlsx' ? 'Excel' : format.toUpperCase()}
            </Button>
          ))}
          {report.shareWithMembers ? (
            <Button
              size="sm"
              variant="primary"
              icon={<FiMail />}
              disabled={!!exporting || sharing}
              isLoading={sharing}
              onClick={() => setShareModalOpen(true)}
            >
              Share with members
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const overview = data?.overview ?? {};
  const trial = data?.trial;
  const aging = data?.aging ?? [];
  const funds = (overview.funds ?? []) as FundBalance[];
  const distribution = (overview.memberDistribution ?? []) as DistributionRow[];
  const fundTotal = funds.reduce((sum, fund) => sum + Number(fund.balance ?? 0), 0);
  const distributionTotals = distribution.reduce(
    (totals, row) => ({
      shareCapital: totals.shareCapital + Number(row.shareCapital ?? 0),
      weeklySavings: totals.weeklySavings + Number(row.weeklySavings ?? 0),
      allocationBasis: totals.allocationBasis + Number(row.allocationBasis ?? 0),
      allocationPercentage: totals.allocationPercentage + Number(row.allocationPercentage ?? 0),
      estimatedDistribution: totals.estimatedDistribution + Number(row.estimatedDistribution ?? 0),
    }),
    { shareCapital: 0, weeklySavings: 0, allocationBasis: 0, allocationPercentage: 0, estimatedDistribution: 0 },
  );
  const agingTotals = aging.reduce(
    (totals, loan) => ({
      principal: totals.principal + Number(loan.principalBalance ?? 0),
      interest: totals.interest + Number(loan.pendingInterest ?? 0),
      penalties: totals.penalties + Number(loan.pendingPenalties ?? 0),
      outstanding: totals.outstanding + Number(loan.outstandingBalance ?? 0),
    }),
    { principal: 0, interest: 0, penalties: 0, outstanding: 0 },
  );

  return (
    <AdminPageLayout className="pb-8">
      <PageHeader
        title="Reports"
        subtitle="A reconciled financial position, member distribution, credit aging, and formal report library."
        action={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void reload()}>Refresh</Button>}
      />

      <StateBlock loading={loading && !data} error={error} />

      <AdminPageStatsGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={TbWallet} iconColor="#1f7a76" label="Member savings" value={money(overview.totalMemberSavings ?? 0)} subtitle="Share capital plus weekly savings" />
        <StatCard icon={TbChartBar} iconColor="#16a34a" label="Distributable income" value={money(overview.totalDistributableIncome ?? 0)} subtitle="Completed-loan interest, fines, registration income, and Registration Fund" />
        <StatCard icon={TbFileAnalytics} iconColor="#d97706" label="Loans receivable" value={money(overview.totalOutstandingLoans ?? 0)} subtitle={`${aging.length} open loan account${aging.length === 1 ? '' : 's'}`} />
        <StatCard icon={TbScale} iconColor="#7c3aed" label="Pending interest" value={money(overview.pendingInterest ?? 0)} subtitle="Accrued and unpaid on open loans" />
      </AdminPageStatsGrid>

      <SegmentedTabs<ReportsTab>
        tabs={[
          { value: 'position' as const, label: 'Financial Position' },
          { value: 'distribution' as const, label: 'Member Distribution', count: distribution.length },
          { value: 'aging' as const, label: 'Loan Aging', count: aging.length },
          { value: 'library' as const, label: 'Report Library', count: reportRows.length },
        ]}
        value={tab}
        onChange={setTab}
        aria-label="Report sections"
        className="mb-4"
      />

      {data && tab === 'position' ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 bg-ink-50/70 p-5">
            <div>
              <h2 className="text-base font-extrabold text-ink-900">Financial Position</h2>
              <p className="mt-1 text-xs font-semibold text-ink-500">
                As at {dateLabel(overview.asOf ?? null)} · accrued income and realized distribution income are shown separately
              </p>
            </div>
            <Badge tone={trial?.balanced ? 'success' : 'danger'}>{trial?.balanced ? 'Trial balance reconciled' : 'Trial balance requires review'}</Badge>
          </div>

          <div className="space-y-6 p-5">
            <section>
              <div className="mb-3">
                <h3 className="text-sm font-extrabold text-ink-900">Loan portfolio position</h3>
                <p className="text-xs font-medium text-ink-500">Open principal, unpaid charges, and the resulting receivable.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {positionMetric('Outstanding principal', overview.totalOutstandingPrincipal, 'Unpaid principal on open loans')}
                {positionMetric('Pending interest', overview.pendingInterest, 'Accrued and not yet paid', 'text-amber-700')}
                {positionMetric('Pending penalties', overview.pendingPenalties, 'Assessed and not yet paid', 'text-rose-700')}
                {positionMetric('Total loans receivable', overview.totalOutstandingLoans, 'Principal, interest, and penalties', 'text-brand-700')}
                {positionMetric('Member loan credits', overview.loanOverpayments, 'Overpayments after waived charges', 'text-violet-700')}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4 xl:col-span-2">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-ink-900">Fund snapshot</h3>
                    <p className="text-xs font-medium text-ink-500">Posted journal balances, including cash received in advance for future member periods.</p>
                  </div>
                  <Badge tone="neutral">{funds.length} funds</Badge>
                </div>
                <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
                  <table className="min-w-full divide-y divide-ink-100 text-sm">
                    <thead className="bg-ink-50 text-left text-xs font-bold uppercase text-ink-500">
                      <tr><th className="px-4 py-3">Fund</th><th className="px-4 py-3">Classification</th><th className="px-4 py-3 text-right">Balance</th></tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {funds.map((fund) => (
                        <tr key={fund.code}>
                          <td className="px-4 py-3"><p className="font-bold text-ink-900">{fund.fund}</p><p className="text-xs text-ink-500">{fund.code}</p></td>
                          <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{fund.isLoanable ? <Badge tone="success">Loanable</Badge> : null}{fund.isRestricted ? <Badge tone="warning">Restricted</Badge> : null}{!fund.isLoanable && !fund.isRestricted ? <Badge tone="neutral">General</Badge> : null}</div></td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-ink-900">{money(fund.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-ink-200 bg-ink-50">
                      <tr><th className="px-4 py-3 text-left text-sm font-extrabold text-ink-900" colSpan={2}>Total recorded fund balances</th><th className="px-4 py-3 text-right text-sm font-extrabold tabular-nums text-ink-900">{money(fundTotal)}</th></tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-ink-100 p-4">
                  <h3 className="text-sm font-extrabold text-ink-900">Interest reconciliation</h3>
                  <div className="mt-3 space-y-3">
                    <div><p className="text-xs font-bold uppercase text-ink-500">Completed-loan interest paid</p><p className="text-lg font-extrabold text-emerald-700">{money(overview.interestFromClosedLoans)}</p><p className="text-xs text-ink-500">Used in member distribution</p></div>
                    <div className="border-t border-ink-100 pt-3"><p className="text-xs font-bold uppercase text-ink-500">All interest posted to ledger</p><p className="text-lg font-extrabold text-ink-900">{money(overview.ledgerInterestIncome)}</p><p className="text-xs text-ink-500">Includes accrued interest on open loans</p></div>
                    <div className="border-t border-ink-100 pt-3"><p className="text-xs font-bold uppercase text-ink-500">Pending open-loan interest</p><p className="text-lg font-extrabold text-amber-700">{money(overview.pendingInterest)}</p><p className="text-xs text-ink-500">Excluded from distribution until realized</p></div>
                  </div>
                </div>
                <div className="rounded-xl border border-ink-100 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-ink-900">Trial balance</h3>
                    <Badge tone={trial?.balanced ? 'success' : 'danger'}>{trial?.balanced ? 'Balanced' : 'Review'}</Badge>
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><span className="font-semibold text-ink-600">Total debits</span><span className="font-bold tabular-nums">{money(trial?.totalDebits)}</span></div>
                    <div className="flex justify-between gap-3"><span className="font-semibold text-ink-600">Total credits</span><span className="font-bold tabular-nums">{money(trial?.totalCredits)}</span></div>
                    <div className="flex justify-between gap-3 border-t border-ink-100 pt-2"><span className="font-extrabold text-ink-900">Difference</span><span className="font-extrabold tabular-nums">{money(Number(trial?.totalDebits ?? 0) - Number(trial?.totalCredits ?? 0))}</span></div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </Card>
      ) : null}

      {data && tab === 'distribution' ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 bg-ink-50/70 p-5">
            <div>
              <h2 className="text-base font-extrabold text-ink-900">Estimated Member Distribution</h2>
              <p className="mt-1 max-w-3xl text-xs font-semibold text-ink-500">{overview.distributionBasisNote}</p>
            </div>
            <Button variant="primary" icon={<FiMail />} onClick={() => setShareModalOpen(true)}>Share with members</Button>
          </div>
          <div className="grid gap-3 border-b border-ink-100 p-5 sm:grid-cols-2 xl:grid-cols-4">
            {positionMetric('Completed-loan interest', overview.interestFromClosedLoans, 'Realized interest included')}
            {positionMetric('Other distributable income', Number(overview.totalDistributableIncome ?? 0) - Number(overview.interestFromClosedLoans ?? 0), 'Fines, registration income, and registration fund')}
            {positionMetric('Total allocation basis', distributionTotals.allocationBasis, 'Active member savings')}
            {positionMetric('Total estimated distribution', distributionTotals.estimatedDistribution, 'Must reconcile to distributable income', 'text-emerald-700')}
          </div>
          <div className="overflow-x-auto p-5">
            <table className="min-w-full divide-y divide-ink-100 rounded-xl border border-ink-100 text-sm">
              <thead className="bg-ink-50 text-left text-xs font-bold uppercase text-ink-500">
                <tr><th className="px-4 py-3">Member</th><th className="px-4 py-3 text-right">Share capital</th><th className="px-4 py-3 text-right">Weekly savings</th><th className="px-4 py-3 text-right">Basis</th><th className="px-4 py-3 text-right">Share</th><th className="px-4 py-3 text-right">Estimated amount</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-100 bg-white">
                {distribution.map((row) => (
                  <tr key={row.memberId}>
                    <td className="px-4 py-3"><p className="font-bold text-ink-900">{row.memberName}</p><p className="text-xs text-ink-500">{row.membershipNumber}</p></td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(row.shareCapital)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(row.weeklySavings)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(row.allocationBasis)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{Number(row.allocationPercentage).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right font-extrabold tabular-nums text-brand-700">{money(row.estimatedDistribution)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-ink-200 bg-ink-50">
                <tr>
                  <th className="px-4 py-3 text-left font-extrabold text-ink-900">Total</th>
                  <th className="px-4 py-3 text-right font-extrabold tabular-nums">{money(distributionTotals.shareCapital)}</th>
                  <th className="px-4 py-3 text-right font-extrabold tabular-nums">{money(distributionTotals.weeklySavings)}</th>
                  <th className="px-4 py-3 text-right font-extrabold tabular-nums">{money(distributionTotals.allocationBasis)}</th>
                  <th className="px-4 py-3 text-right font-extrabold tabular-nums">{distributionTotals.allocationBasis > 0 ? '100.00%' : '0.00%'}</th>
                  <th className="px-4 py-3 text-right font-extrabold tabular-nums text-brand-700">{money(distributionTotals.estimatedDistribution)}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      ) : null}

      {data && tab === 'aging' ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 bg-ink-50/70 p-5">
            <div><h2 className="text-base font-extrabold text-ink-900">Loan Aging</h2><p className="mt-1 text-xs font-semibold text-ink-500">Aged from each loan's first contractual repayment due date, not its disbursement date.</p></div>
            <Button variant="secondary" icon={<FiDownload />} isLoading={exporting === 'loan-aging-pdf'} onClick={() => void runExport('loan-aging', 'pdf')}>Download PDF</Button>
          </div>
          <div className="grid gap-3 border-b border-ink-100 p-5 sm:grid-cols-2 xl:grid-cols-4">
            {positionMetric('Outstanding principal', agingTotals.principal, 'Across open loans')}
            {positionMetric('Pending interest', agingTotals.interest, 'Accrued and unpaid', 'text-amber-700')}
            {positionMetric('Pending penalties', agingTotals.penalties, 'Assessed and unpaid', 'text-rose-700')}
            {positionMetric('Total outstanding', agingTotals.outstanding, 'Full loan receivable', 'text-brand-700')}
          </div>
          <div className="overflow-x-auto p-5">
            <table className="min-w-full divide-y divide-ink-100 rounded-xl border border-ink-100 text-sm">
              <thead className="bg-ink-50 text-left text-xs font-bold uppercase text-ink-500">
                <tr><th className="px-4 py-3">Loan / Member</th><th className="px-4 py-3">Due</th><th className="px-4 py-3 text-right">Principal</th><th className="px-4 py-3 text-right">Interest</th><th className="px-4 py-3 text-right">Penalties</th><th className="px-4 py-3 text-right">Outstanding</th><th className="px-4 py-3">Aging</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-100 bg-white">
                {aging.map((loan) => (
                  <tr key={loan.loanNumber}>
                    <td className="px-4 py-3"><p className="font-bold text-ink-900">{loan.loanNumber}</p><p className="text-xs text-ink-500">{loan.member} · {loan.membershipNumber}</p></td>
                    <td className="px-4 py-3"><p className="font-semibold text-ink-700">{dateLabel(loan.dueDate)}</p><p className="text-xs text-ink-500">{loan.daysOverdue} day{loan.daysOverdue === 1 ? '' : 's'} overdue</p></td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(loan.principalBalance)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(loan.pendingInterest)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(loan.pendingPenalties)}</td>
                    <td className="px-4 py-3 text-right font-extrabold tabular-nums text-ink-900">{money(loan.outstandingBalance)}</td>
                    <td className="px-4 py-3"><Badge tone={loan.agingBucket === 'Current' ? 'success' : loan.agingBucket === '90+ days' ? 'danger' : 'warning'}>{loan.agingBucket}</Badge><p className="mt-1 text-xs font-semibold text-ink-500">{loan.status.replace(/_/g, ' ')}</p></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-ink-200 bg-ink-50">
                <tr><th className="px-4 py-3 text-left font-extrabold text-ink-900" colSpan={2}>Total</th><th className="px-4 py-3 text-right font-extrabold tabular-nums">{money(agingTotals.principal)}</th><th className="px-4 py-3 text-right font-extrabold tabular-nums">{money(agingTotals.interest)}</th><th className="px-4 py-3 text-right font-extrabold tabular-nums">{money(agingTotals.penalties)}</th><th className="px-4 py-3 text-right font-extrabold tabular-nums text-brand-700">{money(agingTotals.outstanding)}</th><th /></tr>
              </tfoot>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === 'library' ? (
        <AdminPageMain>
          <DataTable
            columns={reportColumns}
            rows={visibleReports}
            getRowKey={(report) => report.key}
            search
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search report name, key, use, or family"
            filter
            filterValue={filterValue}
            onFilterChange={setFilterValue}
            filterSections={reportFilterSections}
            filterButtonLabel="Report Filters"
            filterTitle="Report Filters"
            actionsButtons={<Button variant="secondary" icon={<TbFileSpreadsheet />} disabled={!!exporting} onClick={() => void runExport('audit-pack', 'pdf')}>Audit Pack</Button>}
            showAutoNumber
            containerClassName="rounded-[1.3rem] border-gray-500/40 shadow-sm"
            emptyTitle="No reports found"
            emptyMessage="Adjust filters to find the report you need."
          />
        </AdminPageMain>
      ) : null}

      <Modal
        open={shareModalOpen}
        title="Share welfare accounts overview with members?"
        subtitle="The reconciled PDF summary will be emailed to every active member with an email address on file."
        onClose={() => !sharing && setShareModalOpen(false)}
        footer={(
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" disabled={sharing} onClick={() => setShareModalOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={<FiMail />} isLoading={sharing} onClick={() => void shareOverviewWithMembers()}>Send to members</Button>
          </div>
        )}
      >
        <p className="text-sm text-ink-600">
          Members will receive completed-loan interest paid, the distributable-income breakdown, fund balances, outstanding loan position, and the live per-member estimate. Pending interest is disclosed separately and excluded from distribution.
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink-700">
          <input type="checkbox" checked={includeExcelOnShare} onChange={(event) => setIncludeExcelOnShare(event.target.checked)} className="rounded border-ink-300" />
          Also attach Excel workbook
        </label>
      </Modal>
    </AdminPageLayout>
  );
}
