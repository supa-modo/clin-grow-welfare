import { useMemo, useState } from 'react';
import { FiShield } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { money } from '@/pages/admin/shared/adminFormatters';
import type { MeetingRecord, MeetingRoster } from '../../types';

type FineRow = {
  id: string;
  memberId: string;
  memberName: string;
  membershipNumber: string;
  fineType: string;
  amount: number;
  status: string;
  carriedForward?: boolean;
};

type Props = {
  meeting: MeetingRecord;
  roster: MeetingRoster | null;
  busy: string;
  onGenerate: () => void;
  onCollectFine: (memberId: string, fine: { id: string; amount: number }) => void;
  onNotify: (fineId: string) => void;
  onDefer: (fineId: string) => void;
};

export function FinesStep({ meeting, roster, busy, onGenerate, onCollectFine, onNotify, onDefer }: Props) {
  const [search, setSearch] = useState('');
  const blocked = !!busy || meeting.status === 'CLOSED';
  const finesLocked = Boolean(meeting.finesGeneratedAt);

  const rows = useMemo<FineRow[]>(() => {
    return (roster?.members ?? []).flatMap((row) =>
      row.expectations.fines.rows.map((fine) => ({
        id: fine.id,
        memberId: row.member.id,
        memberName: row.member.name,
        membershipNumber: row.member.membershipNumber,
        fineType: fine.fineType,
        amount: Number(fine.amount),
        status: fine.status,
        carriedForward: fine.carriedForward,
      })),
    );
  }, [roster]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.memberName, r.membershipNumber, r.fineType].some((v) => v.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const columns: Column<FineRow>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (r) => (
        <div>
          <p className="font-semibold text-ink-900">{r.memberName}</p>
          <p className="text-xs text-ink-500">{r.membershipNumber}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Fine',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{r.fineType.replace(/_/g, ' ')}</span>
          {r.carriedForward ? <Badge tone="warning">Carried forward</Badge> : null}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      sortType: 'number',
      sortValue: (r) => r.amount,
      render: (r) => <span className="font-semibold">{money(r.amount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        if (r.status === 'PAID') return <Badge tone="success">Paid</Badge>;
        if (r.status === 'PENDING') return <Badge tone="warning">Pending</Badge>;
        return <Badge tone="neutral">{r.status}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) =>
        r.status === 'PENDING' ? (
          <div className="flex flex-wrap gap-2">
            <Button size="xs" disabled={blocked} onClick={() => onCollectFine(r.memberId, { id: r.id, amount: r.amount })}>
              Mark paid
            </Button>
            <Button
              size="xs"
              variant="secondary"
              disabled={blocked}
              isLoading={busy === `fine-notify-${r.id}`}
              onClick={() => onNotify(r.id)}
            >
              Notify
            </Button>
            <Button
              size="xs"
              variant="danger"
              disabled={blocked}
              isLoading={busy === `fine-defer-${r.id}`}
              onClick={() => onDefer(r.id)}
            >
              Defer
            </Button>
          </div>
        ) : (
          <span className="text-xs text-ink-500">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-4">
        <div>
          <p className="font-bold text-ink-900">Generate and collect attendance fines</p>
          <p className="text-sm text-ink-600">
            Late: {money(roster?.settings?.lateFine ?? 100)}. Apology: {money(roster?.settings?.absentWithApologyFine ?? 150)}. Absent: {money(roster?.settings?.absentWithoutApologyFine ?? 200)}.
          </p>
          {finesLocked ? (
            <p className="mt-1 text-xs font-semibold text-brand-700">
              Fines generated {new Date(meeting.finesGeneratedAt!).toLocaleString()}
            </p>
          ) : null}
        </div>
        {!finesLocked ? (
          <Button
            variant="secondary2"
            icon={<FiShield />}
            disabled={blocked}
            isLoading={busy === 'fines/generate'}
            loadingText="Generating..."
            onClick={onGenerate}
          >
            Generate fines
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={(r) => r.id}
        search
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search member or fine type"
        emptyTitle="No fines"
        emptyMessage={finesLocked ? 'No attendance fines for this meeting.' : 'Generate fines after attendance is finalized.'}
      />
    </div>
  );
}
