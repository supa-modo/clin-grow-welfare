import { useEffect, useState, useCallback } from "react";
import { loanApi } from "@/services/loanApi";
import type { LoanEligibility } from "@/types/loan";
import { FiCalendar, FiCreditCard, FiFileText, FiSend, FiShield } from "react-icons/fi";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner, EmptyState } from "@/components/ui/Feedback";
import {
  MemberHero,
  MemberSection,
  SetupState,
} from "@/components/member/MemberCards";
import { memberPortalApi } from "@/services/memberApi";
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
  report?: { id: string; summary?: any } | null;
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

export function MemberMeetingsPage() {
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const user = useAuthStore((s) => s.user);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [hero, setHero] = useState({
    firstName: "Member",
    membershipNumber: "",
    status: "ACTIVE",
    registrationFeePaid: true,
  });
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
    const [meetingsRes, finesRes, dash, elig] = await Promise.all([
      api.get<{ meetings: MeetingRecord[] }>("/member-portal/meetings"),
      api.get<{ fines: FineRecord[] }>("/member-portal/fines"),
      memberPortalApi.dashboard().catch(() => null),
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
    if (dash) {
      setHero({
        firstName: dash.firstName,
        membershipNumber: dash.membershipNumber,
        status: dash.status,
        registrationFeePaid: dash.registrationFeePaid,
      });
    }
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

  useEffect(() => {
    const hasOpen = meetings.some((m) => m.loanWindows?.some((w) => w.status === "OPEN"));
    if (!hasOpen) return undefined;
    const timer = window.setInterval(() => void refreshLivePools(meetings), 15_000);
    return () => window.clearInterval(timer);
  }, [meetings, refreshLivePools]);

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
    <div className="space-y-6">
      <MemberHero
        firstName={hero.firstName}
        membershipNumber={hero.membershipNumber}
        status={hero.status}
        registrationFeePaid={hero.registrationFeePaid}
        subtitle="View meeting notices, attendance, open loan windows, and submit apologies when you cannot attend."
      />

      <PageHeader
        title="Meetings, apologies & loan windows"
        subtitle="Meeting notices, apology status, attendance fines, published reports, and live loan windows"
      />

      {eligibility ? (
        <p className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          You may apply for up to <span className="font-bold">{money(eligibility.maxEligible)}</span> based on your savings and share position.
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

            return (
              <MemberSection
                key={meeting.id}
                title={meeting.meetingNumber}
                description={new Date(meeting.meetingDate).toLocaleString()}
                action={
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      tone={statusTone(meeting.status)}
                    >
                      {meeting.status}
                    </Badge>
                    {openLoanWindow ? (
                      <Badge tone="success">Loan window open</Badge>
                    ) : null}
                  </div>
                }
              >
                {meeting.agenda ? (
                  <p className="mb-4 text-sm text-slate-600">{meeting.agenda}</p>
                ) : null}
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <FiCalendar className="shrink-0 text-brand-600" />
                      <span>Attendance</span>
                    </div>
                    <p className="mt-1 font-bold text-slate-900">{attendance}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <FiShield className="shrink-0 text-brand-600" />
                      <span>Apology</span>
                    </div>
                    <p className="mt-1 font-bold text-slate-900">{apology?.status ?? "None submitted"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <FiCreditCard className="shrink-0 text-brand-600" />
                      <span>Meeting fines</span>
                    </div>
                    <p className="mt-1 font-bold text-slate-900">{money(meetingFines.reduce((sum, fine) => sum + Number(fine.amount), 0))}</p>
                  </div>
                </div>

                {hasApology ? (
                  <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
                    Apology on record: <span className="font-semibold">{apology?.status}</span>{apology?.reviewComment ? ` - ${apology.reviewComment}` : ""}
                  </p>
                ) : !["CLOSED", "CANCELLED", "COMPLETED"].includes(meeting.status) ? (
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Submit apology before the meeting (if absent)
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-bold text-emerald-950">Loan window is open</p>
                        <p className="mt-1 text-sm text-emerald-800">Apply from the live meeting pool. Officials can review and reserve during the sitting.</p>
                      </div>
                      <Badge tone="success">Available: {money(livePoolByMeeting[meeting.id]?.remainingAmount ?? openLoanWindow.remainingAmount)}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-[140px_1fr_auto]">
                      <input className="rounded-lg border border-emerald-200 px-3 py-2 text-sm" inputMode="numeric" placeholder="Amount" value={loanAmountByWindow[openLoanWindow.id] ?? ""} onChange={(e) => setLoanAmountByWindow((state) => ({ ...state, [openLoanWindow.id]: e.target.value }))} />
                      <input className="rounded-lg border border-emerald-200 px-3 py-2 text-sm" placeholder="Purpose" value={loanPurposeByWindow[openLoanWindow.id] ?? ""} onChange={(e) => setLoanPurposeByWindow((state) => ({ ...state, [openLoanWindow.id]: e.target.value }))} />
                      <Button icon={<FiSend />} disabled={submittingId === openLoanWindow.id} onClick={() => void applyForLoan(openLoanWindow.id)}>Apply</Button>
                    </div>
                  </div>
                ) : null}

                {meeting.report?.summary ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><FiFileText /> Meeting report</div>
                    <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                      {typeof meeting.report.summary === "object" && meeting.report.summary !== null ? (
                        <>
                          {"quorumMet" in meeting.report.summary ? (
                            <p>Quorum: {(meeting.report.summary as { quorumMet?: boolean }).quorumMet ? "Met" : "Not met"}</p>
                          ) : null}
                          {"collectionTotals" in meeting.report.summary ? (
                            <p>Collections posted: {Object.keys((meeting.report.summary as { collectionTotals?: object }).collectionTotals ?? {}).length} types</p>
                          ) : null}
                          {"loanablePool" in meeting.report.summary ? (
                            <p>Loan pool: {money((meeting.report.summary as { loanablePool?: { totalLoanablePool?: number } }).loanablePool?.totalLoanablePool)}</p>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-slate-600">Summary available after officials close the meeting.</p>
                      )}
                    </div>
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
