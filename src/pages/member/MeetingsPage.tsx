import { useEffect, useState, useCallback } from "react";
import { useMeetingsLiveRefresh } from "@/hooks/useMeetingRealtime";
import { Link } from "react-router-dom";
import { loanApi } from "@/services/loanApi";
import type { LoanEligibility } from "@/types/loan";
import { FiCalendar, FiCreditCard, FiFileText, FiSend, FiShield } from "react-icons/fi";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner, EmptyState } from "@/components/ui/Feedback";
import { MemberSection, SetupState } from "@/components/member/MemberCards";
import { StatCell } from "@/components/member/MemberFinancePrimitives";
import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/auth";

type MeetingAttendance = {
  attendanceStatus?: string;
};

type MeetingRecord = {
  id: string;
  meetingNumber: string;
  status: string;
  meetingDate: string;
  agenda?: string;
  attendance?: MeetingAttendance[];
  loanWindows?: Array<{ id: string; status: string; remainingAmount?: number; totalLoanablePool?: number }>;
  apologies?: Array<{ id: string; reason: string; status?: string; reviewComment?: string }>;
  report?: { id: string; summary?: Record<string, unknown> } | null;
  resolutions?: Array<{ id: string; title: string; decision: string }>;
};

type FineRecord = {
  id: string;
  fineType: string;
  amount: number;
  status: string;
  fineDate: string;
  meetingId?: string | null;
  reason?: string;
  attendance?: { meetingId: string } | null;
  apology?: { meetingId: string } | null;
};

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

function money(value: unknown) {
  return `KES ${Number(value ?? 0).toLocaleString()}`;
}

function statusTone(status?: string): "neutral" | "success" | "warning" | "danger" {
  if (!status) return "neutral";
  if (["OPEN", "ACCEPTED", "PAID", "CLOSED", "APPROVED", "DISBURSED"].includes(status)) return "success";
  if (["REJECTED", "FAILED", "ABSENT_WITHOUT_APOLOGY"].includes(status)) return "danger";
  if (["SUBMITTED", "PENDING", "NOTICE_SENT", "SCHEDULED", "ATTENDANCE_RECORDING", "COLLECTIONS_OPEN", "LOAN_WINDOW_OPEN"].includes(status)) return "warning";
  return "neutral";
}

const startedStatuses = new Set(["ATTENDANCE_RECORDING", "COLLECTIONS_OPEN", "LOAN_WINDOW_OPEN", "RESOLUTIONS_OPEN", "CLOSING_REVIEW", "ONGOING", "CLOSED", "COMPLETED"]);

