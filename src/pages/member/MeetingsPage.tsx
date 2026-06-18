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
import { MemberWelcomeHeader } from "@/components/member/MemberPortalUi";
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
      <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/80 px-3 py-2.5 text-xs text-ink-500">
        No payments recorded for this meeting yet.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {groups.map(([type, amount]) => (
        <span
          key={type}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary-600/60 bg-primary-50 px-3 py-0.5 lg:py-1 text-[0.7rem] lg:text-xs font-semibold text-brand-900"
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
    <article
      className={clsx(
        "overflow-hidden relative rounded-3xl border bg-white shadow-sm transition hover:shadow-md",
        isLive ? "border-brand-200 ring-1 ring-brand-100" : "border-ink-100",
      )}
    >
       <div className="absolute top-3 right-4 flex flex-wrap gap-2">
            {isLive ? <Badge tone="warning">Live now</Badge> : null}
            <Badge tone={statusTone(meeting.status)}>
              {humanizeStatus(meeting.status)}
            </Badge>
            {openLoanWindow ? (
              <Badge tone="success">Loan window open</Badge>
            ) : null}
          </div>
      <div className="border-b border-ink-100 px-4 pt-4 pb-2 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-google text-[0.9rem] md:text-base font-extrabold tracking-tight text-ink-950 lg:text-lg">
                {meeting.meetingNumber}
              </h2>
              <span className="text-xs font-medium text-ink-500">
                {humanizeType(meeting.meetingType)}
              </span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
              <span className="inline-flex items-center gap-1">
                <TbCalendarDot
                  className="shrink-0 text-primary-700"
                  size={14}
                />
                {formatMeetingDate(meeting.meetingDate)}
              </span>
              {meeting.venue ? (
                <span className="inline-flex items-center gap-1">
                  <PiMapPinAreaDuotone
                    className="shrink-0 text-primary-700"
                    size={14}
                  />
                  {meeting.venue}
                </span>
              ) : null}
            </p>
          </div>
         
        </div>
        {meeting.agenda ? (
          <p className="mt-3 line-clamp-2 text-[0.8rem] md:text-sm leading-relaxed text-ink-600">
            {meeting.agenda}
          </p>
        ) : null}
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">
              Your Attendance:
            </span>
            <span className="text-sm font-bold text-gray-900">
              {humanizeStatus(attendance)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Apology:</span>
            <span className="text-sm font-bold text-gray-900">
              {apology?.status ? humanizeStatus(apology.status) : "None"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">
              Paid this week:
            </span>
            <span className="text-sm font-bold text-gray-900">
              {money(paidTotal)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Fines:</span>
            <span className="text-sm font-bold text-gray-900">
              {money(finesTotal)}
            </span>
          </div>
        </div>

        <div>
          <MeetingPaymentBreakdown items={collections} />
        </div>

        <Link
          className="flex min-h-9 md:min-h-10 lg:min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-[0.75rem] md:text-[0.8rem] lg:text-sm font-bold text-white transition hover:bg-brand-800"
          to={`/member/meetings/${meeting.id}`}
        >
          View meeting details
          <FiArrowRight size={14} />
        </Link>
      </div>
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

  const load = async () => {
    const [meetingsRes, finesRes, elig] = await Promise.all([
      api.get<{ meetings: MeetingRecord[] }>("/member-portal/meetings"),
      api.get<{ fines: FineRecord[] }>("/member-portal/fines"),
      loanApi.myEligibility().catch(() => null),
    ]);
    setMeetings(meetingsRes.data.meetings ?? []);
    setFines(finesRes.data.fines ?? []);
    setEligibility(elig);
  };

  useEffect(() => {
    load()
      .catch(() => toastError("Could not load meetings"))
      .finally(() => setLoading(false));
  }, []);

  const onLiveMeeting = useCallback(() => {
    void load().catch(() => undefined);
  }, []);

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
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-6">
      <MemberWelcomeHeader
        greeting=""
        name="Sessions & weekly payments"
        membershipNumber="Track attendance, contributions, and loan windows"
        statusLabel={
          eligibility
            ? `Loan eligible up to ${money(eligibility.maxEligible)}`
            : "Member meetings"
        }
      />

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by date (e.g. 21 May, May) or meeting reference…"
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
        <div className="space-y-6">
          {liveMeetings.length > 0 ? (
            <div className="space-y-4">
              {liveMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} fines={fines} />
              ))}
            </div>
          ) : null}

          {upcomingMeetings.length > 0 ? (
            <div className="space-y-4">
              {upcomingMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} fines={fines} />
              ))}
            </div>
          ) : null}

          {pastMeetings.length > 0 ? (
            <div className="space-y-4">
              {pastMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} fines={fines} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default MemberMeetingsPage;
