import { useEffect, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Spinner, EmptyState } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { ledgerApi } from '@/services/ledgerApi';
import type { LedgerAccount, LedgerAccountType } from '@/types/ledger';

const TYPE_COLORS: Record<LedgerAccountType, 'success' | 'neutral' | 'warning' | 'danger'> = {
  ASSET: 'success',
  LIABILITY: 'warning',
  EQUITY: 'neutral',
  INCOME: 'success',
  EXPENSE: 'danger',
};

export function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'ASSET' as LedgerAccountType, fundId: '' });

  const load = () => {
    setLoading(true);
    ledgerApi.listAccounts().then(setAccounts).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSaving(true);
    try {
      await ledgerApi.createAccount({ code: form.code, name: form.name, type: form.type, fundId: form.fundId || undefined });
      setShowNew(false);
      setForm({ code: '', name: '', type: 'ASSET', fundId: '' });
      load();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  const grouped = accounts.reduce<Record<string, LedgerAccount[]>>((acc, a) => {
    acc[a.type] = acc[a.type] ?? [];
    acc[a.type].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Manage the system's ledger accounts organized by type"
        action={<Button icon={<FiPlus />} onClick={() => setShowNew(true)}>New Account</Button>}
      />

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !accounts.length ? (
        <EmptyState title="No accounts found" message="Create your first ledger account." />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, accts]) => (
            <div key={type}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase text-ink-500 tracking-wide">{type}</h3>
                <Badge tone={TYPE_COLORS[type as LedgerAccountType]}>{accts.length}</Badge>
              </div>
              <DataTable
                columns={[
                  { key: 'code', header: 'Code', render: (a) => <span className="font-mono text-xs text-ink-700">{a.code}</span> },
                  { key: 'name', header: 'Name', render: (a) => <span className="font-medium text-ink-900">{a.name}</span> },
                  { key: 'fund', header: 'Fund', render: (a) => a.fund?.name ?? <span className="text-ink-400">—</span> },
                  { key: 'system', header: '', render: (a) => a.isSystemAccount ? <Badge tone="neutral">System</Badge> : null },
                ]}
                rows={accts}
                getRowKey={(a) => a.id}
              />
            </div>
          ))}
        </div>
      )}

      <Modal open={showNew} title="New Ledger Account" onClose={() => setShowNew(false)} footer={
        <div className="flex justify-end gap-2 px-5 py-3">
          <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button onClick={submit} isLoading={saving} loadingText="Creating...">Create Account</Button>
        </div>
      }>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">Account Code</label>
              <input className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" placeholder="e.g. 6001" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">Type</label>
              <select className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LedgerAccountType })}>
                {['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-1">Account Name</label>
            <input className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" placeholder="e.g. Petty Cash" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
