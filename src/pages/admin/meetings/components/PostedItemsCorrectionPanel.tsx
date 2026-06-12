import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { money } from '@/pages/admin/shared/adminFormatters';
import type { MeetingRecord } from '../types';

type PostedItem = {
  id: string;
  collectionType: string;
  amount: number;
  status: string;
  memberId?: string | null;
  postedAt?: string | null;
  member?: { name?: string; membershipNumber?: string } | null;
};

type Props = {
  meeting: MeetingRecord;
  busy: string;
  collectionTypes?: string[];
  onReverse: (itemId: string, reason: string) => void;
  onAdjust: (itemId: string, amount: number, reason: string) => void;
};

export function PostedItemsCorrectionPanel({
  meeting,
  busy,
  collectionTypes,
  onReverse,
  onAdjust,
}: Props) {
  const [adjustItem, setAdjustItem] = useState<PostedItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [reverseItem, setReverseItem] = useState<PostedItem | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  const rows = useMemo<PostedItem[]>(() => {
    const items = meeting.collectionItems
      ?? meeting.collectionSessions?.flatMap((session) => (session.items as PostedItem[]) ?? [])
      ?? [];
    return items.filter((item) => {
      if (item.status !== 'POSTED') return false;
      if (collectionTypes?.length && !collectionTypes.includes(item.collectionType)) return false;
      return true;
    });
  }, [meeting.collectionItems, meeting.collectionSessions, collectionTypes]);

  if (!meeting.correctionModeAt || !rows.length) return null;

  const effectiveDate = new Date(meeting.meetingDate).toLocaleDateString('en-KE');

  const columns: Column<PostedItem>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-900">{row.member?.name ?? '—'}</p>
          <p className="text-xs text-ink-500">{row.member?.membershipNumber ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => row.collectionType.replace(/_/g, ' '),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => money(Number(row.amount)),
    },
    {
      key: 'date',
      header: 'Effective date',
      render: () => effectiveDate,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="xs" variant="secondary" disabled={!!busy} onClick={() => { setReverseItem(row); setReverseReason(''); }}>
            Reverse
          </Button>
          <Button size="xs" variant="secondary2" disabled={!!busy} onClick={() => { setAdjustItem(row); setAdjustAmount(String(row.amount)); setAdjustReason(''); }}>
            Adjust
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <p className="font-bold text-ink-900">Posted items — correction mode</p>
      <p className="mt-1 text-sm text-ink-600">
        Reverse or adjust posted records. Corrections use the meeting date ({effectiveDate}), not today.
      </p>
      <div className="mt-3">
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          emptyTitle="No posted items"
          emptyMessage="No posted collection items for this step."
          showAutoNumber
        />
      </div>

      <Modal
        open={Boolean(reverseItem)}
        title="Reverse posted item"
        subtitle="This reverses the linked journal entry and contribution or repayment."
        onClose={() => setReverseItem(null)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReverseItem(null)}>Cancel</Button>
            <Button
              variant="secondary2"
              disabled={!!busy || reverseReason.trim().length < 5}
              onClick={() => {
                if (!reverseItem) return;
                onReverse(reverseItem.id, reverseReason.trim());
                setReverseItem(null);
              }}
            >
              Reverse item
            </Button>
          </div>
        )}
      >
        <label className="text-xs font-semibold text-ink-600">
          Reason (required)
          <textarea
            className="mt-1 min-h-[88px] w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
            value={reverseReason}
            onChange={(e) => setReverseReason(e.target.value)}
            placeholder="e.g. Wrong share capital amount posted during seed import"
          />
        </label>
      </Modal>

      <Modal
        open={Boolean(adjustItem)}
        title="Adjust posted amount"
        subtitle="Reverses the current post and reposts at the new amount with the meeting date."
        onClose={() => setAdjustItem(null)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjustItem(null)}>Cancel</Button>
            <Button
              variant="secondary2"
              disabled={!!busy || adjustReason.trim().length < 5 || Number(adjustAmount) <= 0}
              onClick={() => {
                if (!adjustItem) return;
                onAdjust(adjustItem.id, Number(adjustAmount), adjustReason.trim());
                setAdjustItem(null);
              }}
            >
              Adjust and repost
            </Button>
          </div>
        )}
      >
        <div className="space-y-3">
          <label className="text-xs font-semibold text-ink-600">
            New amount (KES)
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold text-ink-600">
            Reason (required)
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Correct weekly savings from workbook"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
