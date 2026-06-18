import { useMemo, useState } from 'react';
import { FiPlus, FiShield } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { money } from '@/pages/admin/shared/adminFormatters';
import type { MeetingRecord, MeetingRoster } from '../../types';
import { isCorrectionMode } from '../../utils';

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
  onCreateManualFine?: (input: { memberId: string; amount: number; reason: string; fineType?: string }) => void;
};

export function FinesStep({
  meeting,
  roster,
  busy,
  onGenerate,
  onCollectFine,
  onNotify,
  onDefer,
  onCreateManualFine,
}: Props) {
  const [search, setSearch] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualMemberId, setManualMemberId] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [manualFineType, setManualFineType] = useState('');
  const blocked = !!busy || meeting.status === 'CLOSED';
  const finesLocked = Boolean(meeting.finesGeneratedAt) && !isCorrectionMode(meeting);

  const memberOptions = useMemo(
    () => (roster?.members ?? []).map((row) => ({
      value: row.member.id,
      label: `${row.member.membershipNumber} — ${row.member.name}`,
    })),
    [roster],
  );

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

  const submitManualFine = () => {
    if (!onCreateManualFine || !manualMemberId || Number(manualAmount) <= 0 || manualReason.trim().length < 3) return;
    onCreateManualFine({
      memberId: manualMemberId,
      amount: Number(manualAmount),
      reason: manualReason.trim(),
      fineType: manualFineType.trim() || undefined,
    });
    setShowManualModal(false);
    setManualMemberId('');
    setManualAmount('');
    setManualReason('');
    setManualFineType('');
  };

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
          <p className="font-bold text-ink-900">Generate and collect fines</p>
          <p className="text-sm text-ink-600">
            Attendance fines: late {money(roster?.settings?.lateFine ?? 100)}, apology {money(roster?.settings?.absentWithApologyFine ?? 150)}, absent {money(roster?.settings?.absentWithoutApologyFine ?? 200)}. Add manual fines for in-meeting offences.
          </p>
          {finesLocked ? (
            <p className="mt-1 text-xs font-semibold text-brand-700">
              Attendance fines generated {new Date(meeting.finesGeneratedAt!).toLocaleString()}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {onCreateManualFine ? (
            <Button
              variant="secondary"
              icon={<FiPlus />}
              disabled={blocked}
              onClick={() => setShowManualModal(true)}
            >
              Add manual fine
            </Button>
          ) : null}
          {!finesLocked ? (
            <Button
              variant="secondary2"
              icon={<FiShield />}
              disabled={blocked}
              isLoading={busy === 'fines/generate'}
              loadingText="Generating..."
              onClick={onGenerate}
            >
              Generate attendance fines
            </Button>
          ) : null}
        </div>
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
        emptyMessage={finesLocked ? 'No fines for this meeting yet. Use Add manual fine for in-meeting offences.' : 'Generate attendance fines or add a manual fine.'}
      />

      <Modal
        open={showManualModal}
        title="Add manual fine"
        subtitle="Record a fine introduced during the meeting (not from attendance)."
        onClose={() => setShowManualModal(false)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowManualModal(false)}>Cancel</Button>
            <Button
              variant="secondary2"
              disabled={blocked || !manualMemberId || Number(manualAmount) <= 0 || manualReason.trim().length < 3}
              isLoading={busy === 'manual-fine'}
              onClick={submitManualFine}
            >
              Add fine
            </Button>
          </div>
        )}
      >
        <div className="space-y-3">
          <SearchableDropdown
            label="Member"
            options={memberOptions}
            value={manualMemberId}
            onChange={setManualMemberId}
            placeholder="Search member"
          />
          <label className="text-xs font-semibold text-ink-600">
            Amount (KES)
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold text-ink-600">
            Fine type (optional)
            <input
              className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              value={manualFineType}
              onChange={(e) => setManualFineType(e.target.value)}
              placeholder="e.g. Late arrival to collections"
            />
          </label>
          <label className="text-xs font-semibold text-ink-600">
            Reason (required)
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              placeholder="Describe why this fine was imposed"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
