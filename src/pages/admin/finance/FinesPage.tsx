import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiRefreshCw, FiTrash2, FiXCircle } from 'react-icons/fi';
import { api } from '@/services/api';
import { AdminPageLayout, AdminPageMain, AdminPageStatsGrid } from '@/layouts/AdminPageLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { RowActionsMenu } from '@/components/ui/RowActionsMenu';
import { Modal } from '@/components/ui/Modal';
import { NotificationModal } from '@/components/ui/NotificationModal';
import { useUiStore } from '@/store/uiStore';
import { getApiError, money } from '@/pages/admin/shared/adminFormatters';

type FineStatus = 'PENDING' | 'PAID' | 'WAIVED' | 'REVERSED' | 'DEFERRED';
type FineRow = {
  id: string;
  fineType: string;
  amount: number;
  reason?: string | null;
  fineDate: string;
  status: FineStatus;
  paidAt?: string | null;
  sourceFineId?: string | null;
  carriedForwardCopies: number;
  member: { id: string; name: string; membershipNumber: string };
  meeting?: { id: string; meetingNumber: string; meetingDate: string } | null;
};
type SummaryRow = { status: FineStatus; count: number; amount: number };

const statusTone: Record<FineStatus, 'neutral' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning', PAID: 'success', WAIVED: 'neutral', REVERSED: 'danger', DEFERRED: 'warning',
};

