import { useMemo, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { api } from '@/services/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, StatCard } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { downloadReport, money } from '@/pages/admin/shared/adminFormatters';
import { StateBlock, useLoad } from '@/pages/admin/shared/adminUi';

export function ReportsPage() {
  const { data, loading, error, reload } = useLoad(async () => {
    const [executive, funds, aging, trial, collections] = await Promise.all([
      api.get('/reports/executive'),
      api.get('/reports/fund-balances'),
      api.get('/reports/loan-aging'),
      api.get('/reports/trial-balance'),
      api.get('/reports/meeting-collections'),
    ]);
    return { executive: executive.data.data, funds: funds.data.data ?? [], aging: aging.data.data ?? [], trial: trial.data.data, collections: collections.data.data };
  }, []);
  const metrics = useMemo(() => (data?.executive ? Object.entries(data.executive).slice(0, 10) : []), [data]);
  const [exporting, setExporting] = useState('');
  const runExport = async (key: string, format: 'pdf' | 'csv') => {
    setExporting(`${key}-${format}`);
    try {
      await downloadReport(key, format);
    } finally {
      setExporting('');
    }
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Reports and Audit Readiness" subtitle="Ledger-derived dashboards, fund balances, trial balance, loan aging, meeting collections, and audit-pack source data." action={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void reload()}>Refresh</Button>} />
      <StateBlock loading={loading} error={error} />
      {data ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard label="Loan interest income (ledger 4001)" value={money(data.executive.loanInterestIncome ?? 0)} detail="Running year-end distributable income" />
            <StatCard label="Fines income (ledger 4003)" value={money(data.executive.finesIncome ?? 0)} detail="Posted fine payments to income account" />
            <StatCard label="Accrued fines (Fine records)" value={money(data.executive.totalFines ?? 0)} detail="Pending and paid fine records" />
            <StatCard label="Distributable income" value={money(data.executive.distributableIncome ?? 0)} detail="Interest plus fines for year-end split" />
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {metrics.map(([key, value]) => <StatCard key={key} label={key} value={typeof value === 'number' ? money(value) : String(value)} />)}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-5 xl:col-span-2">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-extrabold text-ink-900">Export Center</h3>
                  <p className="text-sm text-ink-500">PDF and CSV exports are generated through RBAC-protected report endpoints and audit-logged.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['fund-balances', 'trial-balance', 'meeting-collections', 'loan-aging', 'audit-pack', 'year-end-allocation', 'meeting-close'].map((key) => (
                    <div key={key} className="flex overflow-hidden rounded-lg border border-ink-200 bg-white">
                      <button type="button" className="px-3 py-2 text-xs font-bold text-ink-700" onClick={() => void runExport(key, 'pdf')} disabled={!!exporting}>{key}</button>
                      <button type="button" className="border-l border-ink-200 px-3 py-2 text-xs font-bold text-brand-700" onClick={() => void runExport(key, 'csv')} disabled={!!exporting}>CSV</button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-extrabold text-ink-900">Fund Balances</h3><Badge tone="success">{data.funds.length} funds</Badge></div>
              <div className="space-y-2">
                {data.funds.map((fund: { code: string; fund: string; balance: number }) => <div key={fund.code} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm"><span className="font-semibold">{fund.fund}</span><span>{money(fund.balance)}</span></div>)}
              </div>
            </Card>
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-extrabold text-ink-900">Trial Balance</h3><Badge tone={data.trial.balanced ? 'success' : 'danger'}>{data.trial.balanced ? 'Balanced' : 'Out of balance'}</Badge></div>
              <div className="grid gap-3 md:grid-cols-2">
                <StatCard label="Debits" value={money(data.trial.totalDebits)} />
                <StatCard label="Credits" value={money(data.trial.totalCredits)} />
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 font-extrabold text-ink-900">Loan Aging</h3>
              <div className="space-y-2">{data.aging.slice(0, 8).map((loan: { loanNumber: string; member: string; status: string; agingBucket: string }) => <div key={loan.loanNumber} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm"><span>{loan.loanNumber} - {loan.member}</span><Badge>{loan.agingBucket}</Badge></div>)}</div>
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 font-extrabold text-ink-900">Meeting Collections</h3>
              <div className="space-y-2">{Object.entries(data.collections.totals ?? {}).map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm"><span>{key}</span><span className="font-bold">{money(value)}</span></div>)}</div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
