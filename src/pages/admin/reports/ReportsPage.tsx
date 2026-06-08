import { useMemo, useState } from 'react';
import { FiDownload, FiRefreshCw } from 'react-icons/fi';
import { TbChartBar, TbFileAnalytics, TbFileSpreadsheet, TbScale, TbWallet } from 'react-icons/tb';
import { api } from '@/services/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import DataTable, { type Column } from '@/components/ui/DataTable';
import type { MultiFilterSection, MultiFilterValue } from '@/components/ui/MultiFilterDropdown';
import { PageHeader } from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { AdminPageLayout, AdminPageMain, AdminPageStatsGrid } from '@/layouts/AdminPageLayout';
import { downloadReport, money } from '@/pages/admin/shared/adminFormatters';
import { StateBlock, useLoad } from '@/pages/admin/shared/adminUi';

type ReportRow = {
  key: string;
  title: string;
  category: 'finance' | 'loans' | 'meetings' | 'welfare' | 'audit' | 'yearEnd';
  cadence: string;
  formats: Array<'pdf' | 'csv'>;
};

const reportRows: ReportRow[] = [
  { key: 'executive', title: 'Executive dashboard', category: 'finance', cadence: 'Board pack', formats: ['pdf', 'csv'] },
  { key: 'fund-balances', title: 'Fund balances', category: 'finance', cadence: 'Daily close', formats: ['pdf', 'csv'] },
  { key: 'trial-balance', title: 'Trial balance', category: 'finance', cadence: 'Month end', formats: ['pdf', 'csv'] },
  { key: 'meeting-collections', title: 'Meeting collections', category: 'meetings', cadence: 'Per meeting', formats: ['pdf', 'csv'] },
  { key: 'loan-aging', title: 'Loan aging', category: 'loans', cadence: 'Credit review', formats: ['pdf', 'csv'] },
  { key: 'loan-applications', title: 'Loan applications', category: 'loans', cadence: 'Committee pack', formats: ['pdf', 'csv'] },
  { key: 'loan-repayments', title: 'Loan repayments', category: 'loans', cadence: 'Cash office', formats: ['pdf', 'csv'] },
  { key: 'contributions', title: 'Contributions register', category: 'finance', cadence: 'Cash office', formats: ['pdf', 'csv'] },
  { key: 'receipts', title: 'Receipts register', category: 'finance', cadence: 'Cash office', formats: ['pdf', 'csv'] },
  { key: 'welfare-claims', title: 'Welfare claims', category: 'welfare', cadence: 'Committee pack', formats: ['pdf', 'csv'] },
  { key: 'audit-pack', title: 'Audit pack', category: 'audit', cadence: 'Audit file', formats: ['pdf', 'csv'] },
  { key: 'year-end-allocation', title: 'Year-end allocation', category: 'yearEnd', cadence: 'AGM close', formats: ['pdf', 'csv'] },
];

const reportFilterSections: MultiFilterSection[] = [
  {
    id: 'category',
    title: 'Report family',
    options: [
      { value: 'finance', label: 'Finance' },
      { value: 'loans', label: 'Loans' },
      { value: 'meetings', label: 'Meetings' },
      { value: 'welfare', label: 'Welfare' },
      { value: 'audit', label: 'Audit' },
      { value: 'yearEnd', label: 'Year end' },
    ],
  },
];

const categoryLabels: Record<ReportRow['category'], string> = {
  finance: 'Finance',
  loans: 'Loans',
  meetings: 'Meetings',
  welfare: 'Welfare',
  audit: 'Audit',
  yearEnd: 'Year end',
};

