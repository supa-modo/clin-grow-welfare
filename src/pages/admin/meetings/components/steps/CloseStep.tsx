import { useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import { FiCheckCircle, FiDownload, FiFileText, FiRefreshCw, FiSend, FiUpload } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { downloadReport, money } from '@/pages/admin/shared/adminFormatters';
import { useAuthStore } from '@/store/auth';
import { isSystemAdmin } from '@/lib/workspaces';
import type { MeetingRecord } from '../../types';

type MeetingReportSummary = {
  meetingNumber?: string;
  meetingType?: string;
  meetingDate?: string;
  activeMembers?: number;
  present?: number;
  quorumRequired?: number;
  quorumMet?: boolean;
  attendance?: { total?: number; late?: number; absentWithApology?: number; absentWithoutApology?: number };
  apologies?: number;
  collectionTotals?: Record<string, number>;
  loanablePool?: { totalLoanablePool?: number; reservedAmount?: number; remainingAmount?: number };
  loanApplications?: number;
  loanApplicationsCount?: number;
  resolutions?: number;
  resolutionDetails?: Array<{
    resolutionNumber?: string;
    title?: string;
    description?: string | null;
    decision?: string;
    votesFor?: number | null;
    votesAgainst?: number | null;
    votesAbstain?: number | null;
  }>;
};

type AdminReopenInput = {
  targetStatus: 'ATTENDANCE_RECORDING' | 'COLLECTIONS_OPEN' | 'LOAN_WINDOW_OPEN' | 'CLOSING_REVIEW';
  unfinalizeAttendance?: boolean;
  unfinalizeCollections?: boolean;
  reason: string;
};

type Props = {
  meeting: MeetingRecord;
  busy: string;
  minutesDraft: Record<string, string>;
  setMinutesDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  meetingReport: Record<string, unknown> | null;
  onCloseMeeting: () => void;
  onSaveMinutes: () => void;
  onPublish: () => void;
  onUploadMinutes: (file: File) => void;
  onSendSummary: () => void;
  onAdminReopen?: (input: AdminReopenInput) => void;
  canClose: boolean;
};

function asSummary(report: Record<string, unknown> | null): MeetingReportSummary | null {
  if (!report || typeof report !== 'object') return null;
  return report as MeetingReportSummary;
}

export function CloseStep({
  meeting,
  busy,
  minutesDraft,
  setMinutesDraft,
  meetingReport,
  onCloseMeeting,
  onSaveMinutes,
  onPublish,
  onUploadMinutes,
  onSendSummary,
  onAdminReopen,
  canClose,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const permissions = user?.permissions ?? [];
  const canAdminOverride =
    isSystemAdmin(user) || permissions.includes('officialsPortal.meetings.adminOverride');
  const fileRef = useRef<HTMLInputElement>(null);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [adminTarget, setAdminTarget] = useState<AdminReopenInput['targetStatus']>('ATTENDANCE_RECORDING');
  const [unfinalizeAttendance, setUnfinalizeAttendance] = useState(true);
  const [unfinalizeCollections, setUnfinalizeCollections] = useState(true);
  const [adminReason, setAdminReason] = useState('');
  const [readiness, setReadiness] = useState<{
    ready: boolean;
    quorumMet?: boolean;
    checks: Array<{ key: string; label: string; ok: boolean }>;
  } | null>(null);

  useEffect(() => {
    void api.get(`/meetings/${meeting.id}/close-readiness`)
      .then((res) => setReadiness(res.data.readiness ?? null))
      .catch(() => setReadiness(null));
  }, [meeting.id, meeting.status]);

  const serverReady = readiness?.ready ?? canClose;
  const blocked = !!busy || meeting.status === 'CLOSED' || !serverReady;
  const summary = asSummary(meetingReport);
  const quorumWarning = readiness && readiness.quorumMet === false;
  const isClosed = meeting.status === 'CLOSED';

  const submitReopen = () => {
    if (!onAdminReopen || adminReason.trim().length < 5) return;
    onAdminReopen({
      targetStatus: adminTarget,
      unfinalizeAttendance,
      unfinalizeCollections,
      reason: adminReason.trim(),
    });
    setShowReopenModal(false);
    setAdminReason('');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <Card className="p-4">
          <p className="font-bold text-ink-900">Close checklist</p>
          {quorumWarning ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
              Quorum was not met for this sitting. You may still close, but record the shortfall in minutes.
            </p>
          ) : null}
          <div className="mt-3 grid gap-2 text-sm">
            {(readiness?.checks ?? []).map((item) => (
              <div key={item.key} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${item.ok ? 'bg-brand-50 text-brand-900' : 'bg-amber-50 text-amber-900'}`}>
                <FiCheckCircle className={item.ok ? 'text-brand-700' : 'text-amber-600'} />
                {item.label}
              </div>
            ))}
          </div>
        </Card>
        {summary ? (
          <Card className="p-4">
            <p className="font-bold text-ink-900">Meeting summary</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-ink-50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase text-ink-500">Quorum</p>
                <p className="mt-1 font-bold text-ink-900">{summary.present ?? 0} / {summary.activeMembers ?? 0} present</p>
                <p className="text-ink-600">Required {summary.quorumRequired ?? 0} · {summary.quorumMet ? 'Met' : 'Not met'}</p>
              </div>
              <div className="rounded-lg bg-ink-50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase text-ink-500">Attendance breakdown</p>
                <p className="mt-1">Late: {summary.attendance?.late ?? 0}</p>
                <p>Absent w/ apology: {summary.attendance?.absentWithApology ?? 0}</p>
                <p>Absent w/o apology: {summary.attendance?.absentWithoutApology ?? 0}</p>
              </div>
              {summary.collectionTotals ? (
                <div className="rounded-lg bg-ink-50 p-3 text-sm sm:col-span-2">
                  <p className="text-xs font-semibold uppercase text-ink-500">Collections posted</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(summary.collectionTotals).map(([key, value]) => (
                      <span key={key} className="rounded-md bg-white px-2 py-1 text-xs font-semibold">{key.replace(/_/g, ' ')}: {money(Number(value))}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              {summary.loanablePool ? (
                <div className="rounded-lg bg-ink-50 p-3 text-sm sm:col-span-2">
                  <p className="text-xs font-semibold uppercase text-ink-500">Loan pool</p>
                  <p className="mt-1 font-bold">{money(Number(summary.loanablePool.totalLoanablePool ?? 0))} loanable · {summary.loanApplicationsCount ?? summary.loanApplications ?? 0} applications</p>
                </div>
              ) : null}
              {summary.resolutionDetails?.length ? (
                <div className="rounded-lg bg-ink-50 p-3 text-sm sm:col-span-2">
                  <p className="text-xs font-semibold uppercase text-ink-500">Resolutions</p>
                  <div className="mt-2 space-y-2">
                    {summary.resolutionDetails.map((resolution, index) => (
                      <div key={`${resolution.resolutionNumber ?? 'resolution'}-${index}`} className="rounded-md bg-white px-3 py-2">
                        <p className="font-semibold text-ink-900">
                          {resolution.resolutionNumber ? `${resolution.resolutionNumber} · ` : ''}
                          {resolution.title ?? 'Untitled resolution'}
                        </p>
                        <p className="text-xs text-ink-600">
                          {(resolution.decision ?? 'RECORDED').replace(/_/g, ' ')}
                          {resolution.description ? ` · ${resolution.description}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
        <Card className="p-4">
          <p className="font-bold text-ink-900">Minutes (optional)</p>
          <p className="mt-1 text-sm text-ink-600">Upload approved minutes as Word or PDF, or add optional secretary notes below. Minutes are not required to close the meeting.</p>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploadMinutes(file);
            e.target.value = '';
          }} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={<FiUpload />} disabled={!!busy} onClick={() => fileRef.current?.click()}>Upload document</Button>
            {meeting.minutesFileName ? <span className="self-center text-xs text-ink-500">On file: {meeting.minutesFileName}</span> : null}
          </div>
          <textarea
            className="mt-3 min-h-[120px] w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
            value={minutesDraft[meeting.id] ?? meeting.minutes ?? ''}
            onChange={(e) => setMinutesDraft((s) => ({ ...s, [meeting.id]: e.target.value }))}
            placeholder="Optional secretary notes (not required for close)"
          />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="secondary" icon={<FiFileText />} disabled={!!busy} onClick={onSaveMinutes}>Save notes</Button>
            <Button size="sm" variant="secondary2" icon={<FiSend />} disabled={!!busy || !isClosed} onClick={onPublish}>Publish minutes</Button>
          </div>
        </Card>
      </div>
      <Card className="p-4">
        <p className="font-bold text-ink-900">Reports</p>
        <p className="mt-1 text-sm text-ink-600">Closing generates the official meeting summary with attendance, collections, repayments, and loan applications.</p>
        <div className="mt-3 grid gap-2">
          {isClosed && canAdminOverride && onAdminReopen ? (
            <Button
              variant="secondary2"
              icon={<FiRefreshCw />}
              disabled={!!busy}
              onClick={() => setShowReopenModal(true)}
            >
              Reopen for corrections
            </Button>
          ) : null}
          {isClosed && !canAdminOverride ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              Reopen requires Chair or Secretary role.
            </p>
          ) : null}
          <Button icon={<FiCheckCircle />} disabled={blocked} onClick={onCloseMeeting}>Close meeting</Button>
          <Button variant="secondary" icon={<FiDownload />} onClick={() => void downloadReport('meeting-summary', 'pdf', { meetingId: meeting.id })}>Meeting summary PDF</Button>
          <Button variant="secondary" icon={<FiDownload />} onClick={() => void downloadReport('meeting-collections', 'pdf', { meetingId: meeting.id })}>Collections PDF</Button>
          {isClosed ? (
            <Button variant="secondary2" icon={<FiSend />} disabled={!!busy} onClick={onSendSummary}>
              {meeting.summaryEmailedAt ? 'Resend to members' : 'Send to members'}
            </Button>
          ) : null}
          {meeting.summaryEmailedAt ? (
            <p className="text-xs text-ink-500">Summary emailed {new Date(meeting.summaryEmailedAt).toLocaleString('en-KE')}</p>
          ) : null}
        </div>
      </Card>

      <Modal
        open={showReopenModal}
        title="Reopen meeting for corrections"
        subtitle="Unlock attendance through loans to fix seeded data, rollovers, or deferred fines. Re-close when done to regenerate the summary."
        onClose={() => setShowReopenModal(false)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowReopenModal(false)}>Cancel</Button>
            <Button
              variant="secondary2"
              disabled={!!busy || adminReason.trim().length < 5}
              onClick={submitReopen}
            >
              Reopen meeting
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            Correct earlier meetings before later ones so rollovers, deferred fines, and pool balances stay consistent.
          </p>
          <label className="text-xs font-semibold text-ink-600">
            Reopen to step
            <select
              className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              value={adminTarget}
              onChange={(e) => setAdminTarget(e.target.value as AdminReopenInput['targetStatus'])}
            >
              <option value="ATTENDANCE_RECORDING">Attendance</option>
              <option value="COLLECTIONS_OPEN">Collections</option>
              <option value="LOAN_WINDOW_OPEN">Loan window</option>
              <option value="CLOSING_REVIEW">Close review</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
            <input type="checkbox" checked={unfinalizeAttendance} onChange={(e) => setUnfinalizeAttendance(e.target.checked)} />
            Unfinalize attendance (allows attendance and fine edits)
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
            <input type="checkbox" checked={unfinalizeCollections} onChange={(e) => setUnfinalizeCollections(e.target.checked)} />
            Unfinalize collections (allows collection and repayment edits)
          </label>
          <label className="text-xs font-semibold text-ink-600">
            Reason (required)
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              value={adminReason}
              onChange={(e) => setAdminReason(e.target.value)}
              placeholder="e.g. Correct workbook import totals for share capital"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
