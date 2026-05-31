import { useEffect, useState } from 'react';
import { FiPlus, FiSettings, FiLock } from 'react-icons/fi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/Card';
import { Spinner, EmptyState } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { FinancialYearStatusBadge } from '@/components/ledger/FinancialYearStatusBadge';
import { ledgerApi } from '@/services/ledgerApi';
import type { FinancialYear, WelfareSetting } from '@/types/ledger';

function money(n: number) { return `KES ${Number(n).toLocaleString()}`; }

export function FinancialYearsPage() {
  const [years, setYears] = useState<FinancialYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showSettings, setShowSettings] = useState<FinancialYear | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const [settingsForm, setSettingsForm] = useState<Partial<WelfareSetting>>({});

  const load = () => {
    setLoading(true);
    ledgerApi.listFinancialYears()
      .then(setYears)
      .catch(() => setError('Failed to load financial years'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openSettings = (fy: FinancialYear) => {
    setShowSettings(fy);
    if (fy.settings) {
      setSettingsForm({
        registrationFeeAmount: fy.settings.registrationFeeAmount,
        minShareCapital: fy.settings.minShareCapital,
        maxShareCapital: fy.settings.maxShareCapital,
        minWeeklySavings: fy.settings.minWeeklySavings,
        maxWeeklySavings: fy.settings.maxWeeklySavings,
        monthlyWelfareContribution: fy.settings.monthlyWelfareContribution,
        loanInterestRateMonthly: fy.settings.loanInterestRateMonthly,
        loanMultiplierLimit: fy.settings.loanMultiplierLimit,
        loanMaxRolloverMonths: fy.settings.loanMaxRolloverMonths,
        latePenaltyRate: fy.settings.latePenaltyRate,
      });
    }
  };

  const submitNew = async () => {
    setSaving(true);
    try {
      await ledgerApi.createFinancialYear({ name: form.name, startDate: form.startDate, endDate: form.endDate });
      setShowNew(false);
      setForm({ name: '', startDate: '', endDate: '' });
      load();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Failed to create financial year');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!showSettings) return;
    setSaving(true);
    try {
      await ledgerApi.upsertWelfareSettings(showSettings.id, settingsForm);
      setShowSettings(null);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const closeFY = async (fy: FinancialYear) => {
    if (!confirm(`Close financial year ${fy.name}? This will block new postings.`)) return;
    try {
      await ledgerApi.closeFinancialYear(fy.id);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Failed to close financial year');
    }
  };

  const openYear = years.find((y) => y.status === 'OPEN');
  const totalJournals = years.reduce((s, y) => s + (y._count?.journalEntries ?? 0), 0);
  const totalContributions = years.reduce((s, y) => s + (y._count?.contributions ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Years"
        subtitle="Manage financial years and welfare configuration settings"
        action={<Button icon={<FiPlus />} onClick={() => setShowNew(true)}>New Financial Year</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Financial Year" value={openYear?.name ?? 'None'} detail={openYear ? 'Currently open' : 'No open year'} />
        <StatCard label="Total Journal Entries" value={totalJournals.toLocaleString()} />
        <StatCard label="Total Contributions" value={totalContributions.toLocaleString()} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error ? (
        <EmptyState title="Error" message={error} />
      ) : (
        <DataTable
          columns={[
            { key: 'name', header: 'Year', render: (fy) => <span className="font-semibold text-ink-900">{fy.name}</span> },
            { key: 'period', header: 'Period', render: (fy) => `${new Date(fy.startDate).toLocaleDateString()} – ${new Date(fy.endDate).toLocaleDateString()}` },
            { key: 'status', header: 'Status', render: (fy) => <FinancialYearStatusBadge status={fy.status} /> },
            { key: 'entries', header: 'Journals', render: (fy) => fy._count?.journalEntries ?? 0 },
            { key: 'contributions', header: 'Contributions', render: (fy) => fy._count?.contributions ?? 0 },
            {
              key: 'actions', header: '', render: (fy) => (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" icon={<FiSettings size={14} />} onClick={() => openSettings(fy)}>Settings</Button>
                  {fy.status === 'OPEN' && (
                    <Button size="sm" variant="ghost" icon={<FiLock size={14} />} onClick={() => closeFY(fy)} className="text-red-600 hover:bg-red-50">Close Year</Button>
                  )}
                </div>
              )
            },
          ]}
          rows={years}
          getRowKey={(fy) => fy.id}
        />
      )}

      {/* New FY Modal */}
      <Modal open={showNew} title="New Financial Year" onClose={() => setShowNew(false)} footer={
        <div className="flex justify-end gap-2 px-5 py-3">
          <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button onClick={submitNew} isLoading={saving} loadingText="Creating...">Create</Button>
        </div>
      }>
        <div className="space-y-4 p-5">
          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-1">Year Name</label>
            <input className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. FY-2027" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">Start Date</label>
              <input type="date" className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">End Date</label>
              <input type="date" className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
      {showSettings && (
        <Modal open={!!showSettings} title={`Welfare Settings — ${showSettings.name}`} onClose={() => setShowSettings(null)} size="lg" footer={
          <div className="flex justify-end gap-2 px-5 py-3">
            <Button variant="secondary" onClick={() => setShowSettings(null)}>Cancel</Button>
            <Button onClick={saveSettings} isLoading={saving} loadingText="Saving...">Save Settings</Button>
          </div>
        }>
          <div className="p-5 space-y-4">
            <p className="text-sm text-ink-500">Configure financial parameters for {showSettings.name}. These values drive contribution validation, loan eligibility, and arrears calculations.</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                ['registrationFeeAmount', 'Registration Fee (KES)'],
                ['minShareCapital', 'Min Share Capital (KES)'],
                ['maxShareCapital', 'Max Share Capital (KES)'],
                ['minWeeklySavings', 'Min Weekly Savings (KES)'],
                ['maxWeeklySavings', 'Max Weekly Savings (KES)'],
                ['monthlyWelfareContribution', 'Monthly Welfare Kitty (KES)'],
                ['loanInterestRateMonthly', 'Loan Interest Rate (% monthly)'],
                ['loanMultiplierLimit', 'Loan Multiplier'],
                ['loanMaxRolloverMonths', 'Max Rollover Months'],
                ['latePenaltyRate', 'Late Penalty Rate (%)'],
              ].map(([field, label]) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-ink-600 mb-1">{label}</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm"
                    value={settingsForm[field as keyof WelfareSetting] ?? ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, [field]: Number(e.target.value) })}
                  />
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
