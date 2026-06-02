import { useEffect, useState } from "react";
import { FiSend } from "react-icons/fi";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner, EmptyState } from "@/components/ui/Feedback";
import {
  MemberHero,
  MemberSection,
  SetupState,
  money,
} from "@/components/member/MemberCards";
import { memberPortalApi } from "@/services/memberApi";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/uiStore";

type WelfareType = {
  id: string;
  name: string;
  maxAmount?: number | null;
};

type WelfareClaim = {
  id: string;
  claimNumber: string;
  status: string;
  amountRequested: number;
  claimType?: { name: string };
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

const CLAIM_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> =
  {
    PAID: "success",
    REJECTED: "danger",
    APPROVED: "success",
    SUBMITTED: "warning",
    UNDER_REVIEW: "warning",
  };

export function MemberWelfareClaimsPage() {
  const user = useAuthStore((s) => s.user);
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const [types, setTypes] = useState<WelfareType[]>([]);
  const [claims, setClaims] = useState<WelfareClaim[]>([]);
  const [hero, setHero] = useState({
    firstName: "Member",
    membershipNumber: "",
    status: "ACTIVE",
    registrationFeePaid: true,
  });
  const [claimTypeId, setClaimTypeId] = useState("");
  const [amountRequested, setAmountRequested] = useState(5000);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const [typesRes, claimsRes, dash] = await Promise.all([
      api.get<{ types: WelfareType[] }>("/welfare/types"),
      api.get<{ data: WelfareClaim[] }>("/welfare/member/me"),
      memberPortalApi.dashboard().catch(() => null),
    ]);
    const typeList = typesRes.data.types ?? [];
    setTypes(typeList);
    setClaims(claimsRes.data.data ?? []);
    if (!claimTypeId && typeList[0]) setClaimTypeId(typeList[0].id);
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
      .catch(() => toastError("Could not load welfare claims"))
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!claimTypeId) {
      toastError("Select a claim type");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/welfare", {
        memberId: user?.memberId,
        claimTypeId,
        amountRequested,
        reason,
      });
      setReason("");
      await load();
      toastSuccess(
        "Claim submitted",
        "Your request was sent for Management Committee review.",
      );
    } catch (e: unknown) {
      toastError("Submission failed", getApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SetupState
        loading
        title="Loading welfare"
        message="Fetching claim types and your submission history…"
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
        subtitle="Submit and track constitution-backed welfare support requests."
      />

      <PageHeader
        title="Welfare claims"
        subtitle="Apply for welfare benefits within published limits"
      />

      <MemberSection
        title="New claim"
        description="Provide accurate details for committee review"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_160px]">
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={claimTypeId}
            onChange={(e) => setClaimTypeId(e.target.value)}
          >
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}{" "}
                {type.maxAmount
                  ? `— max ${money(type.maxAmount)}`
                  : "— meeting-approved"}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            type="number"
            value={amountRequested}
            onChange={(e) => setAmountRequested(Number(e.target.value))}
            min={0}
          />
          <textarea
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason and supporting context"
            rows={3}
          />
          <div className="flex justify-end md:col-span-2">
            <Button
              icon={submitting ? <Spinner /> : <FiSend />}
              disabled={submitting}
              onClick={() => void submit()}
            >
              Submit claim
            </Button>
          </div>
        </div>
      </MemberSection>

      <MemberSection
        title="Your claims"
        description="Track status of submitted welfare requests"
      >
        {claims.length === 0 ? (
          <EmptyState
            title="No claims yet"
            message="Submitted welfare claims will appear here with their review status."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {claims.map((claim) => (
              <li
                key={claim.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
              >
                <div>
                  <p className="font-bold text-slate-900">{claim.claimNumber}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {claim.claimType?.name ?? "Welfare"} ·{" "}
                    {money(claim.amountRequested)}
                  </p>
                </div>
                <Badge tone={CLAIM_TONE[claim.status] ?? "neutral"}>
                  {claim.status.replace(/_/g, " ")}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </MemberSection>
    </div>
  );
}

export default MemberWelfareClaimsPage;
