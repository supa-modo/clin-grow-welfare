import { RichTextContent } from '@/components/ui/RichTextContent';
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import type { MeetingRecord, MeetingRoster } from "../types";

type Summary = {
  activeMembers?: number;
  present?: number;
  quorumRequired?: number;
  quorumMet?: boolean;
  loanApplicationsCount?: number;
  resolutions?: number;
  collectionTotals?: Record<string, number>;
};

function countsTowardQuorum(status?: string) {
  return status !== "ABSENT_WITHOUT_APOLOGY" && status !== "EXCUSED";
}

export function MeetingDetailsModal({
  open,
  meeting,
  roster,
  report,
  onClose,
}: {
  open: boolean;
  meeting: MeetingRecord;
  roster: MeetingRoster | null;
  report: Record<string, unknown> | null;
  onClose: () => void;
}) {
  const savedSummary = (report ?? meeting.report?.summary ?? {}) as Summary;
  const activeMembers = savedSummary.activeMembers ?? roster?.members.length ?? 0;
  const present = savedSummary.present ?? roster?.members.filter(
    (row) => row.attendance && countsTowardQuorum(row.attendance.attendanceStatus),
  ).length ?? 0;
  const quorumRequired = savedSummary.quorumRequired ?? Math.ceil((activeMembers * 2) / 3);
  const quorumMet = savedSummary.quorumMet ?? (activeMembers > 0 && present >= quorumRequired);

  return (
    <Modal
      open={open}
      title={`Meeting details — ${meeting.meetingNumber}`}
      subtitle={`${new Date(meeting.meetingDate).toLocaleString("en-KE", { timeZone: 'Africa/Nairobi' })} · ${meeting.venue ?? "Venue pending"}`}
      onClose={onClose}
      size="xl"
    >
      <div className="space-y-5">
        <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-slate-500">Scheduled by</dt><dd className="mt-1 font-medium text-slate-900">{meeting.scheduledBy || 'Not recorded'}</dd></div>
          <div><dt className="text-xs text-slate-500">Location</dt><dd className="mt-1 font-medium text-slate-900">{meeting.venue || 'Venue pending'}</dd></div>
          <div><dt className="text-xs text-slate-500">Date & time (Nairobi)</dt><dd className="mt-1 font-medium text-slate-900">{new Date(meeting.meetingDate).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</dd></div>
          {meeting.virtualLink ? <div><dt className="text-xs text-slate-500">Online meeting</dt><dd className="mt-1 break-all text-slate-700">{meeting.virtualLink}</dd></div> : null}
          {meeting.changeReason ? <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Last schedule change / cancellation</dt><dd className="mt-1 text-slate-700">{meeting.changeReason}</dd></div> : null}
        </dl>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Status</p>
            <div className="mt-2"><Badge>{meeting.status.replace(/_/g, " ")}</Badge></div>
          </div>
          <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Attendance</p>
            <p className="mt-1 text-xl font-extrabold text-ink-900">{present} / {activeMembers}</p>
          </div>
          <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Quorum required</p>
            <p className="mt-1 text-xl font-extrabold text-ink-900">{quorumRequired}</p>
          </div>
          <div className={`rounded-xl border p-4 ${quorumMet ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Quorum</p>
            <p className="mt-1 text-xl font-extrabold text-ink-900">{quorumMet ? "Met" : "Not met"}</p>
          </div>
        </div>

        <section className="rounded-xl border border-ink-200 p-4">
          <h3 className="text-sm font-bold text-ink-900">Agenda</h3>
          <RichTextContent className="mt-2" value={meeting.agenda?.trim() || 'No agenda was recorded.'} />
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-ink-200 p-4">
            <h3 className="text-sm font-bold text-ink-900">Meeting summary</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-700">
              {meeting.minutes?.trim() || "A meeting summary has not been recorded yet."}
            </p>
          </section>
          <section className="rounded-xl border border-ink-200 p-4">
            <h3 className="text-sm font-bold text-ink-900">Discussion notes</h3>
            <dl className="mt-2 space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-ink-700">Matters arising</dt>
                <dd className="mt-1 whitespace-pre-wrap text-ink-600">{meeting.mattersArising?.trim() || "None recorded."}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-700">Any other business</dt>
                <dd className="mt-1 whitespace-pre-wrap text-ink-600">{meeting.anyOtherBusiness?.trim() || "None recorded."}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </Modal>
  );
}