export function FinesPage() {
  const toastSuccess = useUiStore((state) => state.toastSuccess);
  const toastError = useUiStore((state) => state.toastError);
  const [rows, setRows] = useState<FineRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FineStatus | ''>('');
  const [selected, setSelected] = useState<FineRow | null>(null);
  const [action, setAction] = useState<'pay' | 'waive' | 'delete' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('MPESA');
  const [paymentReference, setPaymentReference] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/fines', { params: { page, pageSize, search: search || undefined, status: status || undefined } });
      setRows(response.data.data ?? []);
      setSummary(response.data.summary ?? []);
      setTotal(Number(response.data.total ?? 0));
      setTotalPages(Number(response.data.totalPages ?? 1));
    } catch (error) {
      toastError('Could not load fines', getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status, toastError]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const summaryValue = (wanted: FineStatus) => summary.find((row) => row.status === wanted)?.amount ?? 0;
  const closeAction = () => { setAction(null); setSelected(null); setPaymentReference(''); };

  const markPaid = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post(`/fines/${selected.id}/pay`, { paymentMethod, paymentReference: paymentReference.trim() || undefined });
      toastSuccess('Fine marked paid', 'The payment and fines-income journal were posted successfully.');
      closeAction();
      await load();
    } catch (error) {
      toastError('Payment failed', getApiError(error));
    } finally { setBusy(false); }
  };

  const completeReasonAction = async (reason: string) => {
    if (!selected || !action) return;
    setBusy(true);
    try {
      if (action === 'waive') {
        await api.post(`/fines/${selected.id}/waive`, { reason });
        toastSuccess('Fine waived', 'The complete fine lineage is no longer payable.');
      } else if (action === 'delete') {
        const response = await api.delete(`/fines/${selected.id}`, { data: { reason } });
        const result = response.data.data;
        toastSuccess('Fine deleted completely', `${result.deletedCount} fine record(s) removed; ${result.reversedPayments} linked payment(s) reversed.`);
      }
      closeAction();
      await load();
    } catch (error) {
      toastError(action === 'delete' ? 'Delete failed' : 'Waiver failed', getApiError(error));
    } finally { setBusy(false); }
  };

  const columns = useMemo<Column<FineRow>[]>(() => [
    { key: 'member', header: 'Member', render: (row) => <div><p className="font-bold text-ink-900">{row.member.name}</p><p className="text-xs text-ink-500">{row.member.membershipNumber}</p></div> },
    { key: 'fine', header: 'Fine', render: (row) => <div><p className="font-semibold text-ink-800">{row.fineType.replace(/_/g, ' ')}</p><p className="max-w-72 truncate text-xs text-ink-500" title={row.reason ?? ''}>{row.reason || 'No reason recorded'}</p></div> },
    { key: 'meeting', header: 'Meeting / date', render: (row) => <div><p className="font-semibold text-ink-700">{row.meeting?.meetingNumber ?? 'Manual / unlinked'}</p><p className="text-xs text-ink-500">{new Date(row.fineDate).toLocaleDateString('en-KE')}</p></div> },
    { key: 'amount', header: 'Amount', sortable: true, sortValue: (row) => row.amount, render: (row) => <span className="font-extrabold text-ink-900">{money(row.amount)}</span> },
    { key: 'status', header: 'Status', render: (row) => <div className="flex flex-wrap gap-1"><Badge tone={statusTone[row.status]}>{row.status.replace(/_/g, ' ')}</Badge>{row.sourceFineId ? <Badge tone="neutral">Carried forward</Badge> : null}</div> },
    { key: 'actions', header: 'Actions', render: (row) => (
      <RowActionsMenu ariaLabel={`Actions for ${row.member.name}`} items={[
        ...(['PENDING', 'DEFERRED'].includes(row.status) ? [
          { key: 'pay', label: 'Mark as paid', icon: <FiCheckCircle />, onClick: () => { setSelected(row); setAction('pay'); } },
          { key: 'waive', label: 'Waive fine', icon: <FiXCircle />, onClick: () => { setSelected(row); setAction('waive'); } },
        ] : []),
        { key: 'delete', label: 'Delete completely', icon: <FiTrash2 />, variant: 'danger' as const, onClick: () => { setSelected(row); setAction('delete'); } },
      ]} />
    ) },
  ], []);

  return (
    <AdminPageLayout className="pb-8">
      <PageHeader title="Fines" subtitle="Review every fine, settle or waive valid balances, and permanently remove incorrect fine lineages." action={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void load()} disabled={loading}>Refresh</Button>} />
      <AdminPageStatsGrid className="grid-cols-1 md:grid-cols-3">
        <StatCard icon={FiCheckCircle} iconColor="#16a34a" label="Paid fines" value={money(summaryValue('PAID'))} subtitle="Recorded fine income" />
        <StatCard icon={FiRefreshCw} iconColor="#d97706" label="Pending fines" value={money(summaryValue('PENDING'))} subtitle="Currently payable" />
        <StatCard icon={FiRefreshCw} iconColor="#a16207" label="Deferred fines" value={money(summaryValue('DEFERRED'))} subtitle="Awaiting settlement" />
      </AdminPageStatsGrid>
      <AdminPageMain>
        <div className="mb-3 flex justify-end">
          <select value={status} onChange={(event) => { setStatus(event.target.value as FineStatus | ''); setPage(1); }} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700">
            <option value="">All statuses</option>
            {(['PENDING', 'DEFERRED', 'PAID', 'WAIVED', 'REVERSED'] as FineStatus[]).map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} tableLoading={loading} search searchValue={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} searchPlaceholder="Search member, fine type, or reason" currentPage={page} totalPages={totalPages} totalItems={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} showAutoNumber emptyTitle="No fines found" emptyMessage="No fine records match the selected filters." />
      </AdminPageMain>

      <Modal open={action === 'pay'} title="Mark fine as paid" subtitle={selected ? `${selected.member.name} · ${money(selected.amount)}` : undefined} onClose={() => !busy && closeAction()} footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={closeAction}>Cancel</Button><Button isLoading={busy} onClick={() => void markPaid()}>Post payment</Button></div>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-ink-700">Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2"><option value="MPESA">M-Pesa</option><option value="CASH">Cash</option><option value="BANK">Bank</option><option value="TRANSFER">Transfer</option><option value="OTHER">Other</option></select></label>
          <label className="text-sm font-semibold text-ink-700">Payment reference (optional)<input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2" placeholder="Receipt or transaction reference" /></label>
        </div>
      </Modal>
      <NotificationModal isOpen={action === 'waive'} onClose={() => !busy && closeAction()} title="Waive this fine?" message="This waives the original and any carry-forward copy so the member will not be charged again." confirmText="Waive fine" showInput inputType="textarea" inputLabel="Waiver reason" inputRequired onConfirm={(reason) => void completeReasonAction(reason)} />
      <NotificationModal isOpen={action === 'delete'} onClose={() => !busy && closeAction()} type="delete" title="Delete this fine completely?" message="The original and carry-forward copies will be deleted. Any linked fine payment and journal will be reversed to keep the accounts accurate." confirmText="Delete completely" showInput inputType="textarea" inputLabel="Deletion reason" inputRequired onConfirm={(reason) => void completeReasonAction(reason)} />
    </AdminPageLayout>
  );
}
