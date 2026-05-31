import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiClock, FiDollarSign, FiDownload, FiFileText, FiPlay, FiRefreshCw, FiSend, FiShield, FiUsers, FiXCircle } from "react-icons/fi";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

function money(value: unknown) {
  return `KES ${Number(value ?? 0).toLocaleString()}`;
}

function tone(status?: string): "neutral" | "success" | "warning" | "danger" {
  if (!status) return "neutral";
  if (["ACTIVE", "APPROVED", "PAID", "POSTED", "CLOSED", "COMPLETED", "SENT"].includes(status)) return "success";
  if (["REJECTED", "FAILED", "DEFAULTED", "CANCELLED"].includes(status)) return "danger";
  if (["PENDING", "SUBMITTED", "PAYMENT_PENDING", "COLLECTIONS_OPEN", "LOAN_WINDOW_OPEN", "ATTENDANCE_RECORDING"].includes(status)) return "warning";
  return "neutral";
}

function finePreview(status: string) {
  if (status === "PRESENT_LATE" || status === "LATE") return 100;
  if (status === "ABSENT_WITH_APOLOGY") return 150;
  if (status === "ABSENT_WITHOUT_APOLOGY") return 200;
  return 0;
}

async function downloadReport(reportKey: string, format: "pdf" | "csv") {
  const res = await api.get(`/reports/${reportKey}/export`, { params: { format }, responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${reportKey}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, error, reload: load };
}

function StateBlock({ loading, error, empty }: { loading?: boolean; error?: string; empty?: boolean }) {
  if (loading) return <Card className="p-6 text-sm font-semibold text-ink-500">Loading workspace data...</Card>;
  if (error) return <Card className="border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">{error}</Card>;
  if (empty) return <Card className="p-6 text-sm font-semibold text-ink-500">No records match this workspace yet.</Card>;
  return null;
}

function TableShell({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm"><div className="overflow-x-auto">{children}</div></div>;
}

export function WelfarePage() {
  const { data, loading, error, reload } = useLoad(async () => {
    const [claims, types] = await Promise.all([
      api.get("/welfare", { params: { page: 1, pageSize: 50 } }),
      api.get("/welfare/types"),
    ]);
    return { claims: claims.data.data ?? [], types: types.data.types ?? [] };
  }, []);
  const [busy, setBusy] = useState("");

  const act = async (id: string, action: "approve" | "pay" | "reject") => {
    setBusy(`${action}-${id}`);
    try {
      if (action === "approve") await api.post(`/welfare/${id}/approve`, { amountApproved: Number(data?.claims.find((c: any) => c.id === id)?.amountRequested ?? 0) });
      if (action === "pay") await api.post(`/welfare/${id}/pay`);
      if (action === "reject") await api.post(`/welfare/${id}/reject`, { reason: "Rejected from review queue" });
      await reload();
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Welfare Claims"
        subtitle="Committee-controlled welfare support with constitutional benefit limits and welfare-fund-only payment."
        action={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void reload()}>Refresh</Button>}
      />
      <div className="grid gap-3 md:grid-cols-4">
        {(data?.types ?? []).map((type: any) => <StatCard key={type.id} label={type.name} value={type.maxAmount ? money(type.maxAmount) : "Meeting-approved"} detail={type.approvalLevel} />)}
      </div>
      <StateBlock loading={loading} error={error} empty={!loading && !data?.claims.length} />
      {data?.claims.length ? (
        <TableShell>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase text-ink-500">
              <tr><th className="px-4 py-3">Claim</th><th className="px-4 py-3">Member</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.claims.map((claim: any) => (
                <tr key={claim.id} className="hover:bg-ink-50/50">
                  <td className="px-4 py-3 font-bold text-ink-900">{claim.claimNumber}</td>
                  <td className="px-4 py-3">{claim.member?.name}</td>
                  <td className="px-4 py-3">{claim.claimType?.name}</td>
                  <td className="px-4 py-3 font-semibold">{money(claim.amountRequested)}</td>
                  <td className="px-4 py-3"><Badge tone={tone(claim.status)}>{claim.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" icon={<FiCheckCircle />} disabled={busy !== ""} onClick={() => void act(claim.id, "approve")}>Approve</Button>
                      <Button size="sm" variant="secondary2" icon={<FiSend />} disabled={busy !== ""} onClick={() => void act(claim.id, "pay")}>Pay</Button>
                      <Button size="sm" variant="danger" icon={<FiXCircle />} disabled={busy !== ""} onClick={() => void act(claim.id, "reject")}>Reject</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      ) : null}
    </div>
  );
}

export function MeetingsPage() {
  const { data, loading, error, reload } = useLoad(async () => {
    const res = await api.get("/meetings", { params: { page: 1, pageSize: 20 } });
    return res.data.data ?? [];
  }, []);
  const [busy, setBusy] = useState("");
  const [meetingType, setMeetingType] = useState("ORDINARY");
  const [meetingDate, setMeetingDate] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [memberByMeeting, setMemberByMeeting] = useState<Record<string, string>>({});
  const [attendanceByMeeting, setAttendanceByMeeting] = useState<Record<string, string>>({});
  const [collectionByMeeting, setCollectionByMeeting] = useState<Record<string, { type: string; amount: string; reference: string }>>({});
  const activeMeeting = data?.[0];

  useEffect(() => {
    api.get("/members", { params: { page: 1, pageSize: 50, status: "ACTIVE" } })
      .then((res) => setMembers(res.data.data ?? []))
      .catch(() => setMembers([]));
  }, []);

  const create = async () => {
    if (!meetingDate) return;
    setBusy("create");
    try {
      await api.post("/meetings", { meetingType, meetingDate: new Date(meetingDate).toISOString(), venue: "CREATES Meeting Room", agenda: "Attendance, collections, loan window, welfare claims, resolutions" });
      await reload();
    } finally {
      setBusy("");
    }
  };

  const action = async (meetingId: string, endpoint: string, body?: any) => {
    setBusy(endpoint);
    try {
      await api.post(`/meetings/${meetingId}/${endpoint}`, body ?? {});
      await reload();
    } finally {
      setBusy("");
    }
  };

  const openCollections = async (meetingId: string) => action(meetingId, "collections/open");
  const openLoanWindow = async (meetingId: string) => action(meetingId, "loan-window/open");
  const sendNotice = async (meetingId: string) => action(meetingId, "notices", { channel: "IN_APP" });
  const markAttendance = async (meetingId: string) => {
    const memberId = memberByMeeting[meetingId] || members[0]?.id;
    const attendanceStatus = attendanceByMeeting[meetingId] || "PRESENT_ON_TIME";
    if (!memberId) return;
    await action(meetingId, "attendance", { memberId, attendanceStatus });
  };
  const collect = async (meeting: any) => {
    const memberId = memberByMeeting[meeting.id] || members[0]?.id;
    const input = collectionByMeeting[meeting.id] ?? { type: "WEEKLY_SAVINGS", amount: "250", reference: "" };
    if (!memberId) return;
    setBusy(`collect-${meeting.id}`);
    try {
      const session = meeting.collectionSessions?.find((row: any) => row.status === "OPEN")
        ?? (await api.post(`/meetings/${meeting.id}/collections/open`)).data.session;
      await api.post(`/meetings/${meeting.id}/collections/${session.id}/items`, {
        memberId,
        collectionType: input.type,
        amount: Number(input.amount || 0),
        paymentMethod: "MPESA",
        paymentReference: input.reference || `MTG-${meeting.meetingNumber}-${Date.now()}`,
      });
      await reload();
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Meeting Control Room"
        subtitle="Run the weekly welfare sitting from notice to attendance, collections, loan window, resolutions, and close report."
        action={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void reload()}>Refresh</Button>}
      />

      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
          <select className="rounded-lg border border-ink-200 px-3 py-2 text-sm" value={meetingType} onChange={(e) => setMeetingType(e.target.value)}>
            <option>ORDINARY</option><option>AGM</option><option>SPECIAL_GENERAL</option><option>MANAGEMENT_COMMITTEE</option>
          </select>
          <input className="rounded-lg border border-ink-200 px-3 py-2 text-sm" type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
          <Button icon={<FiClock />} isLoading={busy === "create"} onClick={() => void create()}>Schedule Meeting</Button>
        </div>
      </Card>

      {activeMeeting ? (
        <div className="grid gap-3 md:grid-cols-5">
          <StatCard label="Current meeting" value={activeMeeting.meetingNumber} detail={activeMeeting.meetingType} />
          <StatCard label="Status" value={activeMeeting.status} />
          <StatCard label="Attendance rows" value={String(activeMeeting.attendance?.length ?? 0)} />
          <StatCard label="Collection items" value={String(activeMeeting.collectionItems?.length ?? activeMeeting.collectionSessions?.[0]?.items?.length ?? 0)} />
          <StatCard label="Loan windows" value={String(activeMeeting.loanWindows?.length ?? 0)} />
        </div>
      ) : null}

      <StateBlock loading={loading} error={error} empty={!loading && !data?.length} />
      {data?.length ? (
        <div className="grid gap-4">
          {data.map((meeting: any) => (
            <Card key={meeting.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-extrabold text-ink-900">{meeting.meetingNumber}</h3>
                    <Badge tone={tone(meeting.status)}>{meeting.status}</Badge>
                    <Badge>{meeting.meetingType}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-500">{new Date(meeting.meetingDate).toLocaleString()} - {meeting.venue ?? "Venue pending"}</p>
                  <p className="mt-2 max-w-3xl text-sm text-ink-600">{meeting.agenda}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" icon={<FiSend />} disabled={!!busy} onClick={() => void sendNotice(meeting.id)}>Notice</Button>
                  <Button size="sm" variant="secondary" icon={<FiPlay />} disabled={!!busy} onClick={() => void action(meeting.id, "start")}>Start</Button>
                  <Button size="sm" variant="secondary2" icon={<FiFileText />} disabled={!!busy} onClick={() => void openCollections(meeting.id)}>Collections</Button>
                  <Button size="sm" variant="outline" icon={<FiShield />} disabled={!!busy} onClick={() => void openLoanWindow(meeting.id)}>Loan Window</Button>
                  <Button size="sm" icon={<FiCheckCircle />} disabled={!!busy} onClick={() => void action(meeting.id, "close")}>Close</Button>
                </div>
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_1.25fr_1fr]">
                <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-extrabold uppercase text-ink-500">Attendance Register</p>
                      <p className="text-sm text-ink-600">Quick-mark members and preview constitutional fines.</p>
                    </div>
                    <FiUsers className="text-brand-700" />
                  </div>
                  <div className="grid gap-2">
                    <select className="rounded-lg border border-ink-200 px-3 py-2 text-sm" value={memberByMeeting[meeting.id] ?? ""} onChange={(e) => setMemberByMeeting((state) => ({ ...state, [meeting.id]: e.target.value }))}>
                      {members.map((member) => <option key={member.id} value={member.id}>{member.membershipNumber} - {member.name}</option>)}
                    </select>
                    <select className="rounded-lg border border-ink-200 px-3 py-2 text-sm" value={attendanceByMeeting[meeting.id] ?? "PRESENT_ON_TIME"} onChange={(e) => setAttendanceByMeeting((state) => ({ ...state, [meeting.id]: e.target.value }))}>
                      <option value="PRESENT_ON_TIME">Present on time</option>
                      <option value="PRESENT_LATE">Present late - KES 100</option>
                      <option value="VIRTUAL_PRESENT">Virtual present</option>
                      <option value="ABSENT_WITH_APOLOGY">Absent with apology - KES 150</option>
                      <option value="ABSENT_WITHOUT_APOLOGY">Absent without apology - KES 200</option>
                      <option value="EXCUSED">Excused</option>
                    </select>
                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs font-semibold text-ink-600">
                      <span>Fine preview</span>
                      <span>{money(finePreview(attendanceByMeeting[meeting.id] ?? "PRESENT_ON_TIME"))}</span>
                    </div>
                    <Button size="sm" variant="secondary" icon={<FiCheckCircle />} disabled={meeting.status === "CLOSED" || !!busy} onClick={() => void markAttendance(meeting.id)}>Mark Attendance</Button>
                  </div>
                </div>

                <div className="rounded-xl border border-ink-100 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-extrabold uppercase text-ink-500">Collections Ceremony</p>
                      <p className="text-sm text-ink-600">Post savings, kitty, fines, and meeting-linked receipts from one guided panel.</p>
                    </div>
                    <FiDollarSign className="text-brand-700" />
                  </div>
                  <div className="grid gap-2 md:grid-cols-[1fr_120px_1fr_auto]">
                    <select className="rounded-lg border border-ink-200 px-3 py-2 text-sm" value={collectionByMeeting[meeting.id]?.type ?? "WEEKLY_SAVINGS"} onChange={(e) => setCollectionByMeeting((state) => ({ ...state, [meeting.id]: { ...(state[meeting.id] ?? { amount: "250", reference: "" }), type: e.target.value } }))}>
                      <option value="WEEKLY_SAVINGS">Weekly savings</option>
                      <option value="WELFARE_KITTY">Monthly welfare kitty</option>
                      <option value="SHARE_CAPITAL">Share capital</option>
                      <option value="REGISTRATION">Registration fee</option>
                      <option value="FINE_PAYMENT">Fine payment</option>
                    </select>
                    <input className="rounded-lg border border-ink-200 px-3 py-2 text-sm" inputMode="numeric" placeholder="Amount" value={collectionByMeeting[meeting.id]?.amount ?? "250"} onChange={(e) => setCollectionByMeeting((state) => ({ ...state, [meeting.id]: { ...(state[meeting.id] ?? { type: "WEEKLY_SAVINGS", reference: "" }), amount: e.target.value } }))} />
                    <input className="rounded-lg border border-ink-200 px-3 py-2 text-sm" placeholder="Payment reference" value={collectionByMeeting[meeting.id]?.reference ?? ""} onChange={(e) => setCollectionByMeeting((state) => ({ ...state, [meeting.id]: { ...(state[meeting.id] ?? { type: "WEEKLY_SAVINGS", amount: "250" }), reference: e.target.value } }))} />
                    <Button size="sm" icon={<FiSend />} disabled={meeting.status === "CLOSED" || !!busy} onClick={() => void collect(meeting)}>Collect</Button>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">Loanable: share capital + weekly savings</div>
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Welfare kitty is restricted</div>
                    <div className="rounded-lg bg-ink-50 px-3 py-2 text-xs font-semibold text-ink-700">Receipts and duplicate references enforced by API</div>
                  </div>
                </div>

                <div className="rounded-xl border border-ink-100 bg-ink-900 p-4 text-white">
                  <p className="text-xs font-extrabold uppercase text-white/60">Close Checklist</p>
                  <div className="mt-3 space-y-2 text-sm">
                    {["Notice sent", "Attendance captured", "Collections reviewed", "Loan pool calculated", "Minutes and resolutions ready"].map((step) => <div key={step} className="flex items-center gap-2"><FiCheckCircle className="text-emerald-300" /><span>{step}</span></div>)}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="secondary" icon={<FiDownload />} onClick={() => void downloadReport("meeting-close", "pdf")}>PDF</Button>
                    <Button size="sm" variant="secondary" icon={<FiDownload />} onClick={() => void downloadReport("meeting-collections", "csv")}>CSV</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ApprovalsPage() {
  const { data, loading, error, reload } = useLoad(async () => {
    const res = await api.get("/approvals/inbox", { params: { page: 1, pageSize: 50 } });
    return res.data.data ?? [];
  }, []);
  const [busy, setBusy] = useState("");
  const decide = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setBusy(id);
    try {
      await api.post(`/approvals/${id}/decision`, { decision, comments: `${decision.toLowerCase()} from inbox` });
      await reload();
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Approval Inbox" subtitle="Role-filtered approvals with self-approval and conflict controls enforced by the API." action={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void reload()}>Refresh</Button>} />
      <StateBlock loading={loading} error={error} empty={!loading && !data?.length} />
      {data?.length ? (
        <div className="grid gap-3">
          {data.map((a: any) => (
            <Card key={a.id} className="p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2"><h3 className="font-extrabold text-ink-900">{a.entityType}</h3><Badge tone={tone(a.status)}>{a.status}</Badge></div>
                  <p className="mt-1 text-sm text-ink-500">{a.entityId}</p>
                  <p className="mt-2 text-xs font-semibold text-ink-500">Required: {a.requiredApprovers?.join(", ")}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" icon={<FiCheckCircle />} disabled={busy === a.id} onClick={() => void decide(a.id, "APPROVED")}>Approve</Button>
                  <Button variant="danger" icon={<FiXCircle />} disabled={busy === a.id} onClick={() => void decide(a.id, "REJECTED")}>Reject</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ReportsPage() {
  const { data, loading, error, reload } = useLoad(async () => {
    const [executive, funds, aging, trial, collections] = await Promise.all([
      api.get("/reports/executive"),
      api.get("/reports/fund-balances"),
      api.get("/reports/loan-aging"),
      api.get("/reports/trial-balance"),
      api.get("/reports/meeting-collections"),
    ]);
    return { executive: executive.data.data, funds: funds.data.data ?? [], aging: aging.data.data ?? [], trial: trial.data.data, collections: collections.data.data };
  }, []);
  const metrics = useMemo(() => data?.executive ? Object.entries(data.executive).slice(0, 10) : [], [data]);
  const [exporting, setExporting] = useState("");
  const runExport = async (key: string, format: "pdf" | "csv") => {
    setExporting(`${key}-${format}`);
    try {
      await downloadReport(key, format);
    } finally {
      setExporting("");
    }
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Reports and Audit Readiness" subtitle="Ledger-derived dashboards, fund balances, trial balance, loan aging, meeting collections, and audit-pack source data." action={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void reload()}>Refresh</Button>} />
      <StateBlock loading={loading} error={error} />
      {data ? (
        <>
          <div className="grid gap-3 md:grid-cols-5">
            {metrics.map(([key, value]) => <StatCard key={key} label={key} value={typeof value === "number" ? money(value) : String(value)} />)}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-5 xl:col-span-2">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-extrabold text-ink-900">Export Center</h3>
                  <p className="text-sm text-ink-500">PDF and CSV exports are generated through RBAC-protected report endpoints and audit-logged.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["fund-balances", "trial-balance", "meeting-collections", "loan-aging", "audit-pack", "year-end-allocation"].map((key) => (
                    <div key={key} className="flex overflow-hidden rounded-lg border border-ink-200 bg-white">
                      <button className="px-3 py-2 text-xs font-bold text-ink-700" onClick={() => void runExport(key, "pdf")} disabled={!!exporting}>{key}</button>
                      <button className="border-l border-ink-200 px-3 py-2 text-xs font-bold text-brand-700" onClick={() => void runExport(key, "csv")} disabled={!!exporting}>CSV</button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-extrabold text-ink-900">Fund Balances</h3><Badge tone="success">{data.funds.length} funds</Badge></div>
              <div className="space-y-2">
                {data.funds.map((fund: any) => <div key={fund.code} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm"><span className="font-semibold">{fund.fund}</span><span>{money(fund.balance)}</span></div>)}
              </div>
            </Card>
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-extrabold text-ink-900">Trial Balance</h3><Badge tone={data.trial.balanced ? "success" : "danger"}>{data.trial.balanced ? "Balanced" : "Out of balance"}</Badge></div>
              <div className="grid gap-3 md:grid-cols-2">
                <StatCard label="Debits" value={money(data.trial.totalDebits)} />
                <StatCard label="Credits" value={money(data.trial.totalCredits)} />
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 font-extrabold text-ink-900">Loan Aging</h3>
              <div className="space-y-2">{data.aging.slice(0, 8).map((loan: any) => <div key={loan.loanNumber} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm"><span>{loan.loanNumber} - {loan.member}</span><Badge tone={tone(loan.status)}>{loan.agingBucket}</Badge></div>)}</div>
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 font-extrabold text-ink-900">Meeting Collections</h3>
              <div className="space-y-2">{Object.entries(data.collections.totals ?? {}).map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm"><span>{key}</span><span className="font-bold">{money(value)}</span></div>)}</div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function LoansPage() {
  return null;
}
