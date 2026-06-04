import { useEffect, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { AdminPageLayout, AdminPageMain } from '@/layouts/AdminPageLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { voucherApi, type PaymentVoucher } from '@/services/voucherApi';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/auth';
import { money, tone } from '@/pages/admin/shared/adminFormatters';

export function VouchersPage() {
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const [rows, setRows] = useState<PaymentVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [pendingOnly, setPendingOnly] = useState(true);

  const canApprove = permissions.includes('officialsPortal.vouchers.approve');
  const canSign = permissions.includes('officialsPortal.vouchers.sign');

  const load = async () => {
    setLoading(true);
    try {
      setRows(await voucherApi.list(pendingOnly));
    } catch {
      toastError('Could not load vouchers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [pendingOnly]);

  const run = async (id: string, label: string, action: () => Promise<unknown>) => {
    setBusy(`${label}-${id}`);
    try {
      await action();
      await load();
      toastSuccess('Voucher updated', label);
    } catch (error: unknown) {
      const message = typeof error === 'object' && error && 'response' in error
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'Voucher action failed';
      toastError('Voucher action failed', message ?? 'Voucher action failed');
    } finally {
      setBusy('');
    }
  };

  const columns: Column<PaymentVoucher>[] = [
    { key: 'no', header: 'Voucher', render: (v) => <span className="font-semibold">{v.voucherNo}</span> },
    { key: 'entity', header: 'Entity', render: (v) => `${v.entityType} · ${v.entityId.slice(0, 8)}` },
    { key: 'amount', header: 'Amount', render: (v) => money(Number(v.amount)) },
    { key: 'status', header: 'Status', render: (v) => <Badge tone={tone(v.status)}>{v.status}</Badge> },
    {
      key: 'signatories',
      header: 'Signatures',
      render: (v) => (
        <span className="text-xs text-ink-600">
          {v.signatories?.length ? v.signatories.map((s) => s.role).join(', ') : 'None'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (v) => (
        <div className="flex flex-wrap gap-1">
          {canApprove && ['UNDER_REVIEW', 'SUBMITTED', 'DRAFT'].includes(v.status) ? (
            <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => void run(v.id, 'Approved', () => voucherApi.approve(v.id))}>Approve</Button>
          ) : null}
          {canSign && ['SIGNED_PENDING', 'SIGNED'].includes(v.status) ? (
            <Button size="sm" variant="secondary2" disabled={!!busy} onClick={() => void run(v.id, 'Signed', () => voucherApi.sign(v.id))}>Sign</Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AdminPageLayout>
      <PageHeader
        title="Payment vouchers"
        subtitle="Treasurer and Chairperson signatures required before loan disbursement."
        action={(
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPendingOnly((v) => !v)}>{pendingOnly ? 'Show all' : 'Pending only'}</Button>
            <Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void load()} disabled={loading}>Refresh</Button>
          </div>
        )}
      />
      <AdminPageMain>
        <DataTable rows={rows} columns={columns} getRowKey={(v) => v.id} tableLoading={loading} emptyTitle="No vouchers" emptyMessage="Loan disbursement vouchers appear here after chairperson authorization." />
      </AdminPageMain>
    </AdminPageLayout>
  );
}
