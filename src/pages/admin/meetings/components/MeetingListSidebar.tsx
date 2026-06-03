import { Badge } from '@/components/ui/Badge';
import { tone } from '@/pages/admin/shared/adminFormatters';
import type { MeetingRecord } from '../types';

type Props = {
  meetings: MeetingRecord[];
  selectedId?: string;
  onSelect: (id: string) => void;
};

export function MeetingListSidebar({ meetings, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-3">
      {meetings.map((meeting) => (
        <button
          key={meeting.id}
          type="button"
          onClick={() => onSelect(meeting.id)}
          className={`w-full rounded-xl border p-4 text-left transition ${selectedId === meeting.id ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-ink-100 bg-white hover:border-brand-200'}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-extrabold text-ink-900">{meeting.meetingNumber}</span>
            <Badge tone={tone(meeting.status)}>{meeting.status}</Badge>
          </div>
          <p className="mt-1 text-xs font-semibold text-ink-500">{new Date(meeting.meetingDate).toLocaleString()}</p>
          <p className="mt-2 line-clamp-2 text-sm text-ink-600">{meeting.agenda}</p>
        </button>
      ))}
    </div>
  );
}
