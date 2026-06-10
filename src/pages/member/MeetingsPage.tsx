import { useEffect, useState, useCallback } from "react";
import { useMeetingsLiveRefresh } from "@/hooks/useMeetingRealtime";
import { Link } from "react-router-dom";
import { loanApi } from "@/services/loanApi";
import type { LoanEligibility } from "@/types/loan";
import { FiCalendar, FiCreditCard, FiShield } from "react-icons/fi";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
import { SetupState } from "@/components/member/MemberCards";
import { StatCell } from "@/components/member/MemberFinancePrimitives";
import {
  MemberSectionCard,
  MemberWelcomeHeader,
} from "@/components/member/MemberPortalUi";
import { useUiStore } from "@/store/uiStore";

type MeetingRecord = {
  id: string;
  meetingNumber: string;
  status: string;
  meetingDate: string;
  agenda?: string;
  attendance?: Array<{ attendanceStatus?: string }>;
  loanWindows?: Array<{ id: string; status: string }>;
  apologies?: Array<{ status?: string }>;
};

type FineRecord = {
  id: string;
  amount: number;
  meetingId?: string | null;
  attendance?: { meetingId: string } | null;
  apology?: { meetingId: string } | null;
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

function statusTone(status?: string): "neutral" | "success" | "warning" | "danger" {
  if (!status) return "neutral";
  if (["OPEN", "ACCEPTED", "PAID", "CLOSED", "APPROVED", "DISBURSED", "COMPLETED"].includes(status)) return "success";
  if (["REJECTED", "FAILED", "ABSENT_WITHOUT_APOLOGY", "CANCELLED"].includes(status)) return "danger";
  if (["SUBMITTED", "PENDING", "NOTICE_SENT", "SCHEDULED", "ATTENDANCE_RECORDING", "COLLECTIONS_OPEN", "LOAN_WINDOW_OPEN"].includes(status)) return "warning";
  return "neutral";
}

export function MemberMeetingsPage() {
  const toastError = useUiStore((s) => s.toastError);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [loading, setLoading] = useState(true);
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

  const onLiveMeeting = useCallback((_meetingId: string) => {
    void load().catch(() => undefined);
  }, []);

  useMeetingsLiveRefresh(onLiveMeeting);

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
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-6">
      <MemberWelcomeHeader
        greeting="Meetings"
        name="Notices & attendance"
        membershipNumber="Track welfare sessions and loan windows"
        statusLabel={
          eligibility
            ? `Eligible up to ${money(eligibility.maxEligible)}`
            : "Member meetings"
        }
      />

      {meetings.length === 0 ? (
        <EmptyState
          title="No meetings scheduled"
          message="Upcoming and recent meetings will appear here once officials schedule them."
        />
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => {
            const attendance =
              meeting.attendance?.[0]?.attendanceStatus ?? "Not marked";
            const apology = meeting.apologies?.[0];
            const openLoanWindow = meeting.loanWindows?.some((w) => w.status === "OPEN");
            const meetingFines = fines.filter((fine) => {
              const fineMeetingId =
                fine.meetingId ??
                fine.attendance?.meetingId ??
                fine.apology?.meetingId;
              return fineMeetingId === meeting.id;
            });
            const finesTotal = meetingFines.reduce(
              (sum, fine) => sum + Number(fine.amount),
              0,
            );

            return (
              <MemberSectionCard
                key={meeting.id}
                title={meeting.meetingNumber}
                subtitle={new Date(meeting.meetingDate).toLocaleString()}
                action={
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={statusTone(meeting.status)}>
                      {humanizeStatus(meeting.status)}
                    </Badge>
                    {openLoanWindow ? (
                      <Badge tone="success">Loan window open</Badge>
                    ) : null}
                  </div>
                }
              >
                {meeting.agenda ? (
                  <p className="mb-3 line-clamp-2 text-sm text-ink-600">
                    {meeting.agenda}
                  </p>
                ) : null}

                <div className="grid grid-cols-1 divide-y divide-ink-100 rounded-xl border border-ink-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <StatCell
                    label="Attendance"
                    value={humanizeStatus(attendance)}
                    icon={<FiCalendar size={14} />}
                  />
                  <StatCell
                    label="Apology"
                    value={apology?.status ? humanizeStatus(apology.status) : "None"}
                    icon={<FiShield size={14} />}
                  />
                  <StatCell
                    label="Fines"
                    value={money(finesTotal)}
                    icon={<FiCreditCard size={14} />}
                  />
                </div>

                <Link
                  className="mt-4 flex min-h-10 w-full items-center justify-center rounded-xl border border-brand-200 bg-brand-50 px-4 text-xs font-bold text-brand-800 transition hover:bg-brand-100"
                  to={`/member/meetings/${meeting.id}`}
                >
                  View details
                </Link>
              </MemberSectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MemberMeetingsPage;
