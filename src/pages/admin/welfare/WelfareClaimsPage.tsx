import { useMemo, useState } from 'react';
import { FiCheckCircle, FiRefreshCw, FiSend, FiXCircle } from 'react-icons/fi';
import { TbHeartHandshake, TbHourglass, TbReceiptRefund, TbWallet } from 'react-icons/tb';
import { api } from '@/services/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import type { MultiFilterSection, MultiFilterValue } from '@/components/ui/MultiFilterDropdown';
import { PageHeader } from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { AdminPageLayout, AdminPageMain, AdminPageStatsGrid } from '@/layouts/AdminPageLayout';
import { useUiStore } from '@/store/uiStore';
import { canApproveClaim, canPayClaim, canRejectClaim, getApiError, money, tone } from '@/pages/admin/shared/adminFormatters';
import { StateBlock, useLoad } from '@/pages/admin/shared/adminUi';

type ClaimType = {
  id: string;
  name: string;
  maxAmount?: number;
  approvalLevel?: string;
};

type WelfareClaim = {
  id: string;
  claimNumber: string;
  member?: { name: string; membershipNumber?: string };
  claimType?: { name: string };
  amountRequested: number;
  amountApproved?: number | null;
  status: string;
  createdAt?: string;
};

const claimFilterSections: MultiFilterSection[] = [
  {
    id: 'status',
    title: 'Claim status',
    options: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PAYMENT_PENDING', 'PAID', 'REJECTED'].map((status) => ({
      value: status,
      label: status.replace(/_/g, ' '),
    })),
  },
  {
    id: 'stage',
    title: 'Workflow stage',
    options: [
      { value: 'ACTIONABLE', label: 'Needs action' },
      { value: 'COMPLETED', label: 'Completed' },
    ],
  },
];