export function ReportsPage() {
  const { data, loading, error, reload } = useLoad(async () => {
    const [executive, funds, aging, trial, collections] = await Promise.all([
      api.get('/reports/executive'),
      api.get('/reports/fund-balances'),
      api.get('/reports/loan-aging'),
      api.get('/reports/trial-balance'),
      api.get('/reports/meeting-collections'),
    ]);
    return {
      executive: executive.data.data,
      funds: funds.data.data ?? [],
      aging: aging.data.data ?? [],
      trial: trial.data.data,
      collections: collections.data.data,
    };
  }, []);
  const [exporting, setExporting] = useState('');
  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState<MultiFilterValue>({ category: [] });

  const runExport = async (key: string, format: 'pdf' | 'csv') => {
    setExporting(`${key}-${format}`);
    try {
      await downloadReport(key, format);
    } finally {
      setExporting('');
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
              disabled={!!exporting}
              isLoading={exporting === `${report.key}-${format}`}
              onClick={() => void runExport(report.key, format)}
            >
              {format.toUpperCase()}
            </Button>
          ))}
        </div>
      ),
    },
  ];

  const executive = data?.executive ?? {};
  const trial = data?.trial;
  const aging = data?.aging ?? [];
  const funds = data?.funds ?? [];
  const collections = data?.collections;
  const fundTotal = funds.reduce((sum: number, fund: { balance: number }) => sum + Number(fund.balance), 0);
  const agedLoanValue = aging.reduce((sum: number, loan: { outstanding?: number; outstandingBalance?: number }) => sum + Number(loan.outstanding ?? loan.outstandingBalance ?? 0), 0);

  return (
    <AdminPageLayout>
      <PageHeader
        title="Reports"
        subtitle="Executive reporting, audit evidence, finance registers, and committee packs."
        action={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void reload()}>Refresh</Button>}
      />

      <StateBlock loading={loading && !data} error={error} />

      <AdminPageStatsGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TbWallet} iconColor="#1f7a76" label="Fund balances" value={money(fundTotal)} subtitle={`${funds.length} funds`} />
        <StatCard icon={TbChartBar} iconColor="#16a34a" label="Distributable income" value={money(executive.distributableIncome ?? 0)} subtitle="Interest plus fines" />
        <StatCard icon={TbScale} iconColor={trial?.balanced ? '#16a34a' : '#dc2626'} label="Trial balance" value={trial?.balanced ? 'Balanced' : 'Review'} subtitle={trial ? `${money(trial.totalDebits)} debits` : 'Not loaded'} />
        <StatCard icon={TbFileAnalytics} iconColor="#d97706" label="Loan aging" value={money(agedLoanValue)} subtitle={`${aging.length} loans in aging`} />
      </AdminPageStatsGrid>

      {data ? (
        <div className="mb-4 grid shrink-0 gap-4 xl:grid-cols-3">
          <Card className="p-5 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-ink-900">Financial Position</h3>
                <p className="text-xs font-semibold text-ink-500">Ledger-derived balances and income controls</p>
              </div>
              <Badge tone={trial?.balanced ? 'success' : 'danger'}>{trial?.balanced ? 'Balanced' : 'Out of balance'}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                <p className="text-xs font-bold uppercase text-ink-500">Loan interest income</p>
                <p className="mt-1 text-xl font-extrabold text-ink-900">{money(executive.loanInterestIncome ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                <p className="text-xs font-bold uppercase text-ink-500">Fines income</p>
                <p className="mt-1 text-xl font-extrabold text-ink-900">{money(executive.finesIncome ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                <p className="text-xs font-bold uppercase text-ink-500">Total debits</p>
                <p className="mt-1 text-xl font-extrabold text-ink-900">{money(trial?.totalDebits ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                <p className="text-xs font-bold uppercase text-ink-500">Total credits</p>
                <p className="mt-1 text-xl font-extrabold text-ink-900">{money(trial?.totalCredits ?? 0)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-ink-900">Fund Snapshot</h3>
              <Badge tone="success">{funds.length} funds</Badge>
            </div>
            <div className="space-y-2">
              {funds.slice(0, 6).map((fund: { code: string; fund: string; balance: number }) => (
                <div key={fund.code} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm">
                  <span className="font-semibold text-ink-700">{fund.fund}</span>
                  <span className="font-bold text-ink-900">{money(fund.balance)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-ink-900">Meeting Collections</h3>
              <Badge tone="neutral">Totals</Badge>
            </div>
            <div className="space-y-2">
              {Object.entries(collections?.totals ?? {}).slice(0, 6).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm">
                  <span className="font-semibold capitalize text-ink-700">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="font-bold text-ink-900">{money(value)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-ink-900">Credit Risk Watch</h3>
              <Badge tone={aging.length ? 'warning' : 'success'}>{aging.length} loans</Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {aging.slice(0, 6).map((loan: { loanNumber: string; member: string; status: string; agingBucket: string }) => (
                <div key={loan.loanNumber} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-semibold text-ink-700">{loan.loanNumber} - {loan.member}</span>
                  <Badge tone={loan.agingBucket === '90+' ? 'danger' : 'warning'}>{loan.agingBucket}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

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
          actionsButtons={(
            <Button variant="secondary" icon={<TbFileSpreadsheet />} disabled={!!exporting} onClick={() => void runExport('audit-pack', 'pdf')}>
              Audit Pack
            </Button>
          )}
          showAutoNumber
          fillContainer
          containerClassName="h-full rounded-[1.3rem] border-gray-500/40 shadow-sm"
          emptyTitle="No reports found"
          emptyMessage="Adjust filters to find the report you need."
        />
      </AdminPageMain>
    </AdminPageLayout>
  );
}
