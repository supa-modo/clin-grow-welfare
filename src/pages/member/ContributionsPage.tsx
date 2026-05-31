import { useEffect, useState } from 'react';
import { FiDownload, FiAlertCircle } from 'react-icons/fi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Spinner, EmptyState } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { contributionApi } from '@/services/contributionApi';
import type { Contribution } from '@/types/contribution';
import type { MemberArrears } from '@/types/contribution';

function money(n: number | string) { return `KES ${Number(n).toLocaleString()}`; }

const TYPE_LABELS: Record<string, string> = {
  REGISTRATION: 'Registration', SHARE_CAPITAL: 'Share Capital', WEEKLY_SAVINGS: 'Weekly Savings',
  WELFARE_KITTY: 'Welfare Kitty', EMERGENCY_CONTRIBUTION: 'Emergency', FINE_PAYMENT: 'Fine', OTHER: 'Other',
};

export function MemberContributionsPage() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [arrears, setArrears] = useState<MemberArrears | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      contributionApi.myContributions({ page }),
      contributionApi.myArrears(),
    ]).then(([{ data, meta: m }, { arrears: a }]) => {
      setContributions(data);
      setMeta(m);
      setArrears(a);
    }).finally(() => setLoading(false));
  }, [page]);

  const totalArrears = arrears
    ? arrears.shareCapital.arrears + arrears.weeklySavings.arrears + arrears.welfareKitty.arrears
    : 0;

  const columns: Column<Contribution>[] = [
    { key: 'receipt', header: 'Receipt', render: (c) => <span className="font-mono text-xs">{c.receiptNo ?? '—'}</span> },
    { key: 'type', header: 'Type', render: (c) => <Badge tone="neutral">{TYPE_LABELS[c.contributionType] ?? c.contributionType}</Badge> },
    { key: 'fund', header: 'Fund', render: (c) => c.fund?.name ?? '—' },
    { key: 'amount', header: 'Amount', render: (c) => <span className="font-semibold">{money(c.amount)}</span> },
    { key: 'date', header: 'Date', render: (c) => new Date(c.periodDate).toLocaleDateString() },
    { key: 'method', header: 'Method', render: (c) => c.paymentMethod },
    { key: 'status', header: 'Status', render: (c) => <Badge tone={c.status === 'POSTED' ? 'success' : 'danger'}>{c.status}</Badge> },
    {
      key: 'receipt_dl', header: '', render: (c) => (
        <Button size="sm" variant="ghost" icon={<FiDownload size={12} />} onClick={(e) => { e.stopPropagation(); contributionApi.downloadMyReceipt(c.id); }}>Receipt</Button>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="My Contributions" subtitle="View all your contribution history and download receipts" />

      {arrears && totalArrears > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
            <FiAlertCircle />
            <span>You have outstanding arrears of {money(totalArrears)}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {[
              ['Share Capital', arrears.shareCapital],
              ['Weekly Savings', arrears.weeklySavings],
              ['Welfare Kitty', arrears.welfareKitty],
            ].map(([label, data]: any) => data.arrears > 0 && (
              <div key={String(label)} className="bg-white rounded-lg p-2 border border-amber-100">
                <p className="font-semibold text-ink-700">{String(label)}</p>
                <p className="text-red-600 font-bold">{money(data.arrears)} arrears</p>
                <p className="text-ink-500">{money(data.actual)} / {money(data.expected)} expected</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : contributions.length === 0 ? (
        <EmptyState title="No contributions yet" message="Your contribution history will appear here once the treasurer posts them." />
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
    </div>
  );
}
