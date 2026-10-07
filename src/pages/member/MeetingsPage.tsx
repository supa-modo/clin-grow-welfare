import { useEffect, useMemo, useState, useCallback } from "react";
import { useMeetingsLiveRefresh } from "@/hooks/useMeetingRealtime";
import { Link } from "react-router-dom";
import { loanApi } from "@/services/loanApi";
import type { LoanEligibility } from "@/types/loan";
import { FiArrowRight } from "react-icons/fi";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
import { SearchBar } from "@/components/ui/SearchBar";
import { SetupState } from "@/components/member/MemberCards";
import { MemberContentHeader, MemberSummaryMetric, MeetingDateTile } from "@/components/member/MemberContentUi";
import { useUiStore } from "@/store/uiStore";
import clsx from "clsx";
import { TbCalendarDot } from "react-icons/tb";
import { PiMapPinAreaDuotone } from "react-icons/pi";

type CollectionItem = {
  collectionType: string;
  amount: number;
  createdAt: string;
};

type MeetingRecord = {
  id: string;
  meetingNumber: string;
  meetingType?: string;
  status: string;
  meetingDate: string;
  venue?: string | null;
  agenda?: string;
  attendance?: Array<{ attendanceStatus?: string }>;
  loanWindows?: Array<{ id: string; status: string }>;
  apologies?: Array<{ status?: string }>;
  collectionItems?: CollectionItem[];
};

type FineRecord = {
  id: string;
  amount: number;
  meetingId?: string | null;
  attendance?: { meetingId: string } | null;
  apology?: { meetingId: string } | null;
};

const LIVE_STATUSES = new Set([
  "ATTENDANCE_RECORDING",
  "COLLECTIONS_OPEN",
  "LOAN_WINDOW_OPEN",
  "RESOLUTIONS_OPEN",
  "CLOSING_REVIEW",
  "ONGOING",
]);

const UPCOMING_STATUSES = new Set(["SCHEDULED", "NOTICE_SENT"]);

function money(value: unknown) {
  return `KES ${Number(value ?? 0).toLocaleString()}`;
}

function humanizeStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanizeType(value?: string) {
  if (!value) return "Welfare meeting";
  return humanizeStatus(value);
}

