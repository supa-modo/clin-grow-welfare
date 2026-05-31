import { useEffect, useState } from "react";
import { FiSend } from "react-icons/fi";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export function MemberMeetingsPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [reasonByMeeting, setReasonByMeeting] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await api.get("/member-portal/meetings");
    setMeetings(res.data.meetings ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const submitApology = async (meetingId: string) => {
    setMessage("");
    try {
      await api.post(`/member-portal/meetings/${meetingId}/apologies`, { reason: reasonByMeeting[meetingId] });
      setReasonByMeeting((state) => ({ ...state, [meetingId]: "" }));
      await load();
      setMessage("Apology submitted.");
    } catch (err: any) {
      setMessage(err.response?.data?.error ?? "Apology submission failed.");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Meetings and Fines" subtitle="View notices, attendance history, open loan windows, apologies, minutes, and meeting-linked dues." />
      {message ? <Card className="p-4 text-sm font-semibold text-ink-600">{message}</Card> : null}
      <div className="grid gap-4">
        {meetings.map((meeting) => (
          <Card key={meeting.id} className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-extrabold text-ink-900">{meeting.meetingNumber}</h3>
                  <Badge tone={meeting.status === "CLOSED" ? "success" : "warning"}>{meeting.status}</Badge>
                  {meeting.loanWindows?.length ? <Badge tone="success">Loan window open</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-ink-500">{new Date(meeting.meetingDate).toLocaleString()}</p>
                <p className="mt-2 text-sm text-ink-600">{meeting.agenda}</p>
                <p className="mt-2 text-xs font-semibold text-ink-500">Attendance: {meeting.attendance?.[0]?.attendanceStatus ?? "Not marked"}</p>
              </div>
              <div className="w-full max-w-md space-y-2">
                <textarea className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" rows={2} value={reasonByMeeting[meeting.id] ?? ""} onChange={(e) => setReasonByMeeting((state) => ({ ...state, [meeting.id]: e.target.value }))} placeholder="Submit apology reason" />
                <Button className="w-full" variant="secondary" icon={<FiSend />} onClick={() => void submitApology(meeting.id)}>Submit Apology</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
