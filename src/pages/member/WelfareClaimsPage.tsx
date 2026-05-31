import { useEffect, useState } from "react";
import { FiSend } from "react-icons/fi";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuthStore } from "@/store/auth";

function money(value: unknown) {
  return `KES ${Number(value ?? 0).toLocaleString()}`;
}

export function MemberWelfareClaimsPage() {
  const user = useAuthStore((s) => s.user);
  const [types, setTypes] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [claimTypeId, setClaimTypeId] = useState("");
  const [amountRequested, setAmountRequested] = useState(5000);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const [typesRes, claimsRes] = await Promise.all([api.get("/welfare/types"), api.get("/welfare/member/me")]);
    setTypes(typesRes.data.types ?? []);
    setClaims(claimsRes.data.data ?? []);
    if (!claimTypeId && typesRes.data.types?.[0]) setClaimTypeId(typesRes.data.types[0].id);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    setMessage("");
    try {
      await api.post("/welfare", { memberId: user?.memberId, claimTypeId, amountRequested, reason });
      setReason("");
      await load();
      setMessage("Claim submitted for Management Committee review.");
    } catch (err: any) {
      setMessage(err.response?.data?.error ?? "Claim submission failed.");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Welfare Claims" subtitle="Submit and track your constitution-backed welfare support requests." />
      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_160px]">
          <select className="rounded-lg border border-ink-200 px-3 py-2 text-sm" value={claimTypeId} onChange={(e) => setClaimTypeId(e.target.value)}>
            {types.map((type) => <option key={type.id} value={type.id}>{type.name} {type.maxAmount ? `- ${money(type.maxAmount)}` : "- meeting-approved"}</option>)}
          </select>
          <input className="rounded-lg border border-ink-200 px-3 py-2 text-sm" type="number" value={amountRequested} onChange={(e) => setAmountRequested(Number(e.target.value))} />
          <textarea className="md:col-span-2 rounded-lg border border-ink-200 px-3 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason and supporting context" rows={3} />
          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink-500">{message}</p>
            <Button icon={<FiSend />} onClick={() => void submit()}>Submit Claim</Button>
          </div>
        </div>
      </Card>
      <div className="grid gap-3">
        {claims.map((claim) => (
          <Card key={claim.id} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-extrabold text-ink-900">{claim.claimNumber}</p>
                <p className="text-sm text-ink-500">{claim.claimType?.name} • {money(claim.amountRequested)}</p>
              </div>
              <Badge tone={claim.status === "PAID" ? "success" : claim.status === "REJECTED" ? "danger" : "warning"}>{claim.status}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