function formatMeetingDate(value: string) {
  return new Date(value).toLocaleString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusTone(
  status?: string,
): "neutral" | "success" | "warning" | "danger" {
  if (!status) return "neutral";
  if (
    [
      "OPEN",
      "ACCEPTED",
      "PAID",
      "CLOSED",
      "APPROVED",
      "DISBURSED",
      "COMPLETED",
    ].includes(status)
  ) {
    return "success";
  }
  if (
    ["REJECTED", "FAILED", "ABSENT_WITHOUT_APOLOGY", "CANCELLED"].includes(
      status,
    )
  ) {
    return "danger";
  }
  if (
    [
      "SUBMITTED",
      "PENDING",
      "NOTICE_SENT",
      "SCHEDULED",
      "ATTENDANCE_RECORDING",
      "COLLECTIONS_OPEN",
      "LOAN_WINDOW_OPEN",
    ].includes(status)
  ) {
    return "warning";
  }
  return "neutral";
}

function sumCollections(items: CollectionItem[] = []) {
  return items.reduce((sum, row) => sum + Number(row.amount), 0);
}

function groupCollectionsByType(items: CollectionItem[] = []) {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(
      item.collectionType,
      (totals.get(item.collectionType) ?? 0) + Number(item.amount),
    );
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

function meetingFinesFor(fines: FineRecord[], meetingId: string) {
  return fines.filter((fine) => {
    const fineMeetingId =
      fine.meetingId ?? fine.attendance?.meetingId ?? fine.apology?.meetingId;
    return fineMeetingId === meetingId;
  });
}

function meetingSearchText(meeting: MeetingRecord): string {
  const date = new Date(meeting.meetingDate);
  const parts = [
    meeting.meetingNumber,
    humanizeType(meeting.meetingType),
    meeting.venue,
    meeting.agenda,
    formatMeetingDate(meeting.meetingDate),
    date.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    date.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    date.toLocaleDateString("en-KE", { month: "long" }),
    date.toLocaleDateString("en-KE", { month: "short" }),
    date.toLocaleDateString("en-KE", { weekday: "long" }),
    date.toLocaleDateString("en-KE", { weekday: "short" }),
    String(date.getFullYear()),
    String(date.getDate()),
  ];
  return parts
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLowerCase();
}

function meetingMatchesSearch(meeting: MeetingRecord, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  const haystack = meetingSearchText(meeting);
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

function MeetingPaymentBreakdown({ items }: { items: CollectionItem[] }) {
  const groups = groupCollectionsByType(items);
  if (!groups.length) {
    return (
      <p className="leading-5 text-xs text-ink-500">
        No payments recorded for this meeting yet.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {groups.map(([type, amount]) => (
        <span
          key={type}
          className="inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-900"
        >
          <span className="text-brand-700">{humanizeStatus(type)}</span>
          <span className="font-extrabold">{money(amount)}</span>
        </span>
      ))}
    </div>
  );
}

function MeetingCard({
  meeting,
  fines,
}: {
  meeting: MeetingRecord;
  fines: FineRecord[];
}) {
  const attendance = meeting.attendance?.[0]?.attendanceStatus ?? "Not marked";
  const apology = meeting.apologies?.[0];
  const openLoanWindow = meeting.loanWindows?.some((w) => w.status === "OPEN");
  const isLive = LIVE_STATUSES.has(meeting.status);
  const collections = meeting.collectionItems ?? [];
  const paidTotal = sumCollections(collections);
  const meetingFines = meetingFinesFor(fines, meeting.id);
  const finesTotal = meetingFines.reduce(
    (sum, fine) => sum + Number(fine.amount),
    0,
  );

  return (
    <article className={clsx("flex min-w-0 flex-col rounded-2xl bg-white p-4 sm:p-5", isLive && "ring-1 ring-brand-200")}>
      <div className="mb-4 flex flex-wrap gap-2">
        {isLive ? <Badge tone="success">Live now</Badge> : null}
        <Badge tone={statusTone(meeting.status)}>{humanizeStatus(meeting.status)}</Badge>
        {openLoanWindow && <Badge tone="success">Loan window open</Badge>}
      </div>
      <div className="flex items-start gap-3 sm:gap-4">
        <MeetingDateTile date={meeting.meetingDate} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ink-500">{humanizeType(meeting.meetingType)}</p>
          <h3 className="mt-1 break-words font-google text-base font-bold tracking-tight text-ink-950 sm:text-lg">{meeting.meetingNumber}</h3>
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-ink-500"><TbCalendarDot className="mt-0.5 shrink-0 text-brand-600" size={15} />{formatMeetingDate(meeting.meetingDate)}</p>
          {meeting.venue && <p className="mt-1 flex items-start gap-1.5 break-words text-xs leading-5 text-ink-500"><PiMapPinAreaDuotone className="mt-0.5 shrink-0 text-brand-600" size={15} />{meeting.venue}</p>}
        </div>
      </div>
      {meeting.agenda && <p className="mt-4 line-clamp-2 text-sm leading-6 text-ink-600">{meeting.agenda}</p>}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <MemberSummaryMetric label="Your attendance" value={humanizeStatus(attendance)} />
        <MemberSummaryMetric label="Apology" value={apology?.status ? humanizeStatus(apology.status) : "None"} />
        <MemberSummaryMetric label="Meeting payments" value={money(paidTotal)} />
        <MemberSummaryMetric label="Fines" value={money(finesTotal)} />
      </div>
      <div className="mt-4 mb-5"><MeetingPaymentBreakdown items={collections} /></div>
      <Link className="group mt-auto flex min-h-11 items-center justify-between gap-3 rounded-xl bg-brand-50 px-4 text-sm font-semibold text-brand-800 transition hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-600" to={`/member/meetings/${meeting.id}`} aria-label={`View meeting ${meeting.meetingNumber}`}>
        View meeting <FiArrowRight className="shrink-0 transition group-hover:translate-x-1" size={16} />
      </Link>
    </article>
  );
}

export function MemberMeetingsPage() {
  const toastError = useUiStore((s) => s.toastError);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [eligibility, setEligibility] = useState<LoanEligibility | null>(null);

  const load = useCallback(async () => {
    const [meetingsRes, finesRes, elig] = await Promise.all([
      api.get<{ meetings: MeetingRecord[] }>("/member-portal/meetings"),
      api.get<{ fines: FineRecord[] }>("/member-portal/fines"),
      loanApi.myEligibility().catch(() => null),
    ]);
    setMeetings(meetingsRes.data.meetings ?? []);
    setFines(finesRes.data.fines ?? []);
    setEligibility(elig);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch(() => toastError("Could not load meetings")).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, toastError]);

  const onLiveMeeting = useCallback(() => {
    void load().catch(() => undefined);
  }, [load]);

  useMeetingsLiveRefresh(onLiveMeeting);

  const { liveMeetings, upcomingMeetings, pastMeetings } = useMemo(() => {
    const filtered = meetings.filter((meeting) =>
      meetingMatchesSearch(meeting, searchQuery),
    );
    const live = filtered.filter((m) => LIVE_STATUSES.has(m.status));
    const upcoming = filtered.filter(
      (m) => UPCOMING_STATUSES.has(m.status) && !LIVE_STATUSES.has(m.status),
    );
    const past = filtered.filter(
      (m) => !LIVE_STATUSES.has(m.status) && !UPCOMING_STATUSES.has(m.status),
    );
    return {
      liveMeetings: live,
      upcomingMeetings: upcoming,
      pastMeetings: past,
    };
  }, [meetings, searchQuery]);

  const filteredCount =
    liveMeetings.length + upcomingMeetings.length + pastMeetings.length;

  if (loading) {
    return (
      <SetupState
        loading
        title="Loading meetings"
        message="Fetching notices, attendance, and your weekly payments…"
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-7 pb-8">
      <MemberContentHeader eyebrow="Your member calendar" title="Meetings" description="Stay connected. Follow upcoming sessions, your attendance and meeting contributions."
        action={eligibility ? <span className="rounded-xl bg-brand-50 px-4 py-3 text-xs font-semibold text-brand-800">Loan eligible up to {money(eligibility.maxEligible)}</span> : undefined} />

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by date or meeting reference…"
        inputClassName="min-h-12 border-0 bg-white focus:ring-2"
        aria-label="Search meetings by date or reference"
        wrapperClassName="max-w-none w-full"
      />

      {meetings.length === 0 ? (
        <EmptyState
          title="No meetings scheduled"
          message="Upcoming and recent meetings will appear here once officials schedule them."
        />
      ) : filteredCount === 0 ? (
        <EmptyState
          title="No meetings match your search"
          message={`Nothing found for “${searchQuery.trim()}”. Try a month name, day and month (e.g. 21 May), or a meeting reference.`}
        />
      ) : (
        <div className="space-y-8">
          {[
            { title: "Happening now", description: "Follow the live session and open loan windows.", rows: liveMeetings },
            { title: "Upcoming meetings", description: "Plan ahead for your next session.", rows: upcomingMeetings },
            { title: "Meeting history", description: "Your previous sessions and recorded activity.", rows: pastMeetings },
          ].filter((group) => group.rows.length > 0).map((group) => <section key={group.title} aria-label={group.title}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><h2 className="text-base font-bold text-ink-900">{group.title}</h2><p className="mt-1 text-sm text-ink-500">{group.description}</p></div>
              <span className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-ink-500">{group.rows.length}</span>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {group.rows.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} fines={fines} />)}
            </div>
          </section>)}
        </div>
      )}
    </div>
  );
}

export default MemberMeetingsPage;
