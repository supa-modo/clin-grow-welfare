import { useCallback, useEffect, useState } from "react";
import { useMeetingRealtime } from "@/hooks/useMeetingRealtime";
import { loanApi } from "@/services/loanApi";
import type { LoanEligibility } from "@/types/loan";
import { FiCalendar, FiMapPin, FiCreditCard, FiDollarSign, FiDownload, FiExternalLink, FiFileText, FiSend, FiUsers } from "react-icons/fi";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, Spinner } from "@/components/ui/Feedback";
import { MemberContentSection, MemberContentHeader, MemberSummaryMetric, MeetingDateTile } from "@/components/member/MemberContentUi";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/uiStore";
import { Link, useParams } from "react-router-dom";
import { downloadBlobResponse } from "@/pages/admin/shared/adminFormatters";

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
  const attendance = meeting.attendance?.[0]?.attendanceStatus ?? "Not marked";
  const apology = meeting.apologies?.[0];
  const collections = meeting.collectionItems ?? [];
  const openLoanWindow = meeting.loanWindows?.find((w) => w.status === "OPEN");
  const reservation = meeting.loanWindows?.flatMap((w) => w.reservations ?? [])[0];
  const reportSummary = meeting.report?.summary;
  const isClosed = ["CLOSED", "COMPLETED"].includes(meeting.status);

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 pb-8">
      <MemberContentHeader eyebrow={humanizeStatus(meeting.meetingType)} title={meeting.meetingNumber} backTo="/member/meetings"
        description="Your session overview, personal activity and official meeting records."
        action={<><Badge tone={isClosed ? "success" : meeting.status === "CANCELLED" ? "danger" : "neutral"}>{humanizeStatus(meeting.status)}</Badge>{openLoanWindow && <Badge tone="success">Loan window open</Badge>}</>} />
      <div className="flex items-center gap-4 rounded-2xl bg-white p-4 sm:p-6">
        <MeetingDateTile date={meeting.meetingDate} />
        <div className="min-w-0 space-y-2 text-sm text-ink-600">
          <p className="flex items-start gap-2"><FiCalendar className="mt-1 shrink-0 text-brand-600" /><span>{new Date(meeting.meetingDate).toLocaleString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" })}</span></p>
          <p className="flex items-start gap-2 break-words"><FiMapPin className="mt-1 shrink-0 text-brand-600" /><span>{meeting.venue || "Venue to be confirmed"}</span></p>
        </div>
      </div>

      <MemberContentSection
        title="Agenda & session overview"
        subtitle="What to expect from this meeting"

      >
        {meeting.agenda ? (
          <p className="text-sm leading-relaxed text-ink-600">{meeting.agenda}</p>
        ) : (
          <p className="text-sm text-ink-500">No agenda published for this meeting.</p>
        )}
        {pool ? (
          <p className="mt-3 text-sm font-semibold text-brand-800">
            Loan pool available: {money(pool.remainingAmount)} of {money(pool.totalLoanablePool)}
          </p>
        ) : null}
      </MemberContentSection>

      <MemberContentSection title="Your summary" subtitle="Attendance, fines, and collections">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MemberSummaryMetric label="Attendance" value={humanizeStatus(attendance)} icon={<FiUsers size={14} />} />
          <MemberSummaryMetric label="Apology" value={apology?.status ? humanizeStatus(apology.status) : "None"} icon={<FiFileText size={14} />} />
          <MemberSummaryMetric label="Fines" value={money(fines.reduce((sum, fine) => sum + Number(fine.amount), 0))} icon={<FiCreditCard size={14} />} />
          <MemberSummaryMetric label="Collections" value={money(collections.reduce((sum, row) => sum + Number(row.amount), 0))} icon={<FiDollarSign size={14} />} />
        </div>
      </MemberContentSection>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5">
      <MemberContentSection title="My meeting activity" subtitle="Collections, fines, and reservations">
        <div className="divide-y divide-ink-100 text-sm">
          {collections.map((row) => (
            <div key={`${row.collectionType}-${row.createdAt}`} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span className="text-ink-700">{humanizeStatus(row.collectionType)}</span>
              <span className="break-words font-semibold text-ink-900">{money(row.amount)}</span>
            </div>
          ))}
          {fines.map((fine) => (
            <div key={fine.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span className="text-ink-700">{humanizeStatus(fine.fineType)} fine</span>
              <span className="break-words font-semibold text-ink-900">
                {money(fine.amount)} · {humanizeStatus(fine.status)}
              </span>
            </div>
          ))}
          {reservation ? (
            <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span className="text-ink-700">{reservation.loan?.loanNumber ?? "Loan reservation"}</span>
              <span className="break-words font-semibold text-ink-900">
                {money(reservation.amount)} · {humanizeStatus(reservation.loan?.status ?? reservation.status)}
              </span>
            </div>
          ) : null}
          {!collections.length && !fines.length && !reservation ? (
            <p className="py-8 text-center text-sm text-ink-500">No activity recorded for you yet.</p>
          ) : null}
        </div>
      </MemberContentSection>

      {reportSummary && typeof reportSummary === "object" ? (
        <MemberContentSection
          title="Meeting report"
          subtitle="Official closed-session summary"
          action={isClosed ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={<FiExternalLink />}
                isLoading={summaryBusy === "view"}
                disabled={Boolean(summaryBusy)}
                onClick={() => void openMeetingSummary("view")}
              >
                View PDF
              </Button>
              <Button
                size="sm"
                icon={<FiDownload />}
                isLoading={summaryBusy === "download"}
                disabled={Boolean(summaryBusy)}
                onClick={() => void openMeetingSummary("download")}
              >
                Download
              </Button>
            </div>
          ) : undefined}
        >
          <ul className="space-y-3 text-sm text-ink-600 [&>li]:rounded-xl [&>li]:bg-ink-50 [&>li]:p-3">
            {"quorumMet" in reportSummary ? (
              <li>Quorum: {(reportSummary as { quorumMet?: boolean }).quorumMet ? "Met" : "Not met"}</li>
            ) : null}
            {"collectionTotals" in reportSummary ? (
              <li>
                Collections posted:{" "}
                {Object.keys((reportSummary as { collectionTotals?: object }).collectionTotals ?? {}).length} types
              </li>
            ) : null}
            {"loanablePool" in reportSummary ? (
              <li>
                Loan pool:{" "}
                {money((reportSummary as { loanablePool?: { totalLoanablePool?: number } }).loanablePool?.totalLoanablePool)}
              </li>
            ) : null}
          </ul>
        </MemberContentSection>
      ) : null}

      {meeting.minutesPublishedAt && meeting.resolutions?.length ? (
        <MemberContentSection title="Published resolutions" subtitle="Official meeting decisions">
          <ul className="space-y-2 text-sm">
            {meeting.resolutions.map((row) => (
              <li key={row.id} className="rounded-xl bg-ink-50 p-4">
                <p className="font-semibold text-ink-900">
                  {row.resolutionNumber ? `${row.resolutionNumber} — ` : ""}
                  {row.title}
                </p>
                <p className="mt-2 break-words text-sm leading-6 text-ink-600">
                  {row.decision}
                  {row.description ? ` · ${row.description}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </MemberContentSection>
      ) : null}
      </div>
      <aside className="order-first min-w-0 space-y-5 xl:order-last" aria-label="Meeting actions">
      {!apology &&
      !startedStatuses.has(meeting.status) &&
      !["CANCELLED"].includes(meeting.status) ? (
        <MemberContentSection title="Submit apology" subtitle="If you will be absent, notify officials">
          <label htmlFor="meeting-apology" className="mb-2 block text-sm font-semibold text-ink-700">Reason for absence</label>
          <textarea id="meeting-apology"
            className="min-h-[4.5rem] w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            rows={3}
            value={apologyReason}
            onChange={(e) => setApologyReason(e.target.value)}
            placeholder="Reason for absence…"
          />
          <Button
            className="mt-3 min-h-11 w-full focus-visible:ring-2 focus-visible:ring-brand-500"
            variant="secondary"
            icon={submitting ? <Spinner /> : <FiSend />}
            disabled={submitting} isLoading={submitting}
            onClick={() => void submitApology()}
          >
            Submit apology
          </Button>
        </MemberContentSection>
      ) : apology ? (
        <MemberContentSection title="Apology on record" subtitle="Submitted for official review">
          <p className="mb-3 break-words text-sm leading-6 text-ink-500">{apology.reason}</p>
          <p className="text-sm text-ink-800">
            Status: <span className="font-semibold">{humanizeStatus(apology.status)}</span>
            {apology.reviewComment ? ` — ${apology.reviewComment}` : ""}
          </p>
        </MemberContentSection>
      ) : null}

      {openLoanWindow ? (
        <MemberContentSection
          title="Apply for a loan"
          subtitle={
            eligibility
              ? `You may apply for up to ${money(eligibility.maxEligible)}`
              : "Live meeting loan window"
          }
        >
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-ink-700">Amount (KES)
            <input
              className="mt-2 min-h-12 w-full rounded-xl bg-ink-50 px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-brand-500"
              inputMode="decimal"
              placeholder="Amount"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
            />
            </label>
            <label className="block text-sm font-semibold text-ink-700">Purpose
            <input
              className="mt-2 min-h-12 w-full rounded-xl bg-ink-50 px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Purpose"
              value={loanPurpose}
              onChange={(e) => setLoanPurpose(e.target.value)}
            />
            </label>
            <Button
              className="min-h-11 w-full focus-visible:ring-2 focus-visible:ring-brand-500"
              icon={<FiSend />}
              disabled={submitting} isLoading={submitting}
              onClick={() => void applyForLoan(openLoanWindow.id)}
            >
              Submit loan request
            </Button>
          </div>
        </MemberContentSection>
      ) : null}

        <MemberContentSection title="Meeting documents" subtitle="Keep a copy of your official records">
          <p className="text-sm leading-6 text-ink-500">Published minutes and meeting summaries are available in your document library.</p>
          <Link to="/member/downloads" className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-50 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-600"><FiDownload /> Browse downloads</Link>
        </MemberContentSection>
      </aside>
      </div>
    </div>
  );
}
