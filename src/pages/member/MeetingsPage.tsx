import { agendaText } from "@/lib/meetingAgenda";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useMeetingsLiveRefresh } from "@/hooks/useMeetingRealtime";
import { Link } from "react-router-dom";
import { loanApi } from "@/services/loanApi";
import type { LoanEligibility } from "@/types/loan";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
import { SearchBar } from "@/components/ui/SearchBar";
import { SetupState } from "@/components/member/MemberCards";
import { useUiStore } from "@/store/uiStore";
import clsx from "clsx";
import {
  LuArrowRight,
  LuChevronRight,
  LuClock,
  LuHandCoins,
  LuMapPin,
} from "react-icons/lu";

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

type Tone = "neutral" | "success" | "warning" | "danger";

const LIVE_STATUSES = new Set([
  "ATTENDANCE_RECORDING",
  "COLLECTIONS_OPEN",
  "LOAN_WINDOW_OPEN",
  "RESOLUTIONS_OPEN",
  "CLOSING_REVIEW",
  "ONGOING",
]);

const UPCOMING_STATUSES = new Set(["SCHEDULED", "NOTICE_SENT"]);

const ATTENDED_STATUSES = new Set([
  "PRESENT_ON_TIME",
  "PRESENT",
  "PRESENT_LATE",
  "VIRTUAL_PRESENT",
  "LATE",
  "LEFT_EARLY",
]);

const ATTENDANCE_LABELS: Record<string, { label: string; tone: Tone }> = {
  PRESENT_ON_TIME: { label: "Attended", tone: "success" },
  PRESENT: { label: "Attended", tone: "success" },
  VIRTUAL_PRESENT: { label: "Attended online", tone: "success" },
  PRESENT_LATE: { label: "Attended late", tone: "warning" },
  LATE: { label: "Attended late", tone: "warning" },
  LEFT_EARLY: { label: "Left early", tone: "warning" },
  ABSENT_WITH_APOLOGY: { label: "Absent with apology", tone: "neutral" },
  EXCUSED: { label: "Excused", tone: "neutral" },
  ABSENT_WITHOUT_APOLOGY: { label: "Absent", tone: "danger" },
};

const TONE_DOT: Record<Tone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  neutral: "bg-slate-400",
};

const TONE_TEXT: Record<Tone, string> = {
  success: "text-emerald-800",
  warning: "text-amber-800",
  danger: "text-rose-700",
  neutral: "text-slate-600",
};

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

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-KE", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeDay(value: string) {
  const start = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round(
    (start(new Date(value)) - start(new Date())) / 86_400_000,
  );
  return new Intl.RelativeTimeFormat("en-KE", { numeric: "auto" }).format(
    days,
    "day",
  );
}

function statusTone(status?: string): Tone {
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

function attendanceInfo(
  meeting: MeetingRecord,
): { label: string; tone: Tone } | null {
  const status = meeting.attendance?.[0]?.attendanceStatus;
  if (status && ATTENDANCE_LABELS[status]) return ATTENDANCE_LABELS[status];
  const apology = meeting.apologies?.[0]?.status;
  if (apology) {
    return {
      label: `Apology ${apology.toLowerCase()}`,
      tone: apology === "REJECTED" ? "danger" : "neutral",
    };
  }
  return null;
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
    agendaText(meeting.agenda),
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

const byDate = (a: MeetingRecord, b: MeetingRecord) =>
  new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime();

function StatusDot({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold",
        TONE_TEXT[tone],
      )}
    >
      <span
        aria-hidden="true"
        className={clsx("h-1.5 w-1.5 rounded-full", TONE_DOT[tone])}
      />
      {label}
    </span>
  );
}

