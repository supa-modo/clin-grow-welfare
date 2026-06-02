import type { ReactNode } from "react";
import type { MembershipStatus } from "@/types/member";

export function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function money(value: number) {
  return `KES ${value.toLocaleString()}`;
}

export function statusLabel(status: MembershipStatus) {
  return status.replace("_", " ");
}

export const membershipStatusBadgeTone: Record<
  MembershipStatus,
  "success" | "warning" | "danger" | "neutral" | "gray2"
> = {
  ACTIVE: "success",
  PENDING: "warning",
  NON_COMPLIANT: "warning",
  SUSPENDED: "danger",
  WITHDRAWN: "gray2",
  EXPELLED: "danger",
  DECEASED: "neutral",
};

export function DetailField({
  label,
  value,
}: {
  label: string;
  value?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <div className="mt-1 text-sm font-semibold text-gray-800">
        {value || "-"}
      </div>
    </div>
  );
}
