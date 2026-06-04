import { useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import { FiCheckCircle, FiDownload, FiFileText, FiSend, FiUpload } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { downloadReport, money } from '@/pages/admin/shared/adminFormatters';
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
  resolutions?: number;
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
  canClose,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
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
                  <p className="mt-1 font-bold">{money(Number(summary.loanablePool.totalLoanablePool ?? 0))} loanable · {summary.loanApplications ?? 0} applications</p>
                </div>
              ) : null}
            </div>
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
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="secondary" icon={<FiFileText />} disabled={!!busy} onClick={onSaveMinutes}>Save minutes</Button>
            <Button size="sm" variant="secondary2" icon={<FiSend />} disabled={!!busy || meeting.status !== 'CLOSED'} onClick={onPublish}>Publish minutes</Button>
            {meeting.status === 'CLOSED' ? (
              <>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,application/pdf" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadMinutes(file);
                  e.target.value = '';
                }} />
                <Button size="sm" variant="secondary" icon={<FiUpload />} disabled={!!busy} onClick={() => fileRef.current?.click()}>Upload document</Button>
              </>
            ) : null}
            {meeting.minutesFileName ? <p className="w-full text-right text-xs text-ink-500">On file: {meeting.minutesFileName}</p> : null}
          </div>
        </Card>
      </div>
      <Card className="p-4">
        <p className="font-bold text-ink-900">Reports</p>
        <p className="mt-1 text-sm text-ink-600">Closing generates the meeting report with collections, loan pool, attendance, and resolutions.</p>
        <div className="mt-3 grid gap-2">
          <Button icon={<FiCheckCircle />} disabled={blocked} onClick={onCloseMeeting}>Close meeting</Button>
          <Button variant="secondary" icon={<FiDownload />} onClick={() => void downloadReport('meeting-close', 'pdf', { meetingId: meeting.id })}>Meeting close PDF</Button>
          <Button variant="secondary" icon={<FiDownload />} onClick={() => void downloadReport('meeting-summary', 'pdf', { meetingId: meeting.id })}>Meeting summary PDF</Button>
          <Button variant="secondary" icon={<FiDownload />} onClick={() => void downloadReport('meeting-collections', 'pdf', { meetingId: meeting.id })}>Collections PDF</Button>
        </div>
      </Card>
    </div>
  );
}
