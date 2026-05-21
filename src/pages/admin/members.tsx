import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  FiCheckCircle,
  FiDownload,
  FiEdit3,
  FiEye,
  FiRefreshCw,
  FiShield,
  FiUserPlus,
} from "react-icons/fi";
import {
  TbCircleDashed,
  TbCreditCard,
  TbUserCancel,
  TbUserCheck,
  TbUsers,
} from "react-icons/tb";

import { MemberFormModal } from "@/components/members/MemberFormModal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState, Spinner } from "@/components/ui/Feedback";
import MultiFilterDropdown, {
  type MultiFilterValue,
} from "@/components/ui/MultiFilterDropdown";
import { NotificationModal } from "@/components/ui/NotificationModal";
import { SearchBar } from "@/components/ui/SearchBar";
import Select from "@/components/ui/Select";
import SlideOver from "@/components/ui/SlideOver";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { memberApi, type MemberFilters } from "@/services/memberApi";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/uiStore";
import type {
  Member,
  MemberFormValues,
  MembershipStatus,
} from "@/types/member";
import { StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const statusOptions: Array<{ value: MembershipStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending approval" },
  { value: "ACTIVE", label: "Active" },
  { value: "NON_COMPLIANT", label: "Non-compliant" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "EXPELLED", label: "Expelled" },
  { value: "DECEASED", label: "Deceased" },
];

const statusStyles: Record<MembershipStatus, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  NON_COMPLIANT: "border-orange-200 bg-orange-50 text-orange-700",
  SUSPENDED: "border-red-200 bg-red-50 text-red-700",
  WITHDRAWN: "border-slate-200 bg-slate-100 text-slate-700",
  EXPELLED: "border-zinc-300 bg-zinc-100 text-zinc-800",
  DECEASED: "border-violet-200 bg-violet-50 text-violet-700",
};

type ConfirmationAction =
  | { kind: "approve"; member: Member }
  | {
      kind: "status";
      member: Member;
      status: MembershipStatus;
      title: string;
      message: string;
      confirmText: string;
      reason?: string;
    }
  | { kind: "registration"; member: Member; paid: boolean };

function has(permission: string, permissions: string[]) {
  return permissions.includes(permission);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function money(value: number) {
  return `KES ${value.toLocaleString()}`;
}

function statusLabel(status: MembershipStatus) {
  return status.replace("_", " ");
}

function StatusBadge({ status }: { status: MembershipStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold capitalize",
        statusStyles[status],
      )}
    >
      {statusLabel(status).toLowerCase()}
    </span>
  );
}

function PaymentBadge({ paid }: { paid: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold",
        paid
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700",
      )}
    >
      {paid ? "Paid" : "Pending"}
    </span>
  );
}

function getApiError(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (
      error as { response?: { data?: { message?: string; error?: string } } }
    ).response;
    return (
      response?.data?.message ??
      response?.data?.error ??
      "Member action failed."
    );
  }
  return "Member action failed.";
}

function compactMember(member: Member) {
  return {
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email ?? "",
    phone: member.phone ?? "",
    idNumber: member.idNumber ?? "",
    dateJoined: member.dateJoined?.slice(0, 10),
    introducedByMemberId: member.introducedByMemberId ?? "",
    registrationFeePaid: member.registrationFeePaid,
    beneficiaryName: member.beneficiaryName,
    beneficiaryPhone: member.beneficiaryPhone,
    beneficiaryRelationship: member.beneficiaryRelationship,
  };
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-3 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400">
        {label}
      </p>
      <div className="mt-1 text-sm font-bold text-ink-800">{value || "-"}</div>
    </div>
  );
}

