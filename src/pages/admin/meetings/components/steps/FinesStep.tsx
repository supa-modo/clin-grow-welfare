import { FiShield } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { money } from '@/pages/admin/shared/adminFormatters';
import type { MeetingRecord, MeetingRoster } from '../../types';

type Props = {
  meeting: MeetingRecord;
  roster: MeetingRoster | null;
  busy: string;
  onGenerate: () => void;
  onCollectFine: (memberId: string, fine: { id: string; amount: number }) => void;
  onNotify: (fineId: string) => void;
};

export function FinesStep({ meeting, roster, busy, onGenerate, onCollectFine, onNotify }: Props) {
  const blocked = !!busy || meeting.status === 'CLOSED';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-4">
        <div>
          <p className="font-bold text-ink-900">Generate and collect attendance fines</p>
          <p className="text-sm text-ink-600">
            Late: {money(roster?.settings?.lateFine ?? 100)}. Apology: {money(roster?.settings?.absentWithApologyFine ?? 150)}. Absent: {money(roster?.settings?.absentWithoutApologyFine ?? 200)}.
          </p>
        </div>
        <Button variant="secondary2" icon={<FiShield />} disabled={blocked} onClick={onGenerate}>Generate fines</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {(roster?.members ?? []).filter((row) => row.expectations.fines.rows.length).map((row) => (
          <Card key={row.member.id} className="p-4">
            <p className="font-bold text-ink-900">{row.member.name}</p>
            <div className="mt-3 space-y-2">
              {row.expectations.fines.rows.map((fine) => (
                <div key={fine.id} className="flex items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm">
                  <span>{fine.fineType} - {money(fine.amount)}</span>
                  {fine.status === 'PENDING' ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="xs" onClick={() => onCollectFine(row.member.id, fine)}>Mark paid</Button>
                      <Button size="xs" variant="secondary" disabled={blocked} onClick={() => onNotify(fine.id)}>Notify</Button>
                    </div>
                  ) : <Badge tone="success">Paid</Badge>}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
