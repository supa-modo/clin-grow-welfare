import { useState } from 'react';
import { FiCheckCircle, FiRefreshCw, FiSend, FiXCircle } from 'react-icons/fi';
import { api } from '@/services/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useUiStore } from '@/store/uiStore';
import { canApproveClaim, canPayClaim, canRejectClaim, getApiError, money, tone } from '@/pages/admin/shared/adminFormatters';
import { StateBlock, TableShell, useLoad } from '@/pages/admin/shared/adminUi';

export function WelfarePage() {
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const { data, loading, error, reload } = useLoad(async () => {
    const [claims, types] = await Promise.all([
      api.get('/welfare', { params: { page: 1, pageSize: 50 } }),
      api.get('/welfare/types'),
    ]);
    return { claims: claims.data.data ?? [], types: types.data.types ?? [] };
  }, []);
  const [busy, setBusy] = useState('');

  const act = async (id: string, action: 'approve' | 'pay' | 'reject') => {
    setBusy(`${action}-${id}`);
    try {
      if (action === 'approve') await api.post(`/welfare/${id}/approve`, { amountApproved: Number(data?.claims.find((c: { id: string }) => c.id === id)?.amountRequested ?? 0) });
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Welfare Claims"
        subtitle="Committee-controlled welfare support with constitutional benefit limits and welfare-fund-only payment."
        action={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void reload()}>Refresh</Button>}
      />
      <div className="grid gap-3 md:grid-cols-4">
        {(data?.types ?? []).map((type: { id: string; name: string; maxAmount?: number; approvalLevel?: string }) => (
          <StatCard key={type.id} label={type.name} value={type.maxAmount ? money(type.maxAmount) : 'Meeting-approved'} detail={type.approvalLevel} />
        ))}
      </div>
      <StateBlock loading={loading} error={error} empty={!loading && !data?.claims.length} />
      {data?.claims.length ? (
        <TableShell>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase text-ink-500">
              <tr><th className="px-4 py-3">Claim</th><th className="px-4 py-3">Member</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.claims.map((claim: { id: string; claimNumber: string; member?: { name: string }; claimType?: { name: string }; amountRequested: number; status: string }) => (
                <tr key={claim.id} className="hover:bg-ink-50/50">
                  <td className="px-4 py-3 font-bold text-ink-900">{claim.claimNumber}</td>
                  <td className="px-4 py-3">{claim.member?.name}</td>
                  <td className="px-4 py-3">{claim.claimType?.name}</td>
                  <td className="px-4 py-3 font-semibold">{money(claim.amountRequested)}</td>
                  <td className="px-4 py-3"><Badge tone={tone(claim.status)}>{claim.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" icon={<FiCheckCircle />} disabled={busy !== '' || !canApproveClaim(claim.status)} onClick={() => void act(claim.id, 'approve')}>Approve</Button>
                      <Button size="sm" variant="secondary2" icon={<FiSend />} disabled={busy !== '' || !canPayClaim(claim.status)} onClick={() => void act(claim.id, 'pay')}>Pay</Button>
                      <Button size="sm" variant="danger" icon={<FiXCircle />} disabled={busy !== '' || !canRejectClaim(claim.status)} onClick={() => void act(claim.id, 'reject')}>Reject</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      ) : null}
    </div>
  );
}
