import { Button } from '@/components/ui/Button';
import { money, tone } from '@/pages/admin/shared/adminFormatters';
import { TableShell } from '@/pages/admin/shared/adminUi';
import { Badge } from '@/components/ui/Badge';
import type { MeetingRecord, MeetingRoster } from '../../types';
import { finePreview } from '../../utils';

type Props = {
  meeting: MeetingRecord;
  roster: MeetingRoster | null;
  busy: string;
  attendanceDraft: Record<string, string>;
  setAttendanceDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSaveRow: (memberId: string) => void;
  onSaveAll: () => void;
  onReviewApology: (id: string, decision: 'ACCEPTED' | 'REJECTED') => void;
};

export function AttendanceStep({ meeting, roster, busy, attendanceDraft, setAttendanceDraft, onSaveRow, onSaveAll, onReviewApology }: Props) {
  const blocked = !!busy || meeting.status === 'CLOSED';
  const needsStart = ['SCHEDULED', 'NOTICE_SENT'].includes(meeting.status);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
        <p className="text-sm font-bold text-ink-900">Confirm attendance and apologies</p>
        <p className="mt-1 text-sm text-ink-600">
          {needsStart ? 'Start the meeting before recording attendance.' : 'Submitted apologies appear in the member row. Mark late arrivals and absences before generating fines.'}
        </p>
        {!needsStart ? (
          <div className="mt-3">
            <Button size="sm" variant="secondary2" disabled={blocked} onClick={onSaveAll}>Save all attendance</Button>
          </div>
        ) : null}
      </div>
      <TableShell>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-500">
            <tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Apology</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Fine preview</th><th className="px-4 py-3 text-right">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {(roster?.members ?? []).map((row) => {
              const status = attendanceDraft[row.member.id] ?? row.attendance?.attendanceStatus ?? 'PRESENT_ON_TIME';
              return (
                <tr key={row.member.id}>
                  <td className="px-4 py-3 font-semibold">{row.member.membershipNumber} - {row.member.name}</td>
                  <td className="px-4 py-3 text-ink-600">
                    {row.apology ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={tone(row.apology.status)}>{row.apology.status}</Badge>
                          {row.apology.status === 'SUBMITTED' ? (
                            <>
                              <Button size="xs" variant="secondary" disabled={blocked} onClick={() => onReviewApology(row.apology!.id, 'ACCEPTED')}>Accept</Button>
                              <Button size="xs" variant="danger" disabled={blocked} onClick={() => onReviewApology(row.apology!.id, 'REJECTED')}>Reject</Button>
                            </>
                          ) : null}
                        </div>
                        <p className="max-w-xs text-xs text-ink-500">{row.apology.reason}</p>
                      </div>
                    ) : 'None'}
                  </td>
                  <td className="px-4 py-3">
                    <select className="rounded-lg border border-ink-200 px-3 py-2 text-sm" value={status} disabled={needsStart || blocked} onChange={(e) => setAttendanceDraft((s) => ({ ...s, [row.member.id]: e.target.value }))}>
                      <option value="PRESENT_ON_TIME">Present on time</option>
                      <option value="PRESENT_LATE">Present late</option>
                      <option value="VIRTUAL_PRESENT">Virtual present</option>
                      <option value="ABSENT_WITH_APOLOGY">Absent with apology</option>
                      <option value="ABSENT_WITHOUT_APOLOGY">Absent without apology</option>
                      <option value="EXCUSED">Excused</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 font-semibold">{money(finePreview(status, roster?.settings))}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="secondary" disabled={blocked || needsStart} onClick={() => onSaveRow(row.member.id)}>Save</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
