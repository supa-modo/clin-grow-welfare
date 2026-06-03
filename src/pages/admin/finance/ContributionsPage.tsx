import { useEffect, useState, useRef } from 'react';
import { FiPlus, FiUpload, FiRefreshCw, FiDownload, FiAlertCircle } from 'react-icons/fi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Spinner, EmptyState } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { contributionApi } from '@/services/contributionApi';
import type { Contribution, ContributionType, PaymentMethod } from '@/types/contribution';
import { useUiStore } from '@/store/uiStore';

const TYPE_LABELS: Record<ContributionType, string> = {
  REGISTRATION: 'Registration', SHARE_CAPITAL: 'Share Capital', WEEKLY_SAVINGS: 'Weekly Savings',
  WELFARE_KITTY: 'Welfare Kitty', EMERGENCY_CONTRIBUTION: 'Emergency', FINE_PAYMENT: 'Fine', OTHER: 'Other',
};

function money(n: number | string) { return `KES ${Number(n).toLocaleString()}`; }
function statusTone(s: string): 'success' | 'danger' | 'neutral' { return s === 'POSTED' ? 'success' : s === 'REVERSED' ? 'danger' : 'neutral'; }

export function ContributionsPage() {
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showReverse, setShowReverse] = useState<Contribution | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [batchResult, setBatchResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ memberId: '', contributionType: 'SHARE_CAPITAL' as ContributionType, amount: '', periodDate: new Date().toISOString().slice(0, 10), paymentMethod: 'CASH' as PaymentMethod, paymentReference: '' });

  const load = () => {
    setLoading(true);
    contributionApi.list({ page, search: search || undefined, status: statusFilter || undefined, type: typeFilter || undefined })
      .then(({ data, meta }) => { setContributions(data); setMeta(meta); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search, statusFilter, typeFilter]);

  const submit = async () => {
    setSaving(true);
    try {
      await contributionApi.post({ ...form, amount: Number(form.amount) });
      setShowNew(false);
      setForm({ memberId: '', contributionType: 'SHARE_CAPITAL', amount: '', periodDate: new Date().toISOString().slice(0, 10), paymentMethod: 'CASH', paymentReference: '' });
      load();
      toastSuccess('Contribution posted', 'Receipt has been recorded.');
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'response' in e && e.response && typeof e.response === 'object' && 'data' in e.response && e.response.data && typeof e.response.data === 'object' && 'error' in e.response.data ? String(e.response.data.error) : 'Failed to post contribution';
      toastError('Post failed', message);
    } finally {
      setSaving(false);
    }
  };

  const submitReverse = async () => {
    if (!showReverse || !reverseReason.trim()) return;
    setSaving(true);
    try {
      await contributionApi.reverse(showReverse.id, reverseReason);
      setShowReverse(null);
      setReverseReason('');
      load();
      toastSuccess('Contribution reversed', 'Ledger entry has been reversed.');
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'response' in e && e.response && typeof e.response === 'object' && 'data' in e.response && e.response.data && typeof e.response.data === 'object' && 'error' in e.response.data ? String(e.response.data.error) : 'Failed to reverse contribution';
      toastError('Reverse failed', message);
    } finally {
      setSaving(false);
    }
  };

  const submitUpload = async () => {
    if (!uploadFile) return;
    setSaving(true);
    try {
      const batch = await contributionApi.bulkUpload(uploadFile);
      setBatchResult(batch);
      setUploadFile(null);
      load();
      toastSuccess('Batch uploaded', 'Bulk contributions have been processed.');
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'response' in e && e.response && typeof e.response === 'object' && 'data' in e.response && e.response.data && typeof e.response.data === 'object' && 'error' in e.response.data ? String(e.response.data.error) : 'Upload failed';
      toastError('Upload failed', message);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Contribution>[] = [
    { key: 'receiptNo', header: 'Receipt No', render: (c) => <span className="font-mono text-xs">{c.receiptNo ?? '—'}</span> },
    { key: 'member', header: 'Member', render: (c) => <span className="font-medium">{c.member?.name ?? c.memberId}</span> },
    { key: 'type', header: 'Type', render: (c) => <Badge tone="neutral">{TYPE_LABELS[c.contributionType] ?? c.contributionType}</Badge> },
    { key: 'meeting', header: 'Meeting', render: (c) => (c.meeting?.meetingNumber ? <Badge tone="success">{c.meeting.meetingNumber}</Badge> : <span className="text-ink-400">—</span>) },
    { key: 'amount', header: 'Amount', render: (c) => <span className="font-semibold">{money(c.amount)}</span> },
    { key: 'date', header: 'Period Date', render: (c) => new Date(c.periodDate).toLocaleDateString() },
    { key: 'status', header: 'Status', render: (c) => <Badge tone={statusTone(c.status)}>{c.status}</Badge> },
    {
      key: 'actions', header: '', render: (c) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" icon={<FiDownload size={13} />} onClick={(e) => { e.stopPropagation(); contributionApi.downloadReceipt(c.id); }}>Receipt</Button>
          {c.status === 'POSTED' && (
            <Button size="sm" variant="ghost" icon={<FiRefreshCw size={13} />} onClick={(e) => { e.stopPropagation(); setShowReverse(c); }} className="text-red-600 hover:bg-red-50">Reverse</Button>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contributions"
        subtitle="Record and manage member contributions"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" icon={<FiUpload />} onClick={() => setShowUpload(true)}>Bulk Upload</Button>
            <Button icon={<FiPlus />} onClick={() => setShowNew(true)}>Record Contribution</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input className="w-72 rounded-lg border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Search member or receipt..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="rounded-lg border border-ink-300 px-3 py-2 text-sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="POSTED">Posted</option>
          <option value="REVERSED">Reversed</option>
        </select>
        <select className="rounded-lg border border-ink-300 px-3 py-2 text-sm" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <DataTable columns={columns} rows={contributions} getRowKey={(c) => c.id} />
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-ink-500">
          <span>{meta.total} contributions</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={!meta.hasPrev} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="secondary" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* New Contribution */}
      <Modal open={showNew} title="Record Contribution" onClose={() => setShowNew(false)} footer={
        <div className="flex justify-end gap-2 px-5 py-3">
          <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button onClick={submit} isLoading={saving} loadingText="Saving...">Post Contribution</Button>
        </div>
      }>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-1">Member ID</label>
            <input className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" placeholder="Member UUID" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">Contribution Type</label>
              <select className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" value={form.contributionType} onChange={(e) => setForm({ ...form, contributionType: e.target.value as ContributionType })}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">Amount (KES)</label>
              <input type="number" className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">Period Date</label>
              <input type="date" className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" value={form.periodDate} onChange={(e) => setForm({ ...form, periodDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">Payment Method</label>
              <select className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}>
                {['CASH', 'BANK', 'MPESA', 'TRANSFER', 'OTHER'].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-1">Payment Reference (optional)</label>
            <input className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" placeholder="M-Pesa code, bank ref..." value={form.paymentReference} onChange={(e) => setForm({ ...form, paymentReference: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Reverse */}
      {showReverse && (
        <Modal open={!!showReverse} title="Reverse Contribution" onClose={() => setShowReverse(null)} footer={
          <div className="flex justify-end gap-2 px-5 py-3">
            <Button variant="secondary" onClick={() => setShowReverse(null)}>Cancel</Button>
            <Button variant="danger" onClick={submitReverse} disabled={!reverseReason.trim()} isLoading={saving} loadingText="Reversing...">Confirm Reversal</Button>
          </div>
        }>
          <div className="p-5 space-y-4">
            <div className="rounded-lg bg-amber-50 p-3 flex items-start gap-2 text-sm text-amber-800">
              <FiAlertCircle className="mt-0.5 shrink-0" />
              <span>Reversing <strong>{showReverse.receiptNo}</strong> ({money(showReverse.amount)}) will create a compensating journal entry. This cannot be undone.</span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">Reason <span className="text-red-500">*</span></label>
              <textarea className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" rows={3} value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Upload */}
      <Modal open={showUpload} title="Bulk Upload Contributions" onClose={() => { setShowUpload(false); setBatchResult(null); setUploadFile(null); }} footer={
        !batchResult ? (
          <div className="flex justify-end gap-2 px-5 py-3">
            <Button variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={submitUpload} disabled={!uploadFile} isLoading={saving} loadingText="Uploading...">Upload</Button>
          </div>
        ) : (
          <div className="flex justify-end px-5 py-3">
            <Button onClick={() => { setShowUpload(false); setBatchResult(null); }}>Close</Button>
          </div>
        )
      }>
        <div className="p-5 space-y-4">
          {!batchResult ? (
            <>
              <p className="text-sm text-ink-600">Upload a CSV file with columns: <code className="text-xs bg-ink-100 px-1 rounded">membershipNumber, contributionType, amount, periodDate, paymentMethod, paymentReference</code></p>
              <div className="border-2 border-dashed border-ink-300 rounded-lg p-6 text-center cursor-pointer hover:border-brand-400 transition" onClick={() => fileRef.current?.click()}>
                <FiUpload className="mx-auto mb-2 text-ink-400" size={24} />
                <p className="text-sm text-ink-600">{uploadFile ? uploadFile.name : 'Click to select CSV file'}</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
            </>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-ink-50 p-4 space-y-2">
                <h3 className="font-semibold text-ink-900">Upload Complete</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center"><div className="text-2xl font-bold text-ink-900">{batchResult.totalRows}</div><div className="text-ink-500">Total</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-green-600">{batchResult.processedRows}</div><div className="text-ink-500">Processed</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-red-600">{batchResult.failedRows}</div><div className="text-ink-500">Failed</div></div>
                </div>
              </div>
              {batchResult.errors?.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-red-700">Errors</h4>
                  {batchResult.errors.slice(0, 10).map((e: any, i: number) => (
                    <div key={i} className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">Row {e.row}: {e.error}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
