import { useEffect, useState } from 'react';
import { FiPlus, FiRefreshCw, FiEye } from 'react-icons/fi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import type { MultiFilterSection, MultiFilterValue } from '@/components/ui/MultiFilterDropdown';
import { Modal } from '@/components/ui/Modal';
import { JournalStatusBadge } from '@/components/ledger/JournalEntryStatusBadge';
import { ledgerApi } from '@/services/ledgerApi';
import type { JournalEntry, LedgerAccount } from '@/types/ledger';

function money(n: number) { return `KES ${Number(n).toLocaleString()}`; }

function journalAmount(entry: JournalEntry) {
  return entry.lines?.reduce((sum, line) => sum + Number(line.debitAmount), 0) ?? 0;
}

const journalFilterSections: MultiFilterSection[] = [
  {
    id: 'status',
    title: 'Journal status',
    options: [
      { value: 'POSTED', label: 'Posted' },
      { value: 'REVERSED', label: 'Reversed' },
      { value: 'DRAFT', label: 'Draft' },
    ],
  },
];

export function JournalsPage({ embedded = false }: { embedded?: boolean }) {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterValue, setFilterValue] = useState<MultiFilterValue>({ status: [] });
  const [selected, setSelected] = useState<JournalEntry | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [saving, setSaving] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  const [showReverse, setShowReverse] = useState<JournalEntry | null>(null);
  const [newForm, setNewForm] = useState({
    transactionDate: new Date().toISOString().slice(0, 10),
    description: '',
    reference: '',
    lines: [
      { ledgerAccountId: '', debitAmount: 0, creditAmount: 0, description: '' },
      { ledgerAccountId: '', debitAmount: 0, creditAmount: 0, description: '' },
    ],
  });

  const load = () => {
    setLoading(true);
    ledgerApi.listJournals({ page, search: search || undefined, status: statusFilter || undefined })
      .then(({ data, meta }) => { setJournals(data); setMeta(meta); })
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
  useEffect(() => { ledgerApi.listAccounts().then(setAccounts); }, []);

  const addLine = () => setNewForm({ ...newForm, lines: [...newForm.lines, { ledgerAccountId: '', debitAmount: 0, creditAmount: 0, description: '' }] });
  const updateLine = (i: number, field: string, value: any) => {
    const lines = [...newForm.lines];
    lines[i] = { ...lines[i], [field]: value };
    setNewForm({ ...newForm, lines });
  };

  const submitJournal = async () => {
    setSaving(true);
    try {
      await ledgerApi.postJournal({ ...newForm, lines: newForm.lines.map((l) => ({ ...l, debitAmount: Number(l.debitAmount), creditAmount: Number(l.creditAmount) })) });
      setShowNew(false);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Failed to post journal');
    } finally {
      setSaving(false);
    }
  };

  const submitReverse = async () => {
    if (!showReverse || !reverseReason.trim()) return;
    setReversing(true);
    try {
      await ledgerApi.reverseJournal(showReverse.id, reverseReason);
      setShowReverse(null);
      setReverseReason('');
      load();
    } catch (e: any) {
      alert(e.response?.data?.error ?? 'Failed to reverse journal');
    } finally {
      setReversing(false);
    }
  };

  const debitTotal = newForm.lines.reduce((s, l) => s + Number(l.debitAmount), 0);
  const creditTotal = newForm.lines.reduce((s, l) => s + Number(l.creditAmount), 0);
  const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01;

  const columns: Column<JournalEntry>[] = [
    { key: 'entryNo', header: 'Entry No', render: (j) => <span className="font-mono text-xs font-semibold text-brand-700">{j.entryNo}</span> },
    { key: 'date', header: 'Date', render: (j) => new Date(j.transactionDate).toLocaleDateString() },
    { key: 'description', header: 'Description', render: (j) => <span className="max-w-xs truncate block">{j.description}</span> },
    { key: 'amount', header: 'Amount', render: (j) => <span className="font-mono text-sm font-semibold">{money(journalAmount(j))}</span> },
    { key: 'lines', header: 'Lines', render: (j) => j.lines?.length ?? '—' },
    { key: 'status', header: 'Status', render: (j) => <JournalStatusBadge status={j.status} /> },
    {
      key: 'actions', header: '', render: (j) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" icon={<FiEye size={13} />} onClick={(e) => { e.stopPropagation(); setSelected(j); }}>View</Button>
          {j.status === 'POSTED' && (
            <Button size="sm" variant="ghost" icon={<FiRefreshCw size={13} />} onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowReverse(j); }} className="text-red-600 hover:bg-red-50">Reverse</Button>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      {!embedded ? (
        <PageHeader
          title="Journal Entries"
          subtitle="Double-entry bookkeeping ledger"
          action={<Button icon={<FiPlus />} onClick={() => setShowNew(true)}>Post Journal Entry</Button>}
        />
      ) : (
        <div className="flex justify-end">
          <Button icon={<FiPlus />} onClick={() => setShowNew(true)}>Post Journal Entry</Button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={journals}
        getRowKey={(j) => j.id}
        onRowClick={(j) => setSelected(j)}
        selectedRowId={selected?.id}
        search
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        searchPlaceholder="Search by entry number or description"
        filter
        filterValue={filterValue}
        onFilterChange={setFilterValue}
        filterSections={journalFilterSections}
        filterButtonLabel="Journal Filters"
        filterTitle="Journal Filters"
        tableLoading={loading}
        showAutoNumber
        startIndex={meta?.total ? (page - 1) * ((meta.pageSize ?? journals.length) || 20) + 1 : 0}
        endIndex={meta?.total ? Math.min(page * ((meta.pageSize ?? journals.length) || 20), meta.total) : journals.length}
        totalItems={meta?.total ?? journals.length}
        currentPage={page}
        totalPages={meta?.totalPages ?? 1}
        onPageChange={setPage}
        emptyTitle="No journal entries"
        emptyMessage="Posted and reversed journal entries will appear here."
      />

      {/* View entry */}
      {selected && (
        <Modal open={!!selected} title={`Journal Entry — ${selected.entryNo}`} onClose={() => setSelected(null)} size="xl">
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-semibold text-ink-600">Date:</span> {new Date(selected.transactionDate).toLocaleDateString()}</div>
              <div><span className="font-semibold text-ink-600">Status:</span> <JournalStatusBadge status={selected.status} /></div>
              <div className="col-span-2"><span className="font-semibold text-ink-600">Description:</span> {selected.description}</div>
              {selected.reversalReason && <div className="col-span-2 text-amber-600"><span className="font-semibold">Reversal Reason:</span> {selected.reversalReason}</div>}
            </div>
            <table className="min-w-full divide-y divide-ink-100 border border-ink-100 rounded-lg text-sm">
              <thead className="bg-ink-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-ink-500">Account</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-ink-500">Member</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-ink-500">Debit (KES)</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-ink-500">Credit (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {selected.lines?.map((line, i) => (
                  <tr key={i} className="hover:bg-ink-50">
                    <td className="px-4 py-2">{line.ledgerAccount?.name ?? line.ledgerAccountId}</td>
                    <td className="px-4 py-2 text-ink-500">{line.member?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-mono">{Number(line.debitAmount) > 0 ? money(Number(line.debitAmount)) : '—'}</td>
                    <td className="px-4 py-2 text-right font-mono">{Number(line.creditAmount) > 0 ? money(Number(line.creditAmount)) : '—'}</td>
                  </tr>
                ))}
                <tr className="bg-ink-50 font-semibold">
                  <td colSpan={2} className="px-4 py-2 text-ink-600">Totals</td>
                  <td className="px-4 py-2 text-right font-mono">{money(selected.lines?.reduce((s, l) => s + Number(l.debitAmount), 0) ?? 0)}</td>
                  <td className="px-4 py-2 text-right font-mono">{money(selected.lines?.reduce((s, l) => s + Number(l.creditAmount), 0) ?? 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* New Journal */}
      <Modal open={showNew} title="Post Journal Entry" onClose={() => setShowNew(false)} size="xl" footer={
        <div className="flex items-center justify-between px-5 py-3">
          <div className={`text-sm font-semibold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
            {isBalanced ? '✓ Balanced' : `⚠ Imbalance: KES ${Math.abs(debitTotal - creditTotal).toLocaleString()}`}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={submitJournal} disabled={!isBalanced} isLoading={saving} loadingText="Posting...">Post Entry</Button>
          </div>
        </div>
      }>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">Transaction Date</label>
              <input type="date" className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" value={newForm.transactionDate} onChange={(e) => setNewForm({ ...newForm, transactionDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">Reference</label>
              <input className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" placeholder="Optional reference" value={newForm.reference} onChange={(e) => setNewForm({ ...newForm, reference: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-1">Description</label>
            <input className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-ink-700">Journal Lines</label>
              <Button size="sm" variant="ghost" icon={<FiPlus size={13} />} onClick={addLine}>Add Line</Button>
            </div>
            <table className="w-full text-sm border border-ink-100 rounded-lg overflow-hidden">
              <thead className="bg-ink-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-ink-500">Account</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-ink-500 w-32">Debit (KES)</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-ink-500 w-32">Credit (KES)</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-ink-500">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {newForm.lines.map((line, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <select className="w-full rounded border border-ink-200 px-2 py-1 text-xs" value={line.ledgerAccountId} onChange={(e) => updateLine(i, 'ledgerAccountId', e.target.value)}>
                        <option value="">Select account...</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2"><input type="number" className="w-full rounded border border-ink-200 px-2 py-1 text-xs text-right" value={line.debitAmount || ''} onChange={(e) => updateLine(i, 'debitAmount', e.target.value)} min="0" /></td>
                    <td className="px-3 py-2"><input type="number" className="w-full rounded border border-ink-200 px-2 py-1 text-xs text-right" value={line.creditAmount || ''} onChange={(e) => updateLine(i, 'creditAmount', e.target.value)} min="0" /></td>
                    <td className="px-3 py-2"><input className="w-full rounded border border-ink-200 px-2 py-1 text-xs" value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} placeholder="optional" /></td>
                  </tr>
                ))}
                <tr className="bg-ink-50 text-xs font-semibold">
                  <td className="px-3 py-2 text-ink-600">Totals</td>
                  <td className="px-3 py-2 text-right font-mono">{money(debitTotal)}</td>
                  <td className="px-3 py-2 text-right font-mono">{money(creditTotal)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Reverse Modal */}
      {showReverse && (
        <Modal open={!!showReverse} title={`Reverse Entry — ${showReverse.entryNo}`} onClose={() => setShowReverse(null)} footer={
          <div className="flex justify-end gap-2 px-5 py-3">
            <Button variant="secondary" onClick={() => setShowReverse(null)}>Cancel</Button>
            <Button variant="danger" onClick={submitReverse} disabled={!reverseReason.trim()} isLoading={reversing} loadingText="Reversing...">Confirm Reversal</Button>
          </div>
        }>
          <div className="p-5 space-y-4">
            <p className="text-sm text-ink-600">A reversal entry will be created with swapped debits/credits. This action cannot be undone.</p>
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">Reason for Reversal <span className="text-red-500">*</span></label>
              <textarea className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm resize-none" rows={3} value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} placeholder="State the reason for reversing this entry..." />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
