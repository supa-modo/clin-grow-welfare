import { useEffect, useMemo, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { TbChecklist, TbFileInvoice, TbSignature, TbWallet } from 'react-icons/tb';
import { AdminPageLayout, AdminPageMain } from '@/layouts/AdminPageLayout';
import { AdminPageStatsGrid } from '@/layouts/AdminPageLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import DataTable, { type Column } from '@/components/ui/DataTable';
import type { MultiFilterSection, MultiFilterValue } from '@/components/ui/MultiFilterDropdown';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
import { voucherApi, type PaymentVoucher } from '@/services/voucherApi';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/auth';
import { money, tone } from '@/pages/admin/shared/adminFormatters';

const voucherFilterSections: MultiFilterSection[] = [
  {
    id: 'scope',
    title: 'Queue',
    options: [
      { value: 'pending', label: 'Pending only' },
      { value: 'all', label: 'All vouchers' },
    ],
  },
  {
    id: 'status',
    title: 'Voucher status',
    options: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'SIGNED_PENDING', 'SIGNED', 'PAID', 'CANCELLED'].map((status) => ({
      value: status,
      label: status.replace(/_/g, ' '),
    })),
  },
];

export function VouchersPage() {
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const [rows, setRows] = useState<PaymentVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [pendingOnly, setPendingOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState<MultiFilterValue>({ scope: ['pending'], status: [] });

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

  useEffect(() => {
    const scope = filterValue.scope?.[0] ?? 'pending';
    setPendingOnly(scope !== 'all');
  }, [filterValue.scope]);

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

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const status = String(filterValue.status?.[0] ?? '');
    return rows.filter((voucher) => {
      if (status && voucher.status !== status) return false;
      if (!term) return true;
      return [
        voucher.voucherNo,
        voucher.entityType,
        voucher.entityId,
        voucher.description,
        voucher.status,
      ].some((value) => String(value ?? '').toLowerCase().includes(term));
    });
  }, [filterValue.status, rows, search]);

  const stats = useMemo(() => {
    const pending = rows.filter((voucher) => !['PAID', 'CANCELLED'].includes(voucher.status));
    const signed = rows.filter((voucher) => voucher.signatories?.length);
    const totalAmount = rows.reduce((sum, voucher) => sum + Number(voucher.amount), 0);
    return {
      total: rows.length,
      pending: pending.length,
      signed: signed.length,
      totalAmount,
    };
  }, [rows]);

  return (
    <AdminPageLayout fillHeight>
      <PageHeader
        title="Payment vouchers"
        subtitle="Treasurer and Chairperson signatures required before loan disbursement."
        action={(
          <div className="flex gap-2">
            <Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void load()} disabled={loading}>Refresh</Button>
          </div>
        )}
      />

      <AdminPageStatsGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TbFileInvoice} iconColor="#1f7a76" label="Vouchers" value={stats.total} subtitle={pendingOnly ? 'Pending queue' : 'All records'} />
        <StatCard icon={TbChecklist} iconColor="#d97706" label="Pending control" value={stats.pending} subtitle="Awaiting approval/signing/payment" />
        <StatCard icon={TbSignature} iconColor="#16a34a" label="Signed" value={stats.signed} subtitle="Has at least one signature" />
        <StatCard icon={TbWallet} iconColor="#334155" label="Voucher value" value={money(stats.totalAmount)} subtitle="Loaded voucher total" />
      </AdminPageStatsGrid>

      <AdminPageMain fillHeight>
        <DataTable
          rows={filteredRows}
          columns={columns}
          getRowKey={(v) => v.id}
          tableLoading={loading}
          search
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search voucher, entity, status, or description"
          filter
          filterValue={filterValue}
          onFilterChange={setFilterValue}
          filterSections={voucherFilterSections}
          filterButtonLabel="Voucher Filters"
          filterTitle="Voucher Filters"
          showAutoNumber
          fillContainer
          containerClassName="h-full rounded-[1.3rem] border-gray-500/40 shadow-sm"
          emptyTitle="No vouchers"
          emptyMessage="Loan disbursement vouchers appear here after chairperson authorization."
        />
      </AdminPageMain>
    </AdminPageLayout>
  );
}
