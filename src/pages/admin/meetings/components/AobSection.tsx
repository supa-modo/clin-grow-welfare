import { Button } from '@/components/ui/Button';
import type { MeetingRecord } from '../types';

export function AobSection({ meeting, busy, value, onChange, onSave }: {
  meeting: MeetingRecord;
  busy: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  const disabled = Boolean(busy) || meeting.status === 'CLOSED';
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-ink-900">Any other business (AOB)</h3>
      <p className="mt-1 text-sm text-ink-600">Record any other business before closing the meeting.</p>
      <textarea
        aria-label="Any other business"
        className="mt-3 min-h-[120px] w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      <div className="mt-3 flex justify-end">
        <Button size="sm" disabled={disabled} isLoading={busy === 'aob'} onClick={onSave}>Save AOB</Button>
      </div>
    </div>
  );
}
