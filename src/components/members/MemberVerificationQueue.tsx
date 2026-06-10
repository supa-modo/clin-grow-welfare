import { useCallback, useEffect, useState } from "react";
import { FiCheckCircle, FiUser } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { memberApi, type BeneficiaryChangeRequest } from "@/services/memberApi";
import type { MemberDependant } from "@/types/member";
import { useUiStore } from "@/store/uiStore";
import { PiUserDuotone } from "react-icons/pi";
import { TbArrowRight } from "react-icons/tb";

type PendingDependant = MemberDependant & {
  member: { id: string; name: string; membershipNumber: string };
};

type Props = {
  canReview: boolean;
  onOpenMember: (memberId: string) => void;
};

export function MemberVerificationQueue({ canReview, onOpenMember }: Props) {
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const [dependants, setDependants] = useState<PendingDependant[]>([]);
  const [beneficiaryRequests, setBeneficiaryRequests] = useState<
    BeneficiaryChangeRequest[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    if (!canReview) return;
    setLoading(true);
    try {
      const [deps, requests] = await Promise.all([
        memberApi.pendingDependants(),
        memberApi.beneficiaryChangeRequests("PENDING"),
      ]);
      setDependants(deps);
      setBeneficiaryRequests(requests);
    } finally {
      setLoading(false);
    }
  }, [canReview]);

  useEffect(() => {
    void load();
  }, [load]);

  const approveBeneficiary = async (requestId: string) => {
    setBusy(`approve-${requestId}`);
    try {
      await memberApi.approveBeneficiaryChange(requestId);
      toastSuccess(
        "Beneficiary approved",
        "Member beneficiary details are now live.",
      );
      await load();
    } catch (e: unknown) {
      toastError(
        "Approval failed",
        e instanceof Error ? e.message : "Could not approve request.",
      );
    } finally {
      setBusy("");
    }
  };

  const rejectBeneficiary = async (requestId: string) => {
    setBusy(`reject-${requestId}`);
    try {
      await memberApi.rejectBeneficiaryChange(
        requestId,
        "Details could not be verified",
      );
      toastSuccess(
        "Request rejected",
        "The member can submit a corrected request.",
      );
      await load();
    } catch (e: unknown) {
      toastError(
        "Rejection failed",
        e instanceof Error ? e.message : "Could not reject request.",
      );
    } finally {
      setBusy("");
    }
  };

  if (!canReview) return null;
  if (loading) {
    return (
      <Card
        className="animate-pulse border-amber-100 bg-amber-50/50 p-4"
        aria-busy
      >
        <div className="h-5 w-56 rounded bg-slate-200" />
        <div className="mt-2 h-4 w-72 max-w-full rounded bg-slate-100" />
        <div className="mt-4 space-y-3">
          <div className="h-20 rounded-xl border border-amber-100 bg-white" />
          <div className="h-20 rounded-xl border border-amber-100 bg-white" />
        </div>
      </Card>
    );
  }
  if (!dependants.length && !beneficiaryRequests.length) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/80 p-4">
      <p className="font-bold text-[0.8rem] lg:text-[0.9rem] text-amber-950">
        Pending member verifications
      </p>
      <p className="mt-1 text-[0.75rem] lg:text-[0.85rem] text-amber-900">
        {`${dependants.length} dependant${dependants.length > 1 ? "s" : ""} and ${beneficiaryRequests.length} beneficiary change${beneficiaryRequests.length > 1 ? "s" : ""} awaiting review.`}
      </p>
      <div className="mt-4 space-y-3">
        {beneficiaryRequests.map((req) => (
          <div
            key={req.id}
            className="border-b border-gray-300 bg-white py-3 last:border-b-0"
          >
            
            <p className="font-semibold text-ink-900">
              {req.member?.name} ({req.member?.membershipNumber})
            </p>
            <p className="mt-1 text-sm text-ink-600">
              Proposed: {req.proposedName} · {req.proposedRelationship}
              {req.proposedPhone ? ` · ${req.proposedPhone}` : ""}
            </p>
            {req.note ? (
              <p className="mt-1 text-xs text-ink-500">Note: {req.note}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="xs"
                variant="secondary"
                icon={<PiUserDuotone className="size-4" />}
                onClick={() => req.member && onOpenMember(req.member.id)}
                className=""
              >
                <span className="">Open member</span>
                <TbArrowRight className="size-3.5" />
              </Button>
              <Button
                size="xs"
                icon={<FiCheckCircle />}
                disabled={!!busy}
                onClick={() => void approveBeneficiary(req.id)}
              >
                Approve
              </Button>
              <Button
                size="xs"
                variant="danger"
                disabled={!!busy}
                onClick={() => void rejectBeneficiary(req.id)}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
        {dependants.slice(0, 8).map((dep) => (
          <div
            key={dep.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-white px-3 py-2"
          >
            <div>
              <p className="font-semibold text-ink-900">{dep.fullName}</p>
              <p className="text-xs text-ink-500">
                {dep.member.membershipNumber} · {dep.member.name} ·{" "}
                {dep.documents?.length
                  ? `${dep.documents.length} doc(s)`
                  : "no documents"}
              </p>
            </div>
            <Button
              size="xs"
              variant="secondary"
              onClick={() => onOpenMember(dep.member.id)}
            >
              Review
            </Button>
          </div>
        ))}
        {dependants.length > 8 ? (
          <p className="text-xs font-semibold text-ink-500">
            +{dependants.length - 8} more dependants pending
          </p>
        ) : null}
      </div>
    </Card>
  );
}
