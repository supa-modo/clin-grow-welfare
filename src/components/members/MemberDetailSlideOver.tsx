import { useState } from "react";
import { TbUser } from "react-icons/tb";
import { DependantsPanel } from "@/components/members/DependantsPanel";
import {
  DetailField,
  formatDate,
  membershipStatusBadgeTone,
  money,
  statusLabel,
} from "@/components/members/memberUi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import SlideOver from "@/components/ui/SlideOver";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import type { Member } from "@/types/member";

type DetailTab = "overview" | "welfare" | "admin" | "dependants";

const selectedFinancialCards = [
  ["Shares balance", 0, "Phase 3 ledger-ready"],
  ["Kitty contributions", 0, "Phase 4 source"],
  ["Monthly contributions", 0, "Phase 4 source"],
  ["Outstanding loans", 0, "Phase 5 source"],
  ["Loan balance", 0, "Phase 5 source"],
  ["Last payment date", "-", "Pending contribution history"],
] as const;

export type MemberDetailSlideOverProps = {
  open: boolean;
  member: Member | null;
  busy?: boolean;
  canUpdate?: boolean;
  canApprove?: boolean;
  onClose: () => void;
  onEdit: (member: Member) => void;
  onApprove: (member: Member) => void;
  onSuspend: (member: Member) => void;
  onActivate: (member: Member) => void;
  onExpel: (member: Member) => void;
  onToggleRegistration: (member: Member, paid: boolean) => void;
};

export function MemberDetailSlideOver({
  open,
  member,
  busy,
  canUpdate,
  canApprove,
  onClose,
  onEdit,
  onApprove,
  onSuspend,
  onActivate,
  onExpel,
  onToggleRegistration,
}: MemberDetailSlideOverProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  if (!member) return null;

  const tabs = [
    { value: "overview" as const, label: "Overview" },
    { value: "welfare" as const, label: "Welfare account" },
    { value: "admin" as const, label: "Records" },
    { value: "dependants" as const, label: "Dependants" },
  ];

  const terminal = ["WITHDRAWN", "EXPELLED", "DECEASED"].includes(member.status);

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={member.name}
      subtitle={
        member.email ?? member.phone ?? member.membershipNumber
      }
      widthClass="max-w-3xl"
      headerRight={
        canUpdate && !terminal ? (
          <Button variant="outline" size="sm" onClick={() => onEdit(member)}>
            Edit
          </Button>
        ) : null
      }
      footer={
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs font-medium text-gray-500">
            Status and payment changes require confirmation before saving.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {canUpdate && !terminal ? (
              <Button variant="outline" size="sm" onClick={() => onEdit(member)}>
                Edit member
              </Button>
            ) : null}
            {member.status === "PENDING" && canApprove ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onApprove(member)}
                disabled={busy}
              >
                Approve member
              </Button>
            ) : null}
            {canUpdate && member.status === "ACTIVE" ? (
              <Button
                variant="red"
                size="sm"
                onClick={() => onSuspend(member)}
                disabled={busy}
              >
                Suspend
              </Button>
            ) : null}
            {canUpdate && member.status === "SUSPENDED" ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onActivate(member)}
                disabled={busy}
              >
                Activate
              </Button>
            ) : null}
            {canUpdate &&
            !["PENDING", "EXPELLED", "WITHDRAWN", "DECEASED"].includes(
              member.status,
            ) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExpel(member)}
                disabled={busy}
              >
                Expel
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="mb-5 rounded-2xl border border-secondary-600 bg-gray-50/60 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white text-gray-400">
              <TbUser className="h-10 w-10" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold leading-tight text-secondary-700">
                {member.name}
              </h3>
              <p className="mt-1 font-mono text-[0.78rem] text-gray-500">
                {member.membershipNumber}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={membershipStatusBadgeTone[member.status]}>
                  {statusLabel(member.status)}
                </Badge>
                <Badge tone={member.registrationFeePaid ? "success" : "warning"}>
                  {member.registrationFeePaid ? "Reg. paid" : "Reg. pending"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SegmentedTabs
        tabs={tabs}
        value={activeTab}
        onChange={(next) => setActiveTab(next as DetailTab)}
        className="mb-5"
      />

      {activeTab === "overview" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <DetailField label="Phone" value={member.phone} />
          <DetailField label="Email" value={member.email} />
          <DetailField label="ID / Passport" value={member.idNumber} />
          <DetailField label="Joined" value={formatDate(member.dateJoined)} />
        </div>
      ) : null}

      {activeTab === "welfare" ? (
        <div className="space-y-4">
          {canUpdate ? (
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <span className="text-sm font-semibold text-gray-600">
                Registration paid
              </span>
              <ToggleSwitch
                checked={member.registrationFeePaid}
                onChange={() =>
                  onToggleRegistration(member, !member.registrationFeePaid)
                }
                variant="success"
                disabled={busy}
              />
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {selectedFinancialCards.map(([label, value, note]) => (
              <div
                key={label}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {label}
                </p>
                <p className="mt-2 text-xl font-extrabold text-gray-900">
                  {typeof value === "number" ? money(value) : value}
                </p>
                <p className="mt-1 text-xs text-gray-500">{note}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "admin" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Member record
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Approval, onboarding, and primary beneficiary details in one
                  place.
                </p>
              </div>
              <Badge tone={member.approvedAt ? "success" : "warning"}>
                {member.approvedAt ? "Approved" : "Awaiting approval"}
              </Badge>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <DetailField
                label="Approved date"
                value={formatDate(member.approvedAt)}
              />
              <DetailField label="Approved by" value={member.approvedBy} />
              <DetailField
                label="Introduced by"
                value={member.introducedBy?.name}
              />
              <DetailField
                label="Last updated"
                value={formatDate(member.updatedAt)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Primary beneficiary
                </p>
                <p className="mt-2 text-base font-extrabold text-gray-900">
                  {member.beneficiaryName || "-"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {member.beneficiaryRelationship || "Relationship not set"}
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-700">
                  {member.beneficiaryPhone || "-"}
                </p>
                <p className="mt-3 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                  100% primary allocation
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <DetailField
                  label="Notes"
                  value={member.nonComplianceReasons}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "dependants" ? (
        <DependantsPanel
          memberId={member.id}
          scope="admin"
          canVerify={canUpdate}
        />
      ) : null}
    </SlideOver>
  );
}

export default MemberDetailSlideOver;
