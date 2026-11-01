import { meetingVirtualUrl } from "@/lib/meetingAgenda";
import { RichTextContent } from "@/components/ui/RichTextContent";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useMeetingRealtime } from "@/hooks/useMeetingRealtime";
import { loanApi } from "@/services/loanApi";
import type { LoanEligibility } from "@/types/loan";
import {
  LuArrowLeft,
  LuArrowUpRight,
  LuBanknote,
  LuCalendarDays,
  LuClock,
  LuDownload,
  LuExternalLink,
  LuFileText,
  LuMapPin,
  LuScale,
  LuSend,
  LuUsers,
  LuVideo,
} from "react-icons/lu";
import { api } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { EmptyState, Spinner } from "@/components/ui/Feedback";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/uiStore";
import { Link, useParams } from "react-router-dom";
import { downloadBlobResponse } from "@/pages/admin/shared/adminFormatters";

const panelClass =
  "min-w-0 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_32px_-24px_rgba(15,23,42,0.35)] sm:p-6";

const fieldClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20";

type DetailResponse = {
  meeting: {
    id: string;
    meetingNumber: string;
    meetingType: string;
    meetingDate: string;
    venue?: string;
    virtualLink?: string | null;
    agenda?: string;
    status: string;
    attendance?: Array<{ attendanceStatus: string }>;
    apologies?: Array<{ id: string; status: string; reason: string; reviewComment?: string }>;
    collectionItems?: Array<{ collectionType: string; amount: number; createdAt: string }>;
    loanWindows?: Array<{
      id: string;
      status: string;
      remainingAmount?: number;
      reservations?: Array<{ amount: number; status: string; loan?: { loanNumber?: string; status: string } }>;
    }>;
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

function humanizeStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getApiError(e: unknown): string {
  if (
    e &&
    typeof e === "object" &&
    "response" in e &&
    e.response &&
    typeof e.response === "object" &&
    "data" in e.response &&
    e.response.data &&
    typeof e.response.data === "object" &&
    "error" in e.response.data
  ) {
    return String(e.response.data.error);
  }
  return "Something went wrong. Please try again.";
}

const startedStatuses = new Set([
  "ATTENDANCE_RECORDING",
  "COLLECTIONS_OPEN",
  "LOAN_WINDOW_OPEN",
  "RESOLUTIONS_OPEN",
  "CLOSING_REVIEW",
  "ONGOING",
  "CLOSED",
  "COMPLETED",
]);

const liveStatuses = new Set([
  "ATTENDANCE_RECORDING",
  "COLLECTIONS_OPEN",
  "LOAN_WINDOW_OPEN",
  "RESOLUTIONS_OPEN",
  "CLOSING_REVIEW",
  "ONGOING",
]);

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={panelClass}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-[#102e26]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.45)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100">
          {icon}
        </span>
      </div>
      <p className="mt-3 wrap-break-word font-google text-lg font-extrabold leading-6 text-[#102e26]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </div>
  );
}

function ActivityRow({
  title,
  meta,
  value,
}: {
  title: string;
  meta?: string;
  value: string;
}) {
  return (
    <li className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {meta ? <p className="mt-0.5 text-xs text-slate-500">{meta}</p> : null}
      </div>
      <p className="shrink-0 text-right font-google text-sm font-bold tabular-nums text-[#102e26]">
        {value}
      </p>
    </li>
  );
}

export function MemberMeetingDetailPage() {
  const { id } = useParams();
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<DetailResponse | null>(null);
  const [eligibility, setEligibility] = useState<LoanEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apologyReason, setApologyReason] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanPurpose, setLoanPurpose] = useState("");
  const [summaryBusy, setSummaryBusy] = useState<"view" | "download" | "">("");

  const load = useCallback(async () => {
    if (!id) return;
    const [res, elig] = await Promise.all([
      api.get<DetailResponse>(`/member-portal/meetings/${id}`),
      loanApi.myEligibility().catch(() => null),
    ]);
    setData(res.data);
    setEligibility(elig);
  }, [id]);

  const refresh = useCallback(() => {
    void load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((error: unknown) => toastError("Could not load meeting", getApiError(error))).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, toastError]);

  useMeetingRealtime(id, {
    onPool: refresh,
    onRoster: refresh,
    onMeeting: refresh,
    onLoan: refresh,
  });

  const submitApology = async () => {
    if (!id) return;
    const reason = apologyReason.trim();
    if (reason.length < 3) {
      toastError("Reason required", "Please enter at least 3 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/member-portal/meetings/${id}/apologies`, { reason });
      setApologyReason("");
      await load();
      toastSuccess("Apology submitted", "Officials will review your apology.");
    } catch (e: unknown) {
      toastError("Submission failed", getApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const applyForLoan = async (windowId: string) => {
    if (!user?.memberId) {
      toastError("Member profile missing", "Your session is not linked to a member profile.");
      return;
    }
    const amount = Number(loanAmount);
    if (!amount || amount <= 0) {
      toastError("Loan amount required", "Enter the amount you want to apply for.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/meetings/loan-window/${windowId}/reservations`, {
        memberId: user.memberId,
        requestedAmount: amount,
        purpose: loanPurpose || "Meeting loan window application",
      });
      setLoanAmount("");
      setLoanPurpose("");
      await load();
      toastSuccess("Loan request submitted", "Officials can now review it during the meeting.");
    } catch (e: unknown) {
      toastError("Loan request failed", getApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const openMeetingSummary = async (mode: "view" | "download") => {
    if (!id || !data?.meeting.report) return;
    const previewWindow = mode === "view" ? window.open("", "_blank") : null;
    if (previewWindow) previewWindow.opener = null;
    setSummaryBusy(mode);
    try {
      const response = await api.get<Blob>(`/member-portal/downloads/meetings/${id}/summary`, {
        responseType: "blob",
      });
      if (mode === "download") {
        await downloadBlobResponse(
          response,
          `meeting-minutes-${data.meeting.meetingNumber.replace(/\s+/g, "-")}.pdf`,
        );
      } else {
        const blob = response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        if (previewWindow) {
          previewWindow.location.href = url;
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
        window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      }
    } catch (error) {
      previewWindow?.close();
      toastError("Summary unavailable", getApiError(error));
    } finally {
      setSummaryBusy("");
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-80 place-items-center">
        <Spinner />
      </div>
    );
  }
  if (!data) return <EmptyState title="Meeting not found" />;

  const { meeting, fines, pool } = data;
  const virtualUrl = meetingVirtualUrl(meeting.virtualLink);
  const attendance = meeting.attendance?.[0]?.attendanceStatus ?? "Not marked";
  const apology = meeting.apologies?.[0];
  const collections = meeting.collectionItems ?? [];
  const openLoanWindow = meeting.loanWindows?.find((w) => w.status === "OPEN");
  const reservation = meeting.loanWindows?.flatMap((w) => w.reservations ?? [])[0];
  const reportSummary =
    meeting.report?.summary && typeof meeting.report.summary === "object"
      ? meeting.report.summary
      : null;
  const isClosed = ["CLOSED", "COMPLETED"].includes(meeting.status);
  const isLive = liveStatuses.has(meeting.status);
  const isCancelled = meeting.status === "CANCELLED";
  const meetingDate = new Date(meeting.meetingDate);
  const finesTotal = fines.reduce((sum, fine) => sum + Number(fine.amount), 0);
  const collectionsTotal = collections.reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );
  const quorumMet =
    reportSummary && "quorumMet" in reportSummary
      ? Boolean((reportSummary as { quorumMet?: boolean }).quorumMet)
      : null;
  const collectionTypeCount =
    reportSummary && "collectionTotals" in reportSummary
      ? Object.keys(
          (reportSummary as { collectionTotals?: object }).collectionTotals ??
            {},
        ).length
      : null;
  const reportedPool =
    reportSummary && "loanablePool" in reportSummary
      ? (reportSummary as { loanablePool?: { totalLoanablePool?: number } })
          .loanablePool?.totalLoanablePool
      : undefined;
  const canSubmitApology =
    !apology && !startedStatuses.has(meeting.status) && !isCancelled;

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 pb-10 pt-2">
      <Link
        to="/member/meetings"
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
      >
        <LuArrowLeft className="h-4 w-4" />
        All meetings
      </Link>

      <section
        aria-label="Meeting overview"
        className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(125deg,#062e26_0%,#075e46_58%,#0a8a63_100%)] p-5 text-white shadow-[0_18px_40px_-18px_rgba(6,78,59,0.6)] sm:p-7"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full border-[40px] border-white/6"
        />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-5">
            <div
              aria-hidden="true"
              className="hidden w-[4.5rem] shrink-0 flex-col items-center border-r border-white/20 pr-5 sm:flex"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                {meetingDate.toLocaleDateString("en-KE", { month: "short" })}
              </span>
              <span className="font-google text-5xl font-extrabold leading-none">
                {meetingDate.getDate()}
              </span>
              <span className="mt-1 text-xs text-emerald-100/80">
                {meetingDate.getFullYear()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-50 ring-1 ring-inset ring-white/20">
                  {humanizeStatus(meeting.meetingType)}
                </span>
                {isLive ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-inset ring-white/25">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                    </span>
                    Happening now
                  </span>
                ) : (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                      isCancelled
                        ? "bg-rose-300/20 text-rose-50 ring-rose-200/40"
                        : isClosed
                          ? "bg-emerald-300/20 text-emerald-50 ring-emerald-200/40"
                          : "bg-white/10 text-emerald-50 ring-white/20"
                    }`}
                  >
                    {humanizeStatus(meeting.status)}
                  </span>
                )}
                {openLoanWindow ? (
                  <span className="rounded-full bg-amber-300/20 px-3 py-1 text-xs font-semibold text-amber-50 ring-1 ring-inset ring-amber-200/40">
                    Loan window open
                  </span>
                ) : null}
              </div>
              <h1 className="mt-3 wrap-break-word font-google text-3xl font-extrabold tracking-tight sm:text-4xl">
                {meeting.meetingNumber}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/85">
                Your session overview, personal activity, and official records.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-emerald-50">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-inset ring-white/15">
                  <LuCalendarDays className="h-3.5 w-3.5" />
                  {meetingDate.toLocaleDateString("en-KE", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-inset ring-white/15">
                  <LuClock className="h-3.5 w-3.5" />
                  {meetingDate.toLocaleTimeString("en-KE", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-inset ring-white/15">
                  <LuMapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {meeting.venue || "Venue to be confirmed"}
                  </span>
                </span>
              </div>
            </div>
          </div>
          {virtualUrl ? (
            <a
              href={virtualUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-[#075e46] shadow-sm transition hover:bg-emerald-50"
            >
              <LuVideo className="h-4 w-4" />
              Join online
              <LuArrowUpRight className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </section>

      <section
        aria-label="Your meeting summary"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <Metric
          label="Attendance"
          value={humanizeStatus(attendance)}
          hint={isLive ? "Updated as officials mark the roll" : undefined}
          icon={<LuUsers className="h-4 w-4" />}
        />
        <Metric
          label="Apology"
          value={apology?.status ? humanizeStatus(apology.status) : "None"}
          hint={apology ? "On record for this session" : "No apology submitted"}
          icon={<LuFileText className="h-4 w-4" />}
        />
        <Metric
          label="Fines"
          value={money(finesTotal)}
          hint={fines.length ? `${fines.length} recorded` : "No fines recorded"}
          icon={<LuScale className="h-4 w-4" />}
        />
        <Metric
          label="Collections"
          value={money(collectionsTotal)}
          hint={
            collections.length
              ? `${collections.length} posted`
              : "Nothing posted yet"
          }
          icon={<LuBanknote className="h-4 w-4" />}
        />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <Panel
            title="Agenda"
            subtitle="What this session is set to cover"
          >
            {meeting.agenda ? (
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                <RichTextContent value={meeting.agenda} />
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                No agenda has been published for this meeting.
              </p>
            )}
            {pool ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#075e46] px-4 py-3.5 text-white">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
                    Loan pool available
                  </p>
                  <p className="mt-1 text-xs text-emerald-50/80">
                    Of {money(pool.totalLoanablePool)} allocated for this session
                  </p>
                </div>
                <p className="font-google text-xl font-extrabold tabular-nums">
                  {money(pool.remainingAmount)}
                </p>
              </div>
            ) : null}
          </Panel>

          <Panel
            title="Your activity"
            subtitle="Collections, fines, and loan reservations for this meeting"
          >
            {collections.length || fines.length || reservation ? (
              <ul className="divide-y divide-slate-100">
                {collections.map((row) => (
                  <ActivityRow
                    key={`${row.collectionType}-${row.createdAt}`}
                    title={humanizeStatus(row.collectionType)}
                    meta={new Date(row.createdAt).toLocaleString("en-KE", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    value={money(row.amount)}
                  />
                ))}
                {fines.map((fine) => (
                  <ActivityRow
                    key={fine.id}
                    title={`${humanizeStatus(fine.fineType)} fine`}
                    meta={humanizeStatus(fine.status)}
                    value={money(fine.amount)}
                  />
                ))}
                {reservation ? (
                  <ActivityRow
                    title={reservation.loan?.loanNumber ?? "Loan reservation"}
                    meta={humanizeStatus(
                      reservation.loan?.status ?? reservation.status,
                    )}
                    value={money(reservation.amount)}
                  />
                ) : null}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                No activity has been recorded for you yet.
              </p>
            )}
          </Panel>

          {reportSummary ? (
            <Panel
              title="Meeting report"
              subtitle="Official closed-session summary"
              action={
                isClosed ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      rounded="xl"
                      icon={<LuExternalLink className="h-3.5 w-3.5" />}
                      isLoading={summaryBusy === "view"}
                      disabled={Boolean(summaryBusy)}
                      onClick={() => void openMeetingSummary("view")}
                    >
                      View PDF
                    </Button>
                    <Button
                      size="sm"
                      rounded="xl"
                      icon={<LuDownload className="h-3.5 w-3.5" />}
                      isLoading={summaryBusy === "download"}
                      disabled={Boolean(summaryBusy)}
                      onClick={() => void openMeetingSummary("download")}
                    >
                      Download
                    </Button>
                  </div>
                ) : undefined
              }
            >
              {quorumMet === null &&
              collectionTypeCount === null &&
              reportedPool === undefined ? (
                <p className="text-sm leading-6 text-slate-600">
                  The official summary is on file. Open the PDF for the full
                  record.
                </p>
              ) : (
              <dl className="grid gap-3 sm:grid-cols-3">
                {quorumMet !== null ? (
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Quorum
                    </dt>
                    <dd className="mt-2 font-google text-lg font-extrabold text-[#102e26]">
                      {quorumMet ? "Met" : "Not met"}
                    </dd>
                  </div>
                ) : null}
                {collectionTypeCount !== null ? (
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Collection types
                    </dt>
                    <dd className="mt-2 font-google text-lg font-extrabold text-[#102e26]">
                      {collectionTypeCount}
                    </dd>
                  </div>
                ) : null}
                {reportedPool !== undefined ? (
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Loan pool
                    </dt>
                    <dd className="mt-2 font-google text-lg font-extrabold tabular-nums text-[#102e26]">
                      {money(reportedPool)}
                    </dd>
                  </div>
                ) : null}
              </dl>
              )}
            </Panel>
          ) : null}

          {meeting.minutesPublishedAt && meeting.resolutions?.length ? (
            <Panel
              title="Published resolutions"
              subtitle="Decisions recorded after the minutes were published"
            >
              <ol className="space-y-3">
                {meeting.resolutions.map((row, index) => (
                  <li
                    key={row.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white font-google text-sm font-extrabold text-emerald-800 ring-1 ring-inset ring-slate-200">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#102e26]">
                          {row.resolutionNumber
                            ? `${row.resolutionNumber} — `
                            : ""}
                          {row.title}
                        </p>
                        <p className="mt-1.5 text-sm font-semibold leading-6 text-emerald-800">
                          {row.decision}
                        </p>
                        {row.description ? (
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {row.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-4" aria-label="Meeting actions">
          {canSubmitApology ? (
            <Panel
              title="Submit an apology"
              subtitle="Tell officials before the session if you will be absent"
            >
              <label
                htmlFor="meeting-apology"
                className="block text-sm font-semibold text-slate-700"
              >
                Reason for absence
                <textarea
                  id="meeting-apology"
                  className={`${fieldClass} min-h-28`}
                  rows={4}
                  value={apologyReason}
                  onChange={(e) => setApologyReason(e.target.value)}
                  placeholder="Share a short reason officials can review…"
                />
              </label>
              <Button
                className="mt-4 min-h-11 w-full"
                rounded="xl"
                variant="secondary"
                icon={submitting ? <Spinner /> : <LuSend className="h-4 w-4" />}
                disabled={submitting}
                isLoading={submitting}
                onClick={() => void submitApology()}
              >
                Submit apology
              </Button>
            </Panel>
          ) : apology ? (
            <Panel
              title="Apology on record"
              subtitle="Submitted for official review"
            >
              <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-inset ring-slate-200">
                {apology.reason}
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Status:{" "}
                <span className="font-semibold text-[#102e26]">
                  {humanizeStatus(apology.status)}
                </span>
              </p>
              {apology.reviewComment ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {apology.reviewComment}
                </p>
              ) : null}
            </Panel>
          ) : null}

          {openLoanWindow ? (
            <Panel
              title="Apply for a loan"
              subtitle={
                eligibility
                  ? `You may apply for up to ${money(eligibility.maxEligible)}`
                  : "The meeting loan window is open"
              }
            >
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Amount (KES)
                  <input
                    className={fieldClass}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Purpose
                  <input
                    className={fieldClass}
                    placeholder="What the loan is for"
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                  />
                </label>
                <Button
                  className="min-h-11 w-full"
                  rounded="xl"
                  icon={<LuSend className="h-4 w-4" />}
                  disabled={submitting}
                  isLoading={submitting}
                  onClick={() => void applyForLoan(openLoanWindow.id)}
                >
                  Submit loan request
                </Button>
              </div>
            </Panel>
          ) : null}

          <Panel
            title="Documents"
            subtitle="Minutes and summaries live in your library"
          >
            <p className="text-sm leading-6 text-slate-600">
              Published minutes and meeting summaries are available whenever
              officials release them.
            </p>
            <Link
              to="/member/downloads"
              className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-100 transition hover:bg-emerald-100"
            >
              <LuDownload className="h-4 w-4" />
              Browse downloads
            </Link>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