export function MembersPage() {
  const user = useAuthStore((s) => s.user);
  const addToast = useUiStore((s) => s.addToast);
  const permissions = user?.permissions ?? [];

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [meta, setMeta] = useState<{
    page: number;
    totalPages: number;
    total: number;
    hasPrev: boolean;
    hasNext: boolean;
  } | null>(null);
  const [filters, setFilters] = useState<MemberFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    status: "",
    complianceStatus: "",
  });
  const [filterValue, setFilterValue] = useState<MultiFilterValue>({
    registration: [],
    compliance: [],
  });
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationAction | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const canCreate = has("officialsPortal.members.create", permissions);
  const canUpdate = has("officialsPortal.members.update", permissions);
  const canApprove = has("officialsPortal.members.approve", permissions);

  const load = async (next: MemberFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const data = await memberApi.list(next);
      setMembers(data.data ?? data.members ?? []);
      setMeta(data.meta);
      setSelectedMember((current) => {
        if (!current) return current;
        return (
          (data.data ?? data.members ?? []).find(
            (member) => member.id === current.id,
          ) ?? current
        );
      });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredMembers = useMemo(() => {
    const registration = filterValue.registration?.[0] ?? "";
    const compliance = filterValue.compliance?.[0] ?? "";
    return members.filter((member) => {
      if (registration === "PAID" && !member.registrationFeePaid) return false;
      if (registration === "PENDING" && member.registrationFeePaid)
        return false;
      if (
        compliance === "ACTION_REQUIRED" &&
        member.status === "ACTIVE" &&
        member.registrationFeePaid
      )
        return false;
      if (
        compliance === "READY" &&
        (member.status !== "ACTIVE" || !member.registrationFeePaid)
      )
        return false;
      return true;
    });
  }, [filterValue, members]);

  const counts = useMemo(() => {
    const all = members;
    return {
      total: meta?.total ?? all.length,
      active: all.filter((member) => member.status === "ACTIVE").length,
      pending: all.filter((member) => member.status === "PENDING").length,
      suspended: all.filter((member) => member.status === "SUSPENDED").length,
      inactive: all.filter((member) =>
        ["WITHDRAWN", "EXPELLED", "DECEASED"].includes(member.status),
      ).length,
      paid: all.filter((member) => member.registrationFeePaid).length,
      unpaid: all.filter((member) => !member.registrationFeePaid).length,
    };
  }, [members, meta]);

  const openCreate = () => {
    setFormMode("create");
    setEditingMember(null);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (member: Member) => {
    setFormMode("edit");
    setEditingMember(member);
    setFormError("");
    setFormOpen(true);
  };

  const saveMember = async (values: MemberFormValues) => {
    setBusy(true);
    setFormError("");
    try {
      if (formMode === "edit" && editingMember) {
        const member = await memberApi.update(editingMember.id, values);
        setSelectedMember(member);
        addToast({
          id: crypto.randomUUID(),
          title: "Member updated",
          message: `${member.name} has been updated.`,
          tone: "success",
        });
      } else {
        const member = await memberApi.create(values);
        addToast({
          id: crypto.randomUUID(),
          title: "Member created",
          message: `${member.name} is pending approval.`,
          tone: "success",
        });
      }
      setFormOpen(false);
      await load({ ...filters, page: 1 });
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const runConfirmedAction = async (action: ConfirmationAction) => {
    setBusy(true);
    try {
      let member: Member;
      if (action.kind === "approve") {
        member = await memberApi.approve(action.member.id);
      } else if (action.kind === "registration") {
        member = await memberApi.update(action.member.id, {
          ...compactMember(action.member),
          registrationFeePaid: action.paid,
        });
      } else {
        member = await memberApi.status(
          action.member.id,
          action.status,
          action.reason ?? `Status changed to ${action.status}`,
        );
      }
      setSelectedMember(member);
      addToast({
        id: crypto.randomUUID(),
        title: "Member updated",
        message: `${member.name} is now ${statusLabel(member.status).toLowerCase()}.`,
        tone: "success",
      });
      await load(filters);
    } catch (err) {
      addToast({
        id: crypto.randomUUID(),
        title: "Action failed",
        message: getApiError(err),
        tone: "error",
        durationMs: 6000,
      });
    } finally {
      setBusy(false);
    }
  };

  const resetFilters = () => {
    const next: MemberFilters = {
      page: 1,
      pageSize: 20,
      search: "",
      status: "",
      complianceStatus: "",
    };
    setFilters(next);
    setFilterValue({ registration: [], compliance: [] });
    void load(next);
  };

  const exportMembers = () => {
    const header = [
      "No",
      "Member number",
      "Name",
      "Phone",
      "Email",
      "Status",
      "Registration paid",
      "Joined",
    ];
    const rows = filteredMembers.map((member, index) => [
      String(index + 1),
      member.membershipNumber,
      member.name,
      member.phone ?? "",
      member.email ?? "",
      member.status,
      member.registrationFeePaid ? "Paid" : "Pending",
      formatDate(member.dateJoined),
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "clingrow-members.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<Member>[] = [
    {
      key: "no",
      header: "#",
      render: (_member) => {
        const page = filters.page ?? 1;
        const pageSize = filters.pageSize ?? 20;
        const index = filteredMembers.indexOf(_member);
        return (
          <span className="text-xs font-black text-ink-400">
            {(page - 1) * pageSize + index + 1}
          </span>
        );
      },
    },
    {
      key: "member",
      header: "Member",
      render: (member) => (
        <div className="min-w-[13rem]">
          <p className="font-black text-ink-900">{member.name}</p>
          <p className="mt-0.5 text-xs font-semibold text-ink-500">
            {member.membershipNumber}
          </p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Phone / Email",
      render: (member) => (
        <div className="min-w-[12rem] text-sm">
          <p className="font-semibold text-ink-800">{member.phone ?? "-"}</p>
          <p className="mt-0.5 text-xs text-ink-500">
            {member.email ?? "No email captured"}
          </p>
        </div>
      ),
    },
    {
      key: "beneficiary",
      header: "Beneficiary",
      render: (member) => (
        <div className="min-w-[10rem]">
          <p className="font-semibold text-ink-800">{member.beneficiaryName}</p>
          <p className="text-xs text-ink-500">
            {member.beneficiaryRelationship}
          </p>
        </div>
      ),
    },
    {
      key: "payment",
      header: "Registration",
      render: (member) => <PaymentBadge paid={member.registrationFeePaid} />,
    },
    {
      key: "status",
      header: "Status",
      render: (member) => <StatusBadge status={member.status} />,
    },
    {
      key: "joined",
      header: "Joined",
      render: (member) => (
        <span className="text-sm font-semibold text-ink-700">
          {formatDate(member.dateJoined)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (member) => (
        <div
          className="flex min-w-[14rem] flex-wrap justify-end gap-1.5"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setSelectedMember(member)}
            className="rounded-lg border border-ink-200 bg-white p-2 text-ink-600 transition hover:bg-ink-50"
            aria-label={`View ${member.name}`}
          >
            <FiEye className="h-4 w-4" />
          </button>
          {canUpdate &&
          !["WITHDRAWN", "EXPELLED", "DECEASED"].includes(member.status) ? (
            <button
              type="button"
              onClick={() => openEdit(member)}
              className="rounded-lg border border-ink-200 bg-white p-2 text-ink-600 transition hover:bg-ink-50"
              aria-label={`Edit ${member.name}`}
            >
              <FiEdit3 className="h-4 w-4" />
            </button>
          ) : null}
          {member.status === "PENDING" && canApprove ? (
            <button
              type="button"
              onClick={() => setConfirmation({ kind: "approve", member })}
              className="rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              Approve
            </button>
          ) : null}
          {canUpdate ? (
            <div className="flex items-center gap-1 rounded-lg border border-ink-100 bg-ink-50 px-2 py-1">
              <ToggleSwitch
                checked={member.registrationFeePaid}
                onChange={() =>
                  setConfirmation({
                    kind: "registration",
                    member,
                    paid: !member.registrationFeePaid,
                  })
                }
                size="small"
                variant="success"
                disabled={busy}
                title="Confirm registration payment change"
              />
            </div>
          ) : null}
        </div>
      ),
    },
  ];

  const selectedFinancialCards = [
    ["Shares balance", 0, "Phase 3 ledger-ready"],
    ["Kitty contributions", 0, "Phase 4 source"],
    ["Monthly contributions", 0, "Phase 4 source"],
    ["Outstanding loans", 0, "Phase 5 source"],
    ["Loan balance", 0, "Phase 5 source"],
    ["Last payment date", "-", "Pending contribution history"],
  ] as const;

  const confirmationCopy = confirmation
    ? confirmation.kind === "approve"
      ? {
          title: "Approve member?",
          message:
            "This will activate the member account and allow the member to access their welfare dashboard.",
          confirmText: "Approve Member",
          type: "confirm" as const,
        }
      : confirmation.kind === "registration"
        ? {
            title: confirmation.paid
              ? "Mark registration as paid?"
              : "Mark registration as unpaid?",
            message: confirmation.paid
              ? "This will update the member registration payment status. Please confirm that the payment has been received."
              : "This will mark the registration fee as pending and may affect approval readiness.",
            confirmText: confirmation.paid ? "Confirm Payment" : "Mark Unpaid",
            type: "confirm" as const,
          }
        : {
            title: confirmation.title,
            message: confirmation.message,
            confirmText: confirmation.confirmText,
            type:
              confirmation.status === "EXPELLED"
                ? ("delete" as const)
                : ("confirm" as const),
          }
    : null;

  return (
    <div className="space-y-5 px-2">
      <section className="overflow-hidden ">
        <div className="">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="mt-1 text-xl font-black text-secondary-800 md:text-2xl">
                Members Registry
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
                Manage welfare members, approvals, registration payments,
                beneficiaries, and account status.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                onClick={exportMembers}
                size="sm"
                className="w-full sm:w-auto py-2"
              >
                <FiDownload className="h-4 w-4" />
                Export
              </Button>

              {canCreate ? (
                <Button
                  variant="primary"
                  onClick={openCreate}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <FiUserPlus className="h-4 w-4" />
                  Add New Member
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-7">
          <StatCard
            label="Total Members"
            value={String(counts.total)}
            detail="All registry records"
          />
          <StatCard
            label="Active"
            value={String(counts.active)}
            detail="In good standing"
          />
          <StatCard
            label="Pending"
            value={String(counts.pending)}
            detail="Awaiting approval"
          />
          <StatCard
            label="Suspended"
            value={String(counts.suspended)}
            detail="Temporarily blocked"
          />
          <StatCard
            label="Inactive"
            value={String(counts.inactive)}
            detail="Withdrawn, expelled, deceased"
          />
          <StatCard
            label="Reg. Paid"
            value={String(counts.paid)}
            detail="Confirmed payments"
          />
          <StatCard
            label="Reg. Pending"
            value={String(counts.unpaid)}
            detail="Needs follow-up"
          />
        </div>
      </section>

      <section className="">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <SearchBar
            value={filters.search ?? ""}
            onChange={(search) =>
              setFilters((current) => ({ ...current, search, page: 1 }))
            }
            placeholder="Search name, member number, phone, email, or ID"
            wrapperClassName="max-w-none xl:w-[34rem]"
            inputClassName="py-2.5"
            onKeyDown={(event) => {
              if (event.key === "Enter") void load({ ...filters, page: 1 });
            }}
            onClear={() => {
              const next = { ...filters, search: "", page: 1 };
              setFilters(next);
              void load(next);
            }}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <MultiFilterDropdown
              value={filterValue}
              onChange={setFilterValue}
              buttonLabel="Member Filters"
              title="Member Filters"
              sections={[
                {
                  id: "status",
                  title: "Member status",
                  options: statusOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  })),
                },
                {
                  id: "registration",
                  title: "Registration payment",
                  options: [
                    { value: "PAID", label: "Paid" },
                    { value: "PENDING", label: "Pending" },
                  ],
                },
                {
                  id: "compliance",
                  title: "Approval readiness",
                  options: [
                    { value: "READY", label: "Active + paid" },
                    { value: "ACTION_REQUIRED", label: "Action required" },
                  ],
                },
              ]}
            />
            <button
              type="button"
              onClick={() => void load({ ...filters, page: 1 })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-ink-800"
            >
              <FiRefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="">
        {loading ? (
          <div className="grid min-h-[50vh] place-items-center rounded-2xl bg-gray-100">
            <div className="flex items-center gap-3 text-sm text-ink-600">
              <Spinner />
              Loading member registry...
            </div>
          </div>
        ) : filteredMembers.length ? (
          <DataTable
            columns={columns}
            rows={filteredMembers}
            getRowKey={(member) => member.id}
            selectedRowId={selectedMember ? selectedMember.id : null}
            onRowClick={(member) => setSelectedMember(member)}
          />
        ) : (
          <EmptyState
            title="No members match these filters"
            message="Reset filters or adjust the search to broaden the registry view."
          />
        )}
      </section>

      <SlideOver
        open={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        title={selectedMember?.name ?? "Member details"}
        subtitle={
          selectedMember
            ? `${selectedMember.membershipNumber} - ${selectedMember.email ?? selectedMember.phone ?? "No contact captured"}`
            : undefined
        }
        widthClass="max-w-5xl"
        presentation="stacked"
        headerRight={
          selectedMember ? <StatusBadge status={selectedMember.status} /> : null
        }
        footer={
          selectedMember ? (
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-xs font-semibold text-ink-500">
                All status and payment changes require confirmation before
                saving.
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {canUpdate &&
                !["WITHDRAWN", "EXPELLED", "DECEASED"].includes(
                  selectedMember.status,
                ) ? (
                  <button
                    type="button"
                    onClick={() => openEdit(selectedMember)}
                    className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 hover:bg-ink-50"
                  >
                    Edit Member
                  </button>
                ) : null}
                {selectedMember.status === "PENDING" && canApprove ? (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmation({
                        kind: "approve",
                        member: selectedMember,
                      })
                    }
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    Approve Member
                  </button>
                ) : null}
                {canUpdate && selectedMember.status === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmation({
                        kind: "status",
                        member: selectedMember,
                        status: "SUSPENDED",
                        title: "Suspend member?",
                        message:
                          "This member will temporarily lose access to member services until reactivated.",
                        confirmText: "Suspend Member",
                      })
                    }
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                  >
                    Suspend
                  </button>
                ) : null}
                {canUpdate && selectedMember.status === "SUSPENDED" ? (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmation({
                        kind: "status",
                        member: selectedMember,
                        status: "ACTIVE",
                        title: "Activate member?",
                        message:
                          "This will restore the member account to active status and resume normal member services.",
                        confirmText: "Activate Member",
                      })
                    }
                    className="rounded-full bg-brand-700 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
                  >
                    Activate
                  </button>
                ) : null}
                {canUpdate &&
                !["PENDING", "EXPELLED", "WITHDRAWN", "DECEASED"].includes(
                  selectedMember.status,
                ) ? (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmation({
                        kind: "status",
                        member: selectedMember,
                        status: "EXPELLED",
                        title: "Expel member?",
                        message:
                          "This is a terminal membership action. The member will no longer appear as an active welfare participant.",
                        confirmText: "Expel Member",
                      })
                    }
                    className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-zinc-800 hover:bg-zinc-50"
                  >
                    Expel
                  </button>
                ) : null}
              </div>
            </div>
          ) : null
        }
      >
        {selectedMember ? (
          <div className="space-y-5">
            <section className="rounded-3xl border border-ink-100 bg-gradient-to-r from-ink-50 to-white p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-700">
                    Profile Summary
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-ink-950">
                    {selectedMember.name}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-ink-500">
                    {selectedMember.membershipNumber}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selectedMember.status} />
                  <PaymentBadge paid={selectedMember.registrationFeePaid} />
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Phone" value={selectedMember.phone} />
                <Field label="Email" value={selectedMember.email} />
                <Field label="ID / Passport" value={selectedMember.idNumber} />
                <Field
                  label="Joined"
                  value={formatDate(selectedMember.dateJoined)}
                />
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-ink-900">
                    Welfare account overview
                  </h3>
                  <p className="text-sm text-ink-500">
                    Financial values are structured for Phase 3 to Phase 5
                    ledger connections.
                  </p>
                </div>
                {canUpdate ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-3 py-2">
                    <span className="text-xs font-bold text-ink-500">
                      Registration paid
                    </span>
                    <ToggleSwitch
                      checked={selectedMember.registrationFeePaid}
                      onChange={() =>
                        setConfirmation({
                          kind: "registration",
                          member: selectedMember,
                          paid: !selectedMember.registrationFeePaid,
                        })
                      }
                      variant="success"
                      disabled={busy}
                    />
                  </div>
                ) : null}
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {selectedFinancialCards.map(([label, value, note]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400">
                      {label}
                    </p>
                    <p className="mt-2 text-xl font-black text-ink-900">
                      {typeof value === "number" ? money(value) : value}
                    </p>
                    <p className="mt-1 text-xs font-medium text-ink-500">
                      {note}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
                <h3 className="text-base font-black text-ink-900">
                  Administrative details
                </h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field
                    label="Approval status"
                    value={
                      selectedMember.approvedAt ? "Approved" : "Not approved"
                    }
                  />
                  <Field
                    label="Approved date"
                    value={formatDate(selectedMember.approvedAt)}
                  />
                  <Field
                    label="Approved by"
                    value={selectedMember.approvedBy}
                  />
                  <Field
                    label="Last updated"
                    value={formatDate(selectedMember.updatedAt)}
                  />
                  <Field
                    label="Introduced by"
                    value={selectedMember.introducedBy?.name}
                  />
                  <Field
                    label="Notes"
                    value={selectedMember.nonComplianceReasons}
                  />
                </div>
              </div>
              <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
                <h3 className="text-base font-black text-ink-900">
                  Primary beneficiary
                </h3>
                <div className="mt-4 rounded-2xl bg-ink-50 p-4">
                  <p className="font-black text-ink-900">
                    {selectedMember.beneficiaryName}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink-500">
                    {selectedMember.beneficiaryRelationship}
                  </p>
                  <p className="mt-1 text-sm text-ink-600">
                    {selectedMember.beneficiaryPhone}
                  </p>
                  <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-extrabold text-brand-700">
                    100% primary allocation
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </SlideOver>

      <MemberFormModal
        open={formOpen}
        mode={formMode}
        member={editingMember}
        submitting={busy}
        error={formError}
        onClose={() => setFormOpen(false)}
        onSubmit={saveMember}
      />

      {confirmationCopy ? (
        <NotificationModal
          isOpen={Boolean(confirmation)}
          onClose={() => setConfirmation(null)}
          type={confirmationCopy.type}
          title={confirmationCopy.title}
          message={confirmationCopy.message}
          confirmText={busy ? "Working..." : confirmationCopy.confirmText}
          onConfirm={() => {
            if (confirmation) void runConfirmedAction(confirmation);
          }}
        />
      ) : null}
    </div>
  );
}
