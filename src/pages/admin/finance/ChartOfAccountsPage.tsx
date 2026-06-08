import { useEffect, useMemo, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import type { MultiFilterSection, MultiFilterValue } from '@/components/ui/MultiFilterDropdown';
import { Modal } from '@/components/ui/Modal';
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

const accountFilterSections: MultiFilterSection[] = [
  {
    id: 'type',
    title: 'Account type',
    options: ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'].map((type) => ({ value: type, label: type })),
  },
  {
    id: 'system',
    title: 'Account class',
    options: [
      { value: 'SYSTEM', label: 'System accounts' },
      { value: 'CUSTOM', label: 'Custom accounts' },
    ],
  },
];

export function ChartOfAccountsPage({ embedded = false }: { embedded?: boolean }) {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState<MultiFilterValue>({ type: [], system: [] });
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

  const filteredAccounts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const type = String(filterValue.type?.[0] ?? '');
    const system = String(filterValue.system?.[0] ?? '');
    return accounts.filter((account) => {
      if (type && account.type !== type) return false;
      if (system === 'SYSTEM' && !account.isSystemAccount) return false;
      if (system === 'CUSTOM' && account.isSystemAccount) return false;
      if (!term) return true;
      return [account.code, account.name, account.type, account.fund?.name].some((value) =>
        String(value ?? '').toLowerCase().includes(term),
      );
    });
  }, [accounts, filterValue.system, filterValue.type, search]);

  const columns: Column<LedgerAccount>[] = [
    { key: 'code', header: 'Code', render: (a) => <span className="font-mono text-xs text-ink-700">{a.code}</span> },
    { key: 'name', header: 'Name', render: (a) => <span className="font-medium text-ink-900">{a.name}</span> },
    { key: 'type', header: 'Type', render: (a) => <Badge tone={TYPE_COLORS[a.type]}>{a.type}</Badge> },
    { key: 'fund', header: 'Fund', render: (a) => a.fund?.name ?? <span className="text-ink-400">None</span> },
    { key: 'system', header: 'Class', render: (a) => a.isSystemAccount ? <Badge tone="neutral">System</Badge> : <Badge tone="gray2">Custom</Badge> },
  ];

  return (
    <div className="space-y-6">
      {!embedded ? (
        <PageHeader
          title="Chart of Accounts"
          subtitle="Manage the system's ledger accounts organized by type"
          action={<Button icon={<FiPlus />} onClick={() => setShowNew(true)}>New Account</Button>}
        />
      ) : (
        <div className="flex justify-end">
          <Button icon={<FiPlus />} onClick={() => setShowNew(true)}>New Account</Button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={filteredAccounts}
        getRowKey={(a) => a.id}
        search
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search account code, name, type, or fund"
        filter
        filterValue={filterValue}
        onFilterChange={setFilterValue}
        filterSections={accountFilterSections}
        filterButtonLabel="Account Filters"
        filterTitle="Account Filters"
        tableLoading={loading}
        showAutoNumber
        emptyTitle="No accounts found"
        emptyMessage="Create your first ledger account or adjust the filters."
      />

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
