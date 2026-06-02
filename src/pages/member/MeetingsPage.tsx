import { useEffect, useState } from "react";
import { FiCalendar, FiSend } from "react-icons/fi";
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
  loanWindows?: Array<{ id: string; status: string }>;
  apologies?: Array<{ id: string; reason: string }>;
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

export function MemberMeetingsPage() {
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
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

  const load = async () => {
    const [meetingsRes, dash] = await Promise.all([
      api.get<{ meetings: MeetingRecord[] }>("/member-portal/meetings"),
      memberPortalApi.dashboard().catch(() => null),
    ]);
    setMeetings(meetingsRes.data.meetings ?? []);
    if (dash) {
      setHero({
        firstName: dash.firstName,
        membershipNumber: dash.membershipNumber,
        status: dash.status,
        registrationFeePaid: dash.registrationFeePaid,
      });
    }
  };

  useEffect(() => {
    load()
      .catch(() => toastError("Could not load meetings"))
      .finally(() => setLoading(false));
  }, []);

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
        title="Meetings & fines"
        subtitle="Meeting-linked notices and apology submissions"
      />

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
            const hasApology = (meeting.apologies?.length ?? 0) > 0;
            const loanWindowOpen = (meeting.loanWindows?.length ?? 0) > 0;

            return (
              <MemberSection
                key={meeting.id}
                title={meeting.meetingNumber}
                description={new Date(meeting.meetingDate).toLocaleString()}
                action={
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      tone={meeting.status === "CLOSED" ? "success" : "warning"}
                    >
                      {meeting.status}
                    </Badge>
                    {loanWindowOpen ? (
                      <Badge tone="success">Loan window open</Badge>
                    ) : null}
                  </div>
                }
              >
                {meeting.agenda ? (
                  <p className="mb-4 text-sm text-slate-600">{meeting.agenda}</p>
                ) : null}
                <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
                  <FiCalendar className="shrink-0 text-brand-600" />
                  <span>
                    Your attendance:{" "}
                    <span className="font-semibold text-slate-800">
                      {attendance}
                    </span>
                  </span>
                </div>

                {hasApology ? (
                  <p className="mb-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
                    Apology on record for this meeting.
                  </p>
                ) : meeting.status !== "CLOSED" ? (
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Submit apology (if absent)
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
              </MemberSection>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MemberMeetingsPage;