export function WelfarePage() {
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const { data, loading, error, reload } = useLoad(async () => {
    const [claims, types] = await Promise.all([
      api.get('/welfare', { params: { page: 1, pageSize: 50 } }),
      api.get('/welfare/types'),
    ]);
    return { claims: (claims.data.data ?? []) as WelfareClaim[], types: (types.data.types ?? []) as ClaimType[] };
  }, []);
  const [busy, setBusy] = useState('');
  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState<MultiFilterValue>({ status: [], stage: [] });

  const act = async (id: string, action: 'approve' | 'pay' | 'reject') => {
    setBusy(`${action}-${id}`);
    try {
      if (action === 'approve') await api.post(`/welfare/${id}/approve`, { amountApproved: Number(data?.claims.find((c) => c.id === id)?.amountRequested ?? 0) });
      if (action === 'pay') await api.post(`/welfare/${id}/pay`);
      if (action === 'reject') await api.post(`/welfare/${id}/reject`, { reason: 'Rejected from review queue' });
      await reload();
      toastSuccess('Claim updated', `The claim was ${action === 'pay' ? 'paid' : `${action}d`}.`);
    } catch (err) {
      toastError('Claim action failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const filteredClaims = useMemo(() => {
    const term = search.trim().toLowerCase();
    const status = String(filterValue.status?.[0] ?? '');
    const stage = String(filterValue.stage?.[0] ?? '');
    return (data?.claims ?? []).filter((claim) => {
      if (status && claim.status !== status) return false;
      if (stage === 'ACTIONABLE' && !canApproveClaim(claim.status) && !canPayClaim(claim.status)) return false;
      if (stage === 'COMPLETED' && !['PAID', 'REJECTED'].includes(claim.status)) return false;
      if (!term) return true;
      return [
        claim.claimNumber,
        claim.member?.name,
        claim.member?.membershipNumber,
        claim.claimType?.name,
        claim.status,
      ].some((value) => String(value ?? '').toLowerCase().includes(term));
    });
  }, [data?.claims, filterValue.stage, filterValue.status, search]);

  const stats = useMemo(() => {
    const claims = data?.claims ?? [];
    const requested = claims.reduce((sum, claim) => sum + Number(claim.amountRequested), 0);
    const approved = claims.reduce((sum, claim) => sum + Number(claim.amountApproved ?? 0), 0);
    const pending = claims.filter((claim) => canApproveClaim(claim.status) || canPayClaim(claim.status)).length;
    const paid = claims.filter((claim) => claim.status === 'PAID').length;
    return { total: claims.length, requested, approved, pending, paid };
  }, [data?.claims]);

  const columns: Column<WelfareClaim>[] = [
    { key: 'claim', header: 'Claim', render: (claim) => <span className="font-mono text-xs font-bold text-primary-700">{claim.claimNumber}</span> },
    {
      key: 'member',
      header: 'Member',
      render: (claim) => (
        <div>
          <p className="font-semibold text-ink-900">{claim.member?.name ?? 'Unknown member'}</p>
          <p className="text-xs text-ink-500">{claim.member?.membershipNumber ?? 'No membership number'}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (claim) => claim.claimType?.name ?? 'Welfare claim' },
    { key: 'requested', header: 'Requested', render: (claim) => <span className="font-semibold">{money(claim.amountRequested)}</span> },
    { key: 'approved', header: 'Approved', render: (claim) => money(claim.amountApproved ?? 0) },
    { key: 'status', header: 'Status', render: (claim) => <Badge tone={tone(claim.status)}>{claim.status.replace(/_/g, ' ')}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      render: (claim) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="secondary" icon={<FiCheckCircle />} disabled={busy !== '' || !canApproveClaim(claim.status)} onClick={() => void act(claim.id, 'approve')}>Approve</Button>
          <Button size="sm" variant="secondary2" icon={<FiSend />} disabled={busy !== '' || !canPayClaim(claim.status)} onClick={() => void act(claim.id, 'pay')}>Pay</Button>
          <Button size="sm" variant="danger" icon={<FiXCircle />} disabled={busy !== '' || !canRejectClaim(claim.status)} onClick={() => void act(claim.id, 'reject')}>Reject</Button>
        </div>
      ),
    },
  ];

  return (
    <AdminPageLayout fillHeight>
      <PageHeader
        title="Welfare Claims"
        subtitle="Committee-controlled welfare support with constitutional benefit limits and welfare-fund-only payment."
        action={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void reload()}>Refresh</Button>}
      />

      <AdminPageStatsGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TbHeartHandshake} iconColor="#1f7a76" label="Claims" value={stats.total} subtitle={`${data?.types.length ?? 0} configured benefit types`} />
        <StatCard icon={TbWallet} iconColor="#16a34a" label="Requested" value={money(stats.requested)} subtitle="Loaded claim value" />
        <StatCard icon={TbHourglass} iconColor="#d97706" label="Needs action" value={stats.pending} subtitle="Approval or payment queue" />
        <StatCard icon={TbReceiptRefund} iconColor="#334155" label="Paid claims" value={stats.paid} subtitle={`Approved: ${money(stats.approved)}`} />
      </AdminPageStatsGrid>

      {data?.types.length ? (
        <div className="mb-3 flex shrink-0 flex-wrap gap-2">
          {data.types.map((type) => (
            <Badge key={type.id} tone="neutral">
              {type.name}: {type.maxAmount ? money(type.maxAmount) : 'Meeting-approved'}
            </Badge>
          ))}
        </div>
      ) : null}

      <StateBlock loading={loading && !data} error={error} />

      <AdminPageMain fillHeight>
        <DataTable
          columns={columns}
          rows={filteredClaims}
          getRowKey={(claim) => claim.id}
          search
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search claim number, member, type, or status"
          filter
          filterValue={filterValue}
          onFilterChange={setFilterValue}
          filterSections={claimFilterSections}
          filterButtonLabel="Claim Filters"
          filterTitle="Claim Filters"
          tableLoading={loading}
          showAutoNumber
          fillContainer
          containerClassName="h-full rounded-[1.3rem] border-gray-500/40 shadow-sm"
          emptyTitle="No welfare claims"
          emptyMessage="Submitted welfare claims will appear here for approval and payment."
        />
      </AdminPageMain>
    </AdminPageLayout>
  );
}
