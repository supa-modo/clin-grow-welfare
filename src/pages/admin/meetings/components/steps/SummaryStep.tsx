import { useMemo, useState } from 'react';
import { StatCard } from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { money } from '@/pages/admin/shared/adminFormatters';
import type { LoanPool, MeetingRecord } from '../../types';

type PostedItem = {
  id: string;
  collectionType: string;
  amount: number;
  memberLabel: string;
  createdAt: string;
};

type Props = {
  meeting: MeetingRecord;
  collectionTotals: Record<string, number>;
  pool: LoanPool | null;
  unclaimedCarryover?: number;
};

export function SummaryStep({ meeting, collectionTotals, pool, unclaimedCarryover = 0 }: Props) {
  const [tab, setTab] = useState<'contributions' | 'fines' | 'repayments'>('contributions');
  const [search, setSearch] = useState('');

  const items = useMemo<PostedItem[]>(() => {
    const raw = (meeting.collectionItems
      ?? meeting.collectionSessions?.flatMap((session) => session.items ?? [])
      ?? []) as Array<Record<string, unknown>>;
    return raw
      .filter((item) => item.status === 'POSTED')
      .map((item, index) => {
        const member = item.member as { name?: string; membershipNumber?: string } | undefined;
        const memberId = typeof item.memberId === 'string' ? item.memberId : '';
        return {
          id: String(item.id ?? `${item.collectionType}-${index}`),
          collectionType: String(item.collectionType ?? 'OTHER'),
          amount: Number(item.amount ?? 0),
          memberLabel: member?.name
            ? `${member.membershipNumber ?? ''} ${member.name}`.trim()
            : memberId
              ? `Member ${memberId.slice(0, 8)}`
              : 'Official / pooled',
          createdAt: item.createdAt ? new Date(String(item.createdAt)).toLocaleString() : '—',
        };
      });
  }, [meeting]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const typeFilter = tab === 'contributions'
      ? ['SHARE_CAPITAL', 'WEEKLY_SAVINGS', 'WELFARE_KITTY', 'REGISTRATION', 'EMERGENCY_CONTRIBUTION', 'OTHER']
      : tab === 'fines'
        ? ['FINE_PAYMENT']
        : ['LOAN_REPAYMENT'];
    return items
      .filter((item) => typeFilter.includes(item.collectionType))
      .filter((item) => !q || [item.collectionType, item.memberLabel].some((v) => v.toLowerCase().includes(q)));
  }, [items, search, tab]);

  return (
    <div className="space-y-4">
      {unclaimedCarryover > 0.01 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Unclaimed carryover available</p>
          <p className="mt-1">
            {money(unclaimedCarryover)} from a previous meeting is waiting to be added to the loan pool.
            Open the loan window to claim it.
          </p>
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-4">
        {Object.entries(collectionTotals).map(([key, value]) => (
          <StatCard key={key} label={key.replace(/_/g, ' ')} value={money(value)} />
        ))}
        <StatCard
          label="Loanable for this meeting"
          value={money(pool?.totalLoanablePool ?? 0)}
          detail={[
            pool?.collectionsPosted != null ? `${money(pool.collectionsPosted)} collected` : null,
            pool?.carriedForwardAmount ? `${money(pool.carriedForwardAmount)} carried forward` : null,
            `${money(pool?.reservedAmount ?? 0)} reserved · ${money(pool?.remainingAmount ?? 0)} available`,
            'welfare excluded',
          ].filter(Boolean).join(' · ')}
        />
      </div>
      <SegmentedTabs
        tabs={[
          { value: 'contributions' as const, label: 'Contributions' },
          { value: 'fines' as const, label: 'Fines' },
          { value: 'repayments' as const, label: 'Repayments' },
        ]}
        value={tab}
        onChange={(next) => setTab(next as typeof tab)}
      />
      <DataTable<PostedItem>
        columns={[
          { header: 'Type', render: (row) => row.collectionType.replace(/_/g, ' ') },
          { header: 'Member', render: (row) => row.memberLabel },
          { header: 'Amount', render: (row) => <span className="font-semibold">{money(row.amount)}</span> },
          { header: 'Posted', render: (row) => row.createdAt },
        ]}
        rows={filtered}
        getRowKey={(row) => row.id}
        showAutoNumber
        search
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search type or member"
        emptyTitle="No posted items"
        emptyMessage="Posted collections for this tab will appear here."
      />
    </div>
  );
}
