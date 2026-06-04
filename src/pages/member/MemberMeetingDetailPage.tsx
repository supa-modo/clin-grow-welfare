import { useCallback, useEffect, useState } from 'react';
import { useMeetingRealtime } from '@/hooks/useMeetingRealtime';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCreditCard, FiDollarSign, FiFileText, FiUsers } from 'react-icons/fi';
import { api } from '@/services/api';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { StatCell } from '@/components/member/MemberFinancePrimitives';

type DetailResponse = {
  meeting: {
    id: string;
    meetingNumber: string;
    meetingType: string;
    meetingDate: string;
    venue?: string;
    agenda?: string;
    status: string;
    attendance?: Array<{ attendanceStatus: string }>;
    apologies?: Array<{ status: string; reason: string; reviewComment?: string }>;
    collectionItems?: Array<{ collectionType: string; amount: number; createdAt: string }>;
    loanWindows?: Array<{ status: string; reservations?: Array<{ amount: number; status: string; loan?: { loanNumber?: string; status: string } }> }>;
    report?: { summary?: Record<string, unknown> } | null;
    minutesPublishedAt?: string | null;
    resolutions?: Array<{ id: string; resolutionNumber?: string; title: string; decision: string; description?: string }>;
  };
  fines: Array<{ id: string; fineType: string; amount: number; status: string }>;
  pool?: { remainingAmount: number; totalLoanablePool: number } | null;
};

function money(value: unknown) {
  return `KES ${Number(value ?? 0).toLocaleString()}`;
}

export function MemberMeetingDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!id) return;
    const res = await api.get<DetailResponse>(`/member-portal/meetings/${id}`);
    setData(res.data);
  }

  const refresh = useCallback(() => {
    void load().catch(() => undefined);
  }, [id]);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [id]);

  useMeetingRealtime(id, {
    onPool: refresh,
    onRoster: refresh,
    onMeeting: refresh,
    onLoan: refresh,
  });

  if (loading) {
    return (
      <div className="grid min-h-80 place-items-center">
        <Spinner />
      </div>
    );
  }
  if (!data) return <EmptyState title="Meeting not found" />;

  const { meeting, fines, pool } = data;
  const attendance = meeting.attendance?.[0]?.attendanceStatus ?? 'Not marked';
  const apology = meeting.apologies?.[0];
  const collections = meeting.collectionItems ?? [];
  const reservation = meeting.loanWindows?.flatMap((window) => window.reservations ?? [])[0];
  const meetingDateLabel = new Date(meeting.meetingDate).toLocaleString();

  return (
    <div className="space-y-5 pb-6">
      <header className="border-b border-ink-100 pb-4">
        <Link
          to="/member/meetings"
          className="mb-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-4 text-xs font-semibold text-ink-900 transition hover:bg-ink-50 sm:w-auto"
        >
          <FiArrowLeft />
          Back to meetings
        </Link>
        <h1 className="font-google text-xl font-extrabold tracking-tight text-ink-950 sm:text-[1.2rem]">
          {meeting.meetingNumber}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {meetingDateLabel}
          {meeting.venue ? ` · ${meeting.venue}` : ''}
        </p>
      </header>

      <section className="rounded-lg border border-ink-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{meeting.meetingType}</Badge>
          <Badge>{meeting.status}</Badge>
          {pool ? (
            <Badge tone="success">Loan pool {money(pool.remainingAmount)}</Badge>
          ) : null}
        </div>
        {meeting.agenda ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-600">{meeting.agenda}</p>
        ) : null}
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-ink-100 bg-white p-3 shadow-sm">
          <StatCell
            label="My attendance"
            value={attendance}
            icon={<FiUsers size={14} />}
          />
        </div>
        <div className="rounded-lg border border-ink-100 bg-white p-3 shadow-sm">
          <StatCell
            label="Apology"
            value={apology?.status ?? 'None'}
            icon={<FiFileText size={14} />}
          />
        </div>
        <div className="rounded-lg border border-ink-100 bg-white p-3 shadow-sm">
          <StatCell
            label="Fines"
            value={money(fines.reduce((sum, fine) => sum + Number(fine.amount), 0))}
            icon={<FiCreditCard size={14} />}
          />
        </div>
        <div className="rounded-lg border border-ink-100 bg-white p-3 shadow-sm">
          <StatCell
            label="Collections"
            value={money(collections.reduce((sum, row) => sum + Number(row.amount), 0))}
            icon={<FiDollarSign size={14} />}
          />
        </div>
      </div>

      <section className="rounded-lg border border-ink-100 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-sm font-extrabold text-ink-900">My meeting activity</p>
        <div className="mt-3 divide-y divide-ink-100 text-sm">
          {collections.map((row) => (
            <div
              key={`${row.collectionType}-${row.createdAt}`}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <span className="break-words text-ink-700">
                {row.collectionType.replace(/_/g, ' ')}
              </span>
              <span className="shrink-0 font-extrabold text-ink-900">{money(row.amount)}</span>
            </div>
          ))}
          {fines.map((fine) => (
            <div
              key={fine.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <span className="break-words text-ink-700">
                {fine.fineType.replace(/_/g, ' ')} fine
              </span>
              <span className="shrink-0 font-extrabold text-ink-900">
                {money(fine.amount)} · {fine.status}
              </span>
            </div>
          ))}
          {reservation ? (
            <div className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="break-words text-ink-700">
                {reservation.loan?.loanNumber ?? 'Loan reservation'}
              </span>
              <span className="shrink-0 font-extrabold text-ink-900">
                {money(reservation.amount)} · {reservation.loan?.status ?? reservation.status}
              </span>
            </div>
          ) : null}
          {!collections.length && !fines.length && !reservation ? (
            <p className="py-10 text-center text-sm text-ink-500">
              No activity recorded for you yet.
            </p>
          ) : null}
        </div>
      </section>

      {meeting.minutesPublishedAt && meeting.resolutions?.length ? (
        <section className="rounded-lg border border-ink-100 bg-white p-4 shadow-sm">
          <h2 className="font-bold text-ink-900">Published resolutions</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {meeting.resolutions.map((row) => (
              <li key={row.id} className="rounded-lg bg-ink-50 px-3 py-2">
                <p className="font-semibold text-ink-900">{row.resolutionNumber ? `${row.resolutionNumber} — ` : ''}{row.title}</p>
                <p className="text-ink-600">{row.decision}{row.description ? ` · ${row.description}` : ''}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