function FeaturedMeeting({ meeting }: { meeting: MeetingRecord }) {
  const isLive = LIVE_STATUSES.has(meeting.status);
  const openLoanWindow = meeting.loanWindows?.some((w) => w.status === "OPEN");
  const date = new Date(meeting.meetingDate);
  const agenda = meeting.agenda ? agendaText(meeting.agenda) : "";
  return (
    <section
      aria-label={isLive ? "Meeting happening now" : "Next meeting"}
      className="relative isolate overflow-hidden rounded-[1.3rem] lg:rounded-3xl bg-[linear-gradient(120deg,#083c32_0%,#075e46_65%,#087f5b_100%)] p-4 md:p-5 text-white shadow-[0_12px_30px_-12px_rgba(6,78,59,0.5)] lg:p-7"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full border-40 border-white/6"
      />
      <div className="flex flex-col gap-4 lg:gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4 md:gap-6">
          <div
            aria-hidden="true"
            className="hidden w-20 shrink-0 flex-col items-center border-r border-white/20 pr-6 sm:flex"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
              {date.toLocaleDateString("en-KE", { month: "short" })}
            </span>
            <span className="font-google text-5xl font-extrabold leading-none">
              {date.getDate()}
            </span>
            <span className="mt-1 text-xs text-emerald-100/80">
              {date.toLocaleDateString("en-KE", { weekday: "short" })}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {isLive ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-inset ring-white/25">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                  </span>
                  Happening now
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-50 ring-1 ring-inset ring-white/20">
                  Next meeting · {relativeDay(meeting.meetingDate)}
                </span>
              )}
              {openLoanWindow ? (
                <span className="rounded-full bg-amber-300/20 px-3 py-1 text-xs font-semibold text-amber-50 ring-1 ring-inset ring-amber-200/40">
                  Loan window open
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 wrap-break-word font-google text-2xl font-extrabold tracking-tight sm:text-3xl">
              {meeting.meetingNumber}
            </h2>
            <p className="mt-1 text-sm text-emerald-50/85">
              {humanizeType(meeting.meetingType)} ·{" "}
              {humanizeStatus(meeting.status)}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-emerald-50">
              <span className="inline-flex items-center gap-1.5">
                <LuClock className="h-4 w-4 shrink-0 text-emerald-200" />
                {formatMeetingDate(meeting.meetingDate)}
              </span>
              {meeting.venue ? (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <LuMapPin className="h-4 w-4 shrink-0 text-emerald-200" />
                  <span className="wrap-break-word">{meeting.venue}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <Link
          to={`/member/meetings/${meeting.id}`}
          className="group inline-flex min-h-8 py-2 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#075e46] shadow-sm transition hover:bg-emerald-50"
        >
          View Meeting
          <LuArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

function MeetingRow({
  meeting,
  fines,
  past,
}: {
  meeting: MeetingRecord;
  fines: FineRecord[];
  past: boolean;
}) {
  const isLive = LIVE_STATUSES.has(meeting.status);
  const openLoanWindow = meeting.loanWindows?.some((w) => w.status === "OPEN");
  const date = new Date(meeting.meetingDate);
  const collections = meeting.collectionItems ?? [];
  const paidTotal = sumCollections(collections);
  const breakdown = groupCollectionsByType(collections);
  const finesTotal = meetingFinesFor(fines, meeting.id).reduce(
    (sum, fine) => sum + Number(fine.amount),
    0,
  );
  const attendance = attendanceInfo(meeting);
  const agenda = !past && meeting.agenda ? agendaText(meeting.agenda) : "";

  return (
    <li>
      <Link
        to={`/member/meetings/${meeting.id}`}
        aria-label={`View meeting ${meeting.meetingNumber}`}
        className="group grid grid-cols-[3.25rem_minmax(0,1fr)_1rem] items-start gap-x-4 gap-y-2 lg:px-4 py-4 transition-colors hover:bg-emerald-50/40 focus-visible:bg-emerald-50/60 focus-visible:outline-none sm:px-5 md:grid-cols-[3.25rem_minmax(0,1fr)_11rem_9rem_1rem] md:items-center"
      >
        <div
          aria-hidden="true"
          className={clsx(
            "flex h-14 flex-col items-center justify-center rounded-xl ring-1 ring-inset",
            isLive
              ? "bg-[#075e46] text-white ring-[#075e46]"
              : past
                ? "bg-slate-50 text-slate-600 ring-slate-200"
                : "bg-emerald-50 text-emerald-800 ring-emerald-100",
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {date.toLocaleDateString("en-KE", { month: "short" })}
          </span>
          <span className="font-google text-xl font-extrabold leading-6">
            {date.getDate()}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="wrap-break-word font-google text-[0.95rem] font-bold text-slate-900">
              {meeting.meetingNumber}
            </h3>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            ) : null}
            {openLoanWindow ? (
              <Badge size="xs" tone="success">
                Loan window open
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
            <span>{humanizeType(meeting.meetingType)}</span>
            <span className="inline-flex items-center gap-1">
              <LuClock className="h-3.5 w-3.5" />
              {date.toLocaleDateString("en-KE", { weekday: "short" })},{" "}
              {formatTime(meeting.meetingDate)}
            </span>
            {meeting.venue ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <LuMapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{meeting.venue}</span>
              </span>
            ) : null}
          </p>

          {past && breakdown.length ? (
            <p className="mt-1.5 line-clamp-1 text-xs text-slate-500">
              {breakdown
                .map(
                  ([type, amount]) =>
                    `${humanizeStatus(type)} ${money(amount)}`,
                )
                .join(" · ")}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 md:hidden">
            <StatusDot
              tone={statusTone(meeting.status)}
              label={humanizeStatus(meeting.status)}
            />
            {attendance ? (
              <StatusDot tone={attendance.tone} label={attendance.label} />
            ) : null}
            {paidTotal > 0 ? (
              <span className="text-xs font-semibold tabular-nums text-slate-800">
                Paid {money(paidTotal)}
              </span>
            ) : null}
            {finesTotal > 0 ? (
              <span className="text-xs font-semibold tabular-nums text-rose-700">
                Fines {money(finesTotal)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="hidden space-y-1 md:block">
          <StatusDot
            tone={statusTone(meeting.status)}
            label={humanizeStatus(meeting.status)}
          />
          {attendance ? (
            <div>
              <StatusDot tone={attendance.tone} label={attendance.label} />
            </div>
          ) : null}
        </div>

        <div className="hidden text-right md:block">
          <p className="font-google text-sm font-bold tabular-nums text-slate-900">
            {paidTotal > 0 ? money(paidTotal) : "—"}
          </p>
          {finesTotal > 0 ? (
            <p className="text-xs font-semibold tabular-nums text-rose-700">
              {money(finesTotal)} fines
            </p>
          ) : null}
        </div>

        <LuChevronRight className="mt-1 h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700 md:mt-0" />
      </Link>
    </li>
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
      void load()
        .catch(() => toastError("Could not load meetings"))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, toastError]);

  const onLiveMeeting = useCallback(() => {
    void load().catch(() => undefined);
  }, [load]);

  useMeetingsLiveRefresh(onLiveMeeting);

  const featured = useMemo(() => {
    const live = meetings
      .filter((m) => LIVE_STATUSES.has(m.status))
      .sort(byDate);
    if (live.length) return live[0];
    return meetings
      .filter((m) => UPCOMING_STATUSES.has(m.status))
      .sort(byDate)[0];
  }, [meetings]);

  const rows = useMemo(() => {
    const isUpcoming = (m: MeetingRecord) =>
      LIVE_STATUSES.has(m.status) || UPCOMING_STATUSES.has(m.status);
    return meetings
      .filter((m) => meetingMatchesSearch(m, searchQuery))
      .sort((a, b) => {
        const aUpcoming = isUpcoming(a);
        const bUpcoming = isUpcoming(b);
        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        if (aUpcoming) {
          return (
            Number(LIVE_STATUSES.has(b.status)) -
              Number(LIVE_STATUSES.has(a.status)) || byDate(a, b)
          );
        }
        return byDate(b, a);
      });
  }, [meetings, searchQuery]);

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
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-3 pt-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[#102e26] lg:text-3xl">
            Welfare Meetings
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Follow upcoming sessions, your attendance and meeting contributions.
          </p>
        </div>
        {eligibility ? (
          <Link
            to="/member/loans"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-emerald-200 hover:text-emerald-800"
          >
            <LuHandCoins className="h-3.5 w-3.5 text-emerald-700" />
            Loan eligible up to{" "}
            <span className="font-bold text-slate-900">
              {money(eligibility.maxEligible)}
            </span>
          </Link>
        ) : null}
      </header>

      {meetings.length === 0 ? (
        <EmptyState
          title="No meetings scheduled"
          message="Upcoming and recent meetings will appear here once officials schedule them."
        />
      ) : (
        <>
          {featured ? <FeaturedMeeting meeting={featured} /> : null}

          <section
            aria-label="All meetings"
            className="overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white"
          >
            <div className="flex flex-col gap-3 border-b border-slate-200 px-1.5 py-3 md:flex-row md:items-center md:justify-between md:px-3">
              <p className="text-sm font-semibold text-slate-700">
                All meetings
                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-emerald-800">
                  {rows.length}
                </span>
              </p>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by date or meeting reference…"
                aria-label="Search meetings by date or reference"
                wrapperClassName="w-full max-w-none md:max-w-sm"
              />
            </div>

            <div className="hidden grid-cols-[3.25rem_minmax(0,1fr)_11rem_9rem_1rem] gap-x-4 border-b border-slate-100 bg-slate-50/70 lg:px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:grid">
              <span>Date</span>
              <span>Meeting</span>
              <span>Status</span>
              <span className="text-right">Payments</span>
              <span />
            </div>

            {rows.length ? (
              <ul className="divide-y divide-slate-100">
                {rows.map((meeting) => (
                  <MeetingRow
                    key={meeting.id}
                    meeting={meeting}
                    fines={fines}
                    past={
                      !LIVE_STATUSES.has(meeting.status) &&
                      !UPCOMING_STATUSES.has(meeting.status)
                    }
                  />
                ))}
              </ul>
            ) : (
              <div className="px-1.5 lg:px-4 py-12 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {searchQuery.trim()
                    ? "No meetings match your search"
                    : "No meetings yet"}
                </p>
                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
                  {searchQuery.trim()
                    ? `Nothing found for “${searchQuery.trim()}”. Try a month name, day and month (e.g. 21 May), or a meeting reference.`
                    : "Scheduled and completed sessions will appear here."}
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default MemberMeetingsPage;
