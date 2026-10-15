import { useMemo, useState } from 'react';
import { FiCheck, FiClock, FiMail, FiPlus, FiXCircle } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { RowActionsMenu } from '@/components/ui/RowActionsMenu';
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
  deferredThisMeeting?: boolean;
};

type Props = {
  meeting: MeetingRecord;
  roster: MeetingRoster | null;
  busy: string;
  onCollectFine: (memberId: string, fine: { id: string; amount: number }) => void;
  onNotify: (fineId: string) => void;
  onDefer: (fineId: string) => void;
  onWaive: (fineId: string, reason: string) => Promise<void>;
  onCreateManualFine?: (input: { memberId: string; amount: number; reason: string; fineType?: string }) => void;
  mattersArisingDraft: string;
  onMattersArisingChange: (value: string) => void;
  onSaveMattersArising: () => void;
};

function isPayableFine(row: FineRow) {
  return !row.deferredThisMeeting && (row.status === 'PENDING' || (row.carriedForward && row.status === 'DEFERRED'));
}

export function FinesStep({
  meeting,
  roster,
  busy,
  onCollectFine,
  onNotify,
  onDefer,
  onWaive,
  onCreateManualFine,
  mattersArisingDraft,
  onMattersArisingChange,
  onSaveMattersArising,
}: Props) {
  const [search, setSearch] = useState('');
  const [waiverFine, setWaiverFine] = useState<FineRow | null>(null);
  const [waiverReason, setWaiverReason] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualMemberId, setManualMemberId] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [manualFineType, setManualFineType] = useState('');
  const blocked = !!busy || ['CLOSED', 'COMPLETED', 'CANCELLED'].includes(meeting.status);
  const finesLocked = Boolean(meeting.finesGeneratedAt);

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
        deferredThisMeeting: fine.deferredThisMeeting,
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
        if (r.deferredThisMeeting) return <Badge tone="neutral">Deferred to next meeting</Badge>;
        if (r.status === 'PAID') return <Badge tone="success">Paid</Badge>;
        if (r.status === 'PENDING') return <Badge tone="warning">Pending</Badge>;
        if (r.carriedForward && r.status === 'DEFERRED') return <Badge tone="warning">Deferred (due)</Badge>;
        return <Badge tone="neutral">{r.status}</Badge>;
      },
    },
    {
      key: 'actions',
      header: '',
      render: (r) => {
        if (!['PENDING', 'DEFERRED'].includes(r.status)) return <span className="text-xs text-ink-500">—</span>;
        return (
          <RowActionsMenu
            ariaLabel={`Fine actions for ${r.memberName}`}
            items={[
              {
                key: 'pay',
                label: 'Mark paid',
                icon: <FiCheck size={14} />,
                disabled: blocked || !isPayableFine(r),
                onClick: () => onCollectFine(r.memberId, { id: r.id, amount: r.amount }),
              },
              {
                key: 'notify',
                label: 'Email all pending fines',
                icon: <FiMail size={14} />,
                disabled: blocked,
                onClick: () => onNotify(r.id),
              },
              {
                key: 'defer',
                label: 'Defer to next meeting',
                icon: <FiClock size={14} />,
                disabled: blocked || r.deferredThisMeeting,
                onClick: () => onDefer(r.id),
              },
              {
                key: 'waive',
                label: 'Waive fine',
                icon: <FiXCircle size={14} />,
                disabled: blocked,
                onClick: () => { setWaiverFine(r); setWaiverReason(''); },
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-4">
        <div>
          <p className="font-bold text-ink-900">Review and collect fines</p>
          <p className="text-sm text-ink-600">
            Attendance fines: late {money(roster?.settings?.lateFine ?? 100)}, apology {money(roster?.settings?.absentWithApologyFine ?? 150)}, absent {money(roster?.settings?.absentWithoutApologyFine ?? 200)}. Deferred fines remain deferred as a single record until paid and can be collected here.
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

        </div>
      </div>

      {[
        { title: 'Deferred / carried-forward fines', carried: true, empty: 'No carried-forward fines.' },
        { title: "Today's fines", carried: false, empty: 'No fines for this meeting.' },
      ].map((section) => (
        <section key={section.title} className="space-y-2">
          <h3 className="text-sm font-semibold text-ink-900">{section.title}</h3>
          <DataTable
            columns={columns}
            rows={filtered.filter((row) => Boolean(row.carriedForward) === section.carried)}
            getRowKey={(row) => row.id}
            search={section.carried}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search all fines by member or type"
            emptyTitle={search ? 'No matching fines' : section.empty}
            emptyMessage={search ? 'Try a different search.' : undefined}
          />
        </section>
      ))}

      <Modal open={!!waiverFine} title="Waive fine" subtitle={waiverFine ? `${waiverFine.memberName} · ${money(waiverFine.amount)}` : ''}
        onClose={() => { if (!busy) setWaiverFine(null); }}
        footer={<div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={!!busy} onClick={() => setWaiverFine(null)}>Cancel</Button>
          <Button disabled={blocked || waiverReason.trim().length < 3} isLoading={busy === `fine-waive-${waiverFine?.id}`} onClick={async () => {
            if (!waiverFine) return;
            try { await onWaive(waiverFine.id, waiverReason.trim()); setWaiverFine(null); } catch { /* Keep the reason available for retry. */ }
          }}>Confirm waiver</Button>
        </div>}
      >
        <label className="text-sm font-medium text-ink-700">Reason for agreed waiver
          <textarea className="mt-2 min-h-[96px] w-full rounded-lg border border-ink-200 px-3 py-2" value={waiverReason} maxLength={1000} disabled={!!busy} onChange={(event) => setWaiverReason(event.target.value)} />
        </label>
        <p className="mt-2 text-xs text-ink-500">The fine and waiver decision remain in the audit history.</p>
      </Modal>

      <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-ink-900">Matters arising</h3>
        <p className="mt-1 text-sm text-ink-600">
          Record any matters arising before proceeding to collections.
        </p>
        <textarea
          className="mt-3 min-h-[120px] w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          value={mattersArisingDraft}
          onChange={(e) => onMattersArisingChange(e.target.value)}
          placeholder="Type matters arising from this sitting..."
          disabled={blocked}
        />
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            variant="secondary2"
            disabled={blocked || !!busy}
            isLoading={busy === 'matters-arising'}
            onClick={onSaveMattersArising}
          >
            Save matters arising
          </Button>
        </div>
      </div>

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
