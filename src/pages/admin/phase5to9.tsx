import { useEffect, useState } from "react";
import { api } from "@/services/api";

export function LoansPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [memberId, setMemberId] = useState("");
  const [requestedAmount, setRequestedAmount] = useState(1000);
  const load = async () => {
    const { data } = await api.get("/loans", {
      params: { page: 1, pageSize: 20 },
    });
    setRows(data.data ?? []);
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-2">Loan Application (MVP)</h2>
        <div className="grid md:grid-cols-3 gap-2">
          <input
            className="border rounded px-2 py-2"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            placeholder="Member ID"
          />
          <input
            className="border rounded px-2 py-2"
            type="number"
            value={requestedAmount}
            onChange={(e) => setRequestedAmount(Number(e.target.value))}
          />
          <button
            className="bg-sky-600 text-white rounded"
            onClick={async () => {
              await api.post("/loans", { memberId, requestedAmount });
              await load();
            }}
          >
            Apply
          </button>
        </div>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Loans</h3>
        <ul className="text-sm space-y-1">
          {rows.map((r) => (
            <li key={r.id}>
              {r.loanNumber} - {r.member?.name} - {r.status} -{" "}
              {r.requestedAmount}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function WelfarePage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [memberId, setMemberId] = useState("");
  const [claimTypeId, setClaimTypeId] = useState("");
  const [amountRequested, setAmountRequested] = useState(1000);
  const load = async () => {
    const [c, t] = await Promise.all([
      api.get("/welfare", { params: { page: 1, pageSize: 20 } }),
      api.get("/welfare/types"),
    ]);
    setClaims(c.data.data ?? []);
    setTypes(t.data.types ?? []);
    if (!claimTypeId && (t.data.types?.length ?? 0) > 0)
      setClaimTypeId(t.data.types[0].id);
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-2">Submit Welfare Claim</h2>
        <div className="grid md:grid-cols-4 gap-2">
          <input
            className="border rounded px-2 py-2"
            placeholder="Member ID"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          />
          <select
            className="border rounded px-2 py-2"
            value={claimTypeId}
            onChange={(e) => setClaimTypeId(e.target.value)}
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            className="border rounded px-2 py-2"
            type="number"
            value={amountRequested}
            onChange={(e) => setAmountRequested(Number(e.target.value))}
          />
          <button
            className="bg-sky-600 text-white rounded"
            onClick={async () => {
              await api.post("/welfare", {
                memberId,
                claimTypeId,
                amountRequested,
              });
              await load();
            }}
          >
            Submit
          </button>
        </div>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Claims</h3>
        <ul className="text-sm space-y-1">
          {claims.map((c) => (
            <li key={c.id}>
              {c.claimNumber} - {c.member?.name} - {c.status} -{" "}
              {c.amountRequested}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function MeetingsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [meetingType, setMeetingType] = useState("ORDINARY");
  const load = async () => {
    const { data } = await api.get("/meetings", {
      params: { page: 1, pageSize: 20 },
    });
    setRows(data.data ?? []);
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-2">Create Meeting</h2>
        <div className="grid md:grid-cols-3 gap-2">
          <select
            className="border rounded px-2 py-2"
            value={meetingType}
            onChange={(e) => setMeetingType(e.target.value)}
          >
            <option>ORDINARY</option>
            <option>AGM</option>
            <option>SPECIAL_GENERAL</option>
            <option>MANAGEMENT_COMMITTEE</option>
          </select>
          <input
            className="border rounded px-2 py-2"
            type="datetime-local"
            id="mdate"
          />
          <button
            className="bg-sky-600 text-white rounded"
            onClick={async () => {
              const d = (document.getElementById("mdate") as HTMLInputElement)
                .value;
              await api.post("/meetings", {
                meetingType,
                meetingDate: new Date(d).toISOString(),
              });
              await load();
            }}
          >
            Create
          </button>
        </div>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Meetings</h3>
        <ul className="text-sm space-y-1">
          {rows.map((m) => (
            <li key={m.id}>
              {m.meetingNumber} - {m.meetingType} - {m.status}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ApprovalsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    const { data } = await api.get("/approvals/inbox", {
      params: { page: 1, pageSize: 20 },
    });
    setRows(data.data ?? []);
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="font-semibold mb-3">Approval Inbox</h2>
      <ul className="text-sm space-y-2">
        {rows.map((a) => (
          <li key={a.id} className="flex items-center justify-between">
            <span>
              {a.entityType} - {a.entityId} - {a.status}
            </span>
            <div className="space-x-2">
              <button
                className="px-2 py-1 border rounded"
                onClick={async () => {
                  await api.post(`/approvals/${a.id}/decision`, {
                    decision: "APPROVED",
                  });
                  await load();
                }}
              >
                Approve
              </button>
              <button
                className="px-2 py-1 border rounded"
                onClick={async () => {
                  await api.post(`/approvals/${a.id}/decision`, {
                    decision: "REJECTED",
                  });
                  await load();
                }}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportsPage() {
  const [executive, setExecutive] = useState<any>(null);
  const [funds, setFunds] = useState<any[]>([]);
  const [aging, setAging] = useState<any[]>([]);
  useEffect(() => {
    void Promise.all([
      api.get("/reports/executive"),
      api.get("/reports/fund-balances"),
      api.get("/reports/loan-aging"),
    ]).then(([e, f, a]) => {
      setExecutive(e.data.data);
      setFunds(f.data.data ?? []);
      setAging(a.data.data ?? []);
    });
  }, []);
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-5 gap-3">
        {executive &&
          Object.entries(executive).map(([k, v]) => (
            <div key={k} className="bg-white p-4 rounded shadow">
              <p className="text-xs text-slate-500">{k}</p>
              <p className="text-xl font-bold">{String(v)}</p>
            </div>
          ))}
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Fund Balances</h3>
        <ul className="text-sm">
          {funds.map((f) => (
            <li key={f.code}>
              {f.fund}: {f.balance}
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Loan Aging</h3>
        <ul className="text-sm">
          {aging.map((l, idx) => (
            <li key={idx}>
              {l.loanNumber} - {l.member} - {l.agingBucket} -{" "}
              {l.principalBalance}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