export function MemberMeetingsPage() {
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const user = useAuthStore((s) => s.user);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [reasonByMeeting, setReasonByMeeting] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [loanAmountByWindow, setLoanAmountByWindow] = useState<Record<string, string>>({});
  const [loanPurposeByWindow, setLoanPurposeByWindow] = useState<Record<string, string>>({});
  const [livePoolByMeeting, setLivePoolByMeeting] = useState<Record<string, { remainingAmount: number; totalLoanablePool: number }>>({});
  const [eligibility, setEligibility] = useState<LoanEligibility | null>(null);

  const load = async () => {
    const [meetingsRes, finesRes, elig] = await Promise.all([
      api.get<{ meetings: MeetingRecord[] }>("/member-portal/meetings"),
      api.get<{ fines: FineRecord[] }>("/member-portal/fines"),
      loanApi.myEligibility().catch(() => null),
    ]);
    const nextMeetings = meetingsRes.data.meetings ?? [];
    setMeetings(nextMeetings);
    setFines(finesRes.data.fines ?? []);
    setEligibility(elig);
    const pools: Record<string, { remainingAmount: number; totalLoanablePool: number }> = {};
    await Promise.all(
      nextMeetings
        .filter((m) => m.loanWindows?.some((w) => w.status === "OPEN"))
        .map(async (m) => {
          try {
            const res = await api.get<{ pool: { remainingAmount: number; totalLoanablePool: number } }>(`/member-portal/meetings/${m.id}/loan-pool`);
            pools[m.id] = res.data.pool;
          } catch {
            /* ignore */
          }
        }),
    );
    setLivePoolByMeeting(pools);
  };

  const refreshLivePools = useCallback(async (list: MeetingRecord[]) => {
    const open = list.filter((m) => m.loanWindows?.some((w) => w.status === "OPEN"));
    if (!open.length) return;
    const pools: Record<string, { remainingAmount: number; totalLoanablePool: number }> = {};
    await Promise.all(
      open.map(async (m) => {
        try {
          const res = await api.get<{ pool: { remainingAmount: number; totalLoanablePool: number } }>(`/member-portal/meetings/${m.id}/loan-pool`);
          pools[m.id] = res.data.pool;
        } catch {
          /* ignore */
        }
      }),
    );
    setLivePoolByMeeting((prev) => ({ ...prev, ...pools }));
  }, []);

  useEffect(() => {
    load()
      .catch(() => toastError("Could not load meetings"))
      .finally(() => setLoading(false));
  }, []);

  const onLiveMeeting = useCallback((meetingId: string) => {
    void load().catch(() => undefined);
    const target = meetings.find((m) => m.id === meetingId);
    if (target) void refreshLivePools([target]);
  }, [load, meetings, refreshLivePools]);

  useMeetingsLiveRefresh(onLiveMeeting);

  const submitApology = async (meetingId: string) => {
    const reason = reasonByMeeting[meetingId]?.trim();
    if (!reason || reason.length < 3) {
      toastError("Reason required", "Please enter at least 3 characters.");
      return;
    }
    setSubmittingId(meetingId);
    try {
      await api.post(`/member-portal/meetings/${meetingId}/apologies`, {
        reason,
      });
      setReasonByMeeting((state) => ({ ...state, [meetingId]: "" }));
      await load();
      toastSuccess("Apology submitted", "Officials will review your apology.");
    } catch (e: unknown) {
      toastError("Submission failed", getApiError(e));
    } finally {
      setSubmittingId(null);
    }
  };

  const applyForLoan = async (windowId: string) => {
    if (!user?.memberId) {
      toastError("Member profile missing", "Your session is not linked to a member profile.");
      return;
    }
    const amount = Number(loanAmountByWindow[windowId] ?? 0);
    if (!amount || amount <= 0) {
      toastError("Loan amount required", "Enter the amount you want to apply for.");
      return;
    }
    setSubmittingId(windowId);
    try {
      await api.post(`/meetings/loan-window/${windowId}/reservations`, {
        memberId: user.memberId,
        requestedAmount: amount,
        purpose: loanPurposeByWindow[windowId] || "Meeting loan window application",
      });
      setLoanAmountByWindow((state) => ({ ...state, [windowId]: "" }));
      setLoanPurposeByWindow((state) => ({ ...state, [windowId]: "" }));
      await load();
      toastSuccess("Loan request submitted", "Officials can now review it during the meeting.");
    } catch (e: unknown) {
      toastError("Loan request failed", getApiError(e));
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <SetupState
        loading
        title="Loading meetings"
        message="Fetching notices, attendance, and loan windows…"
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Meetings"
        subtitle="Notices, attendance, apologies, and live loan windows"
      />

      {eligibility ? (
        <p className="rounded-lg border border-ink-100 bg-ink-50 px-4 py-3 text-sm text-ink-800">
          You may apply for up to{" "}
          <span className="font-extrabold">{money(eligibility.maxEligible)}</span>{" "}
          based on your savings and share position.
        </p>
      ) : null}

      {meetings.length === 0 ? (
        <EmptyState
          title="No meetings scheduled"
          message="Upcoming and recent meetings will appear here once officials schedule them."
        />
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const attendance =
              meeting.attendance?.[0]?.attendanceStatus ?? "Not marked";
            const apology = meeting.apologies?.[0];
            const hasApology = Boolean(apology);
            const loanWindows = meeting.loanWindows ?? [];
            const openLoanWindow = loanWindows.find((window) => window.status === "OPEN");
            const meetingFines = fines.filter((fine) => {
              const fineMeetingId = fine.meetingId ?? fine.attendance?.meetingId ?? fine.apology?.meetingId;
              return fineMeetingId === meeting.id;
            });
            const reportSummary = meeting.report?.summary;

            return (
              <MemberSection
                key={meeting.id}
                title={meeting.meetingNumber}
                description={new Date(meeting.meetingDate).toLocaleString()}
                action={
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={statusTone(meeting.status)}>
                      {meeting.status}
                    </Badge>
                    {openLoanWindow ? (
                      <Badge tone="success">Loan window open</Badge>
                    ) : null}
                  </div>
                }
              >
                {meeting.agenda ? (
                  <p className="mb-4 text-sm leading-relaxed text-ink-600">{meeting.agenda}</p>
                ) : null}

                <Link
                  className="mb-4 flex min-h-10 w-full items-center justify-center rounded-lg border border-ink-200 bg-white px-4 text-xs font-semibold text-ink-900 transition hover:bg-ink-50 sm:ml-auto sm:w-auto sm:min-w-[8rem]"
                  to={`/member/meetings/${meeting.id}`}
                >
                  View details
                </Link>

                <div className="divide-y divide-ink-100 rounded-lg border border-ink-100 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <StatCell
                    label="Attendance"
                    value={attendance}
                    icon={<FiCalendar size={14} />}
                  />
                  <StatCell
                    label="Apology"
                    value={apology?.status ?? "None submitted"}
                    icon={<FiShield size={14} />}
                  />
                  <StatCell
                    label="Meeting fines"
                    value={money(meetingFines.reduce((sum, fine) => sum + Number(fine.amount), 0))}
                    icon={<FiCreditCard size={14} />}
                  />
                </div>

                {hasApology ? (
                  <p className="mt-4 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-sm text-ink-800">
                    Apology on record: <span className="font-semibold">{apology?.status}</span>
                    {apology?.reviewComment ? ` — ${apology.reviewComment}` : ""}
                  </p>
                ) : !startedStatuses.has(meeting.status) && !["CANCELLED"].includes(meeting.status) ? (
                  <div className="mt-4 space-y-3 border-t border-ink-100 pt-4">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-ink-500">
                      Submit apology (if absent)
                    </label>
                    <textarea
                      className="min-h-[4.5rem] w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm"
                      rows={2}
                      value={reasonByMeeting[meeting.id] ?? ""}
                      onChange={(e) =>
                        setReasonByMeeting((state) => ({
                          ...state,
                          [meeting.id]: e.target.value,
                        }))
                      }
                      placeholder="Reason for absence…"
                    />
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto"
                      icon={
                        submittingId === meeting.id ? (
                          <Spinner />
                        ) : (
                          <FiSend />
                        )
                      }
                      disabled={submittingId === meeting.id}
                      onClick={() => void submitApology(meeting.id)}
                    >
                      Submit apology
                    </Button>
                  </div>
                ) : null}

                {openLoanWindow ? (
                  <div className="mt-4 rounded-lg border border-ink-100 bg-ink-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-extrabold text-ink-900">Loan window open</p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-600">
                          Apply from the live meeting pool during the sitting.
                        </p>
                      </div>
                      <Badge tone="success">
                        Available: {money(livePoolByMeeting[meeting.id]?.remainingAmount ?? openLoanWindow.remainingAmount)}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,8rem)_1fr_auto] sm:items-center">
                      <input
                        className="min-h-10 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
                        inputMode="numeric"
                        placeholder="Amount"
                        value={loanAmountByWindow[openLoanWindow.id] ?? ""}
                        onChange={(e) => setLoanAmountByWindow((state) => ({ ...state, [openLoanWindow.id]: e.target.value }))}
                      />
                      <input
                        className="min-h-10 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
                        placeholder="Purpose"
                        value={loanPurposeByWindow[openLoanWindow.id] ?? ""}
                        onChange={(e) => setLoanPurposeByWindow((state) => ({ ...state, [openLoanWindow.id]: e.target.value }))}
                      />
                      <Button
                        className="w-full sm:w-auto"
                        icon={<FiSend />}
                        disabled={submittingId === openLoanWindow.id}
                        onClick={() => void applyForLoan(openLoanWindow.id)}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                ) : null}

                {reportSummary && typeof reportSummary === "object" ? (
                  <div className="mt-4 rounded-lg border border-ink-100 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-ink-800">
                      <FiFileText /> Meeting report
                    </div>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink-600">
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
                  </div>
                ) : null}
              </MemberSection>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MemberMeetingsPage;
