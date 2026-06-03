import { useState } from 'react';
import { FiCheckCircle, FiRefreshCw, FiXCircle } from 'react-icons/fi';
import { api } from '@/services/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useUiStore } from '@/store/uiStore';
import { getApiError, tone } from '@/pages/admin/shared/adminFormatters';
import { StateBlock, useLoad } from '@/pages/admin/shared/adminUi';

export function ApprovalsPage() {
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const { data, loading, error, reload } = useLoad(async () => {
    const res = await api.get('/approvals/inbox', { params: { page: 1, pageSize: 50 } });
    return res.data.data ?? [];
  }, []);
  const [busy, setBusy] = useState('');
  const decide = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    setBusy(id);
    try {
      await api.post(`/approvals/${id}/decision`, { decision, comments: `${decision.toLowerCase()} from inbox` });
      await reload();
      toastSuccess('Approval updated', `Decision recorded as ${decision.toLowerCase()}.`);
    } catch (err) {
      toastError('Approval failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Approval Inbox" subtitle="Role-filtered approvals with self-approval and conflict controls enforced by the API." action={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void reload()}>Refresh</Button>} />
      <StateBlock loading={loading} error={error} empty={!loading && !data?.length} />
      {data?.length ? (
        <div className="grid gap-3">
          {data.map((a: { id: string; entityType: string; status: string; entityId: string; requiredApprovers?: string[] }) => (
            <Card key={a.id} className="p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2"><h3 className="font-extrabold text-ink-900">{a.entityType}</h3><Badge tone={tone(a.status)}>{a.status}</Badge></div>
                  <p className="mt-1 text-sm text-ink-500">{a.entityId}</p>
                  <p className="mt-2 text-xs font-semibold text-ink-500">Required: {a.requiredApprovers?.join(', ')}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" icon={<FiCheckCircle />} disabled={busy === a.id || a.status !== 'PENDING'} onClick={() => void decide(a.id, 'APPROVED')}>Approve</Button>
                  <Button variant="danger" icon={<FiXCircle />} disabled={busy === a.id || a.status !== 'PENDING'} onClick={() => void decide(a.id, 'REJECTED')}>Reject</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
