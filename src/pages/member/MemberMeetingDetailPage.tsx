import { useCallback, useEffect, useState } from "react";
import { useMeetingRealtime } from "@/hooks/useMeetingRealtime";
import { loanApi } from "@/services/loanApi";
import type { LoanEligibility } from "@/types/loan";
import { FiCreditCard, FiDollarSign, FiFileText, FiSend, FiUsers } from "react-icons/fi";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, Spinner } from "@/components/ui/Feedback";
import { StatCell } from "@/components/member/MemberFinancePrimitives";
import {
  MemberSectionCard,
  MemberWelcomeHeader,
} from "@/components/member/MemberPortalUi";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/uiStore";
import { useParams } from "react-router-dom";

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

  async function load() {
    if (!id) return;
    const [res, elig] = await Promise.all([
      api.get<DetailResponse>(`/member-portal/meetings/${id}`),
      loanApi.myEligibility().catch(() => null),
    ]);
    setData(res.data);
    setEligibility(elig);
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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-6">
      <MemberWelcomeHeader
        greeting={humanizeStatus(meeting.meetingType)}
        name={meeting.meetingNumber}
        membershipNumber={new Date(meeting.meetingDate).toLocaleString()}
        statusLabel={meeting.venue ?? humanizeStatus(meeting.status)}
        backTo="/member/meetings"
      />

      <MemberSectionCard
        title="Meeting status"
        subtitle="Live session information"
        action={
          <div className="flex flex-wrap gap-2">
            <Badge>{humanizeStatus(meeting.status)}</Badge>
            {openLoanWindow ? <Badge tone="success">Loan window open</Badge> : null}
          </div>
        }
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
      </MemberSectionCard>

      <MemberSectionCard title="Your summary" subtitle="Attendance, fines, and collections">
        <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-ink-100 rounded-xl border border-ink-100 sm:grid-cols-4 sm:divide-y-0">
          <StatCell label="Attendance" value={humanizeStatus(attendance)} icon={<FiUsers size={14} />} />
          <StatCell label="Apology" value={apology?.status ? humanizeStatus(apology.status) : "None"} icon={<FiFileText size={14} />} />
          <StatCell label="Fines" value={money(fines.reduce((sum, fine) => sum + Number(fine.amount), 0))} icon={<FiCreditCard size={14} />} />
          <StatCell label="Collections" value={money(collections.reduce((sum, row) => sum + Number(row.amount), 0))} icon={<FiDollarSign size={14} />} />
        </div>
      </MemberSectionCard>

      {!apology &&
      !startedStatuses.has(meeting.status) &&
      !["CANCELLED"].includes(meeting.status) ? (
        <MemberSectionCard title="Submit apology" subtitle="If you will be absent, notify officials">
          <textarea
            className="min-h-[4.5rem] w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm"
            rows={3}
            value={apologyReason}
            onChange={(e) => setApologyReason(e.target.value)}
            placeholder="Reason for absence…"
          />
          <Button
            className="mt-3 w-full sm:w-auto"
            variant="secondary"
            icon={submitting ? <Spinner /> : <FiSend />}
            disabled={submitting}
            onClick={() => void submitApology()}
          >
            Submit apology
          </Button>
        </MemberSectionCard>
      ) : apology ? (
        <MemberSectionCard title="Apology on record" subtitle="Submitted for official review">
          <p className="text-sm text-ink-800">
            Status: <span className="font-semibold">{humanizeStatus(apology.status)}</span>
            {apology.reviewComment ? ` — ${apology.reviewComment}` : ""}
          </p>
        </MemberSectionCard>
      ) : null}

      {openLoanWindow ? (
        <MemberSectionCard
          title="Apply for a loan"
          subtitle={
            eligibility
              ? `You may apply for up to ${money(eligibility.maxEligible)}`
              : "Live meeting loan window"
          }
        >
          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,8rem)_1fr_auto] sm:items-center">
            <input
              className="min-h-10 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm"
              inputMode="numeric"
              placeholder="Amount"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
            />
            <input
              className="min-h-10 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm"
              placeholder="Purpose"
              value={loanPurpose}
              onChange={(e) => setLoanPurpose(e.target.value)}
            />
            <Button
              className="w-full sm:w-auto"
              icon={<FiSend />}
              disabled={submitting}
              onClick={() => void applyForLoan(openLoanWindow.id)}
            >
              Apply
            </Button>
          </div>
        </MemberSectionCard>
      ) : null}

      <MemberSectionCard title="My meeting activity" subtitle="Collections, fines, and reservations">
        <div className="divide-y divide-ink-100 text-sm">
          {collections.map((row) => (
            <div key={`${row.collectionType}-${row.createdAt}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="text-ink-700">{humanizeStatus(row.collectionType)}</span>
              <span className="font-extrabold text-ink-900">{money(row.amount)}</span>
            </div>
          ))}
          {fines.map((fine) => (
            <div key={fine.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="text-ink-700">{humanizeStatus(fine.fineType)} fine</span>
              <span className="font-extrabold text-ink-900">
                {money(fine.amount)} · {humanizeStatus(fine.status)}
              </span>
            </div>
          ))}
          {reservation ? (
            <div className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="text-ink-700">{reservation.loan?.loanNumber ?? "Loan reservation"}</span>
              <span className="font-extrabold text-ink-900">
                {money(reservation.amount)} · {humanizeStatus(reservation.loan?.status ?? reservation.status)}
              </span>
            </div>
          ) : null}
          {!collections.length && !fines.length && !reservation ? (
            <p className="py-8 text-center text-sm text-ink-500">No activity recorded for you yet.</p>
          ) : null}
        </div>
      </MemberSectionCard>

      {reportSummary && typeof reportSummary === "object" ? (
        <MemberSectionCard title="Meeting report" subtitle="Published session summary">
          <ul className="list-inside list-disc space-y-1 text-sm text-ink-600">
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
        </MemberSectionCard>
      ) : null}

      {meeting.minutesPublishedAt && meeting.resolutions?.length ? (
        <MemberSectionCard title="Published resolutions" subtitle="Official meeting decisions">
          <ul className="space-y-2 text-sm">
            {meeting.resolutions.map((row) => (
              <li key={row.id} className="rounded-xl bg-ink-50 px-3 py-2">
                <p className="font-semibold text-ink-900">
                  {row.resolutionNumber ? `${row.resolutionNumber} — ` : ""}
                  {row.title}
                </p>
                <p className="text-ink-600">
                  {row.decision}
                  {row.description ? ` · ${row.description}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </MemberSectionCard>
      ) : null}
    </div>
  );
}
