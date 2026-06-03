import { FiCheckCircle, FiDownload, FiFileText, FiSend } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { downloadReport } from '@/pages/admin/shared/adminFormatters';
import type { MeetingRecord } from '../../types';

type Props = {
  meeting: MeetingRecord;
  busy: string;
  minutesDraft: Record<string, string>;
  setMinutesDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  meetingReport: Record<string, unknown> | null;
  onCloseMeeting: () => void;
  onSaveMinutes: () => void;
  onPublish: () => void;
  canClose: boolean;
};

export function CloseStep({ meeting, busy, minutesDraft, setMinutesDraft, meetingReport, onCloseMeeting, onSaveMinutes, onPublish, canClose }: Props) {
  const blocked = !!busy || meeting.status === 'CLOSED' || !canClose;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <Card className="p-4">
          <p className="font-bold text-ink-900">Close checklist</p>
          <div className="mt-3 grid gap-2 text-sm">
            {['Attendance captured', 'Fines reviewed', 'Collections posted', 'Loan window closed or reviewed', 'Minutes saved before publish'].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2"><FiCheckCircle className="text-brand-700" />{item}</div>
            ))}
          </div>
        </Card>
        {meetingReport ? (
          <Card className="p-4">
            <p className="font-bold text-ink-900">Meeting report summary</p>
            <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-ink-50 p-3 text-xs text-ink-700">{JSON.stringify(meetingReport, null, 2)}</pre>
          </Card>
        ) : null}
        <Card className="p-4">
          <p className="font-bold text-ink-900">Minutes</p>
          <textarea
            className="mt-3 min-h-[150px] w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
            value={minutesDraft[meeting.id] ?? meeting.minutes ?? ''}
            onChange={(e) => setMinutesDraft((s) => ({ ...s, [meeting.id]: e.target.value }))}
            placeholder="Paste approved minutes or secretary notes here"
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="secondary" icon={<FiFileText />} disabled={!!busy} onClick={onSaveMinutes}>Save minutes</Button>
            <Button size="sm" variant="secondary2" icon={<FiSend />} disabled={!!busy || meeting.status !== 'CLOSED'} onClick={onPublish}>Publish minutes</Button>
          </div>
        </Card>
      </div>
      <Card className="p-4">
        <p className="font-bold text-ink-900">Reports</p>
        <p className="mt-1 text-sm text-ink-600">Closing generates the meeting report with collections, loan pool, attendance, and resolutions.</p>
        <div className="mt-3 grid gap-2">
          <Button icon={<FiCheckCircle />} disabled={blocked} onClick={onCloseMeeting}>Close meeting</Button>
          <Button variant="secondary" icon={<FiDownload />} onClick={() => void downloadReport('meeting-close', 'pdf', { meetingId: meeting.id })}>Meeting close PDF</Button>
          <Button variant="secondary" icon={<FiDownload />} onClick={() => void downloadReport('meeting-collections', 'csv')}>Collections CSV</Button>
        </div>
      </Card>
    </div>
  );
}
