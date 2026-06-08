import { useCallback, useEffect, useMemo, useState } from "react";
import { FiDownload, FiUserPlus } from "react-icons/fi";
import {
  TbCircleDashed,
  TbEdit,
  TbEye,
  TbUserCancel,
  TbUserCheck,
} from "react-icons/tb";

import { MemberDetailSlideOver } from "@/components/members/MemberDetailSlideOver";
import { MemberVerificationQueue } from "@/components/members/MemberVerificationQueue";
import { MemberFormSlideOver } from "@/components/members/MemberFormSlideOver";
import {
  formatDate,
  membershipStatusBadgeTone,
  statusLabel,
} from "@/components/members/memberUi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import DataTable, { type Column } from "@/components/ui/DataTable";
import type {
  MultiFilterSection,
  MultiFilterValue,
} from "@/components/ui/MultiFilterDropdown";
import { NotificationModal } from "@/components/ui/NotificationModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { RefreshIconButton } from "@/components/ui/RefreshIconButton";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import StatCard from "@/components/ui/StatCard";
import {
  AdminPageLayout,
  AdminPageMain,
  AdminPageStatsGrid,
} from "@/layouts/AdminPageLayout";
import { memberApi, type MemberFilters } from "@/services/memberApi";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/uiStore";
import { isSystemAdmin } from "@/lib/workspaces";
import type {
  Member,
  MemberFormValues,
  MembershipStatus,
} from "@/types/member";
import { PiUsersThreeDuotone } from "react-icons/pi";

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

const memberFilterSections: MultiFilterSection[] = [
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
];

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
  | { kind: "registration"; member: Member; paid: boolean }
  | { kind: "resetPassword"; member: Member; tempPassword?: string };

function has(permission: string, permissions: string[], systemAdmin = false) {
  return systemAdmin || permissions.includes(permission);
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

function MembersStatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[1.2rem] border border-gray-400 bg-white px-4 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-4">
        <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-200" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-28 max-w-full rounded bg-slate-200" />
          <div className="h-8 w-14 rounded bg-slate-200" />
          <div className="h-3 w-36 max-w-full rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
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

export function MembersPage() {
  const user = useAuthStore((s) => s.user);
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const permissions = user?.permissions ?? [];
  const systemAdmin = isSystemAdmin(user);

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
    status: [],
    registration: [],
    compliance: [],
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationAction | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const canCreate = has("officialsPortal.members.create", permissions, systemAdmin);
  const canUpdate = has("officialsPortal.members.update", permissions, systemAdmin);
  const canApprove = has("officialsPortal.members.approve", permissions, systemAdmin);
  const canResetPassword = has(
    "officialsPortal.members.resetPassword",
    permissions,
    systemAdmin,
  );

  const load = useCallback(
    async (next: MemberFilters = filters) => {
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
    },
    [filters],
  );

  useEffect(() => {
    void load(filters);
  }, [filters.page, filters.pageSize, filters.search, filters.status]);

  useEffect(() => {
    const statusFromFilter = (filterValue.status?.[0] ?? "") as
      | MembershipStatus
      | "";
    setFilters((current) => {
      if (current.status === statusFromFilter) return current;
      return { ...current, status: statusFromFilter, page: 1 };
    });
  }, [filterValue.status]);

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
    setEditingMember(null);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (member: Member) => {
    setEditingMember(member);
    setFormError("");
    setFormOpen(true);
  };

  const saveMember = async (values: MemberFormValues) => {
    setBusy(true);
    setFormError("");
    try {
      if (editingMember) {
        const member = await memberApi.update(editingMember.id, values);
        setSelectedMember(member);
        toastSuccess("Member updated", `${member.name} has been updated.`);
      } else {
        const member = await memberApi.create(values);
        toastSuccess("Member created", `${member.name} is pending approval.`);
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
      } else if (action.kind === "resetPassword") {
        const result = await memberApi.resetPassword(action.member.id);
        toastSuccess(
          "Password reset",
          result.tempPassword
            ? `Temporary password: ${result.tempPassword}`
            : "A temporary password was emailed to the member.",
        );
        setConfirmation(null);
        await load(filters);
        setBusy(false);
        return;
      } else {
        member = await memberApi.status(
          action.member.id,
          action.status,
          action.reason ?? `Status changed to ${action.status}`,
        );
      }
      setSelectedMember(member);
      toastSuccess(
        "Member updated",
        `${member.name} is now ${statusLabel(member.status).toLowerCase()}.`,
      );
      setConfirmation(null);
      await load(filters);
    } catch (err) {
      toastError("Action failed", getApiError(err), 6000);
    } finally {
      setBusy(false);
    }
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

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const totalPages = meta?.totalPages ?? 1;
  const totalItems = meta?.total ?? filteredMembers.length;
  const startIndex = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(page * pageSize, totalItems);

  const columns: Column<Member>[] = [
    {
      id: "member",
      header: "Member",
      cell: (member) => (
        <div className="min-w-48">
          <p className="font-semibold text-gray-900">{member.name}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {member.membershipNumber}
          </p>
        </div>
      ),
    },
    {
      id: "contact",
      header: "Phone / Email",
      cell: (member) => (
        <div className=" text-sm">
          <p className="text-gray-900">{member.phone ?? "-"}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {member.email ?? "No email captured"}
          </p>
        </div>
      ),
    },
    {
      id: "beneficiary",
      header: "Beneficiary",
      cell: (member) => (
        <div className="min-w-40">
          <p className="font-medium text-gray-900">{member.beneficiaryName}</p>
          <p className="text-xs text-gray-500">
            {member.beneficiaryRelationship}
          </p>
        </div>
      ),
    },
    {
      id: "payment",
      header: "Registration",
      cell: (member) => (
        <Badge tone={member.registrationFeePaid ? "success" : "warning"}>
          {member.registrationFeePaid ? "Paid" : "Pending"}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (member) => (
        <Badge tone={membershipStatusBadgeTone[member.status]}>
          {statusLabel(member.status).toLowerCase()}
        </Badge>
      ),
    },
    {
      id: "joined",
      header: "Joined",
      cell: (member) => (
        <span className="text-sm text-gray-600">
          {formatDate(member.dateJoined)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (member) => {
        const items = [
          {
            key: "view",
            label: "View details",
            icon: <TbEye className="h-4 w-4" />,
            onClick: () => setSelectedMember(member),
          },
        ];
        if (
          canUpdate &&
          !["WITHDRAWN", "EXPELLED", "DECEASED"].includes(member.status)
        ) {
          items.push({
            key: "edit",
            label: "Edit",
            icon: <TbEdit className="h-4 w-4" />,
            onClick: () => openEdit(member),
          });
        }
        if (member.status === "PENDING" && canApprove) {
          items.push({
            key: "approve",
            label: "Approve",
            icon: <TbUserCheck className="h-4 w-4" />,
            onClick: () => setConfirmation({ kind: "approve", member }),
          });
        }
        return (
          <div onClick={(event) => event.stopPropagation()}>
            <RowActionsMenu
              items={items}
              ariaLabel={`Actions for ${member.name}`}
            />
          </div>
        );
      },
    },
  ];

  const confirmationCopy = confirmation
    ? confirmation.kind === "approve"
      ? {
          title: "Approve member?",
          message:
            "This will activate the member account and allow access to the welfare dashboard.",
          confirmText: "Approve Member",
          type: "confirm" as const,
        }
      : confirmation.kind === "registration"
        ? {
            title: confirmation.paid
              ? "Mark registration as paid?"
              : "Mark registration as unpaid?",
            message: confirmation.paid
              ? "Confirm that the registration payment has been received."
              : "This will mark the registration fee as pending.",
            confirmText: confirmation.paid ? "Confirm Payment" : "Mark Unpaid",
            type: "confirm" as const,
          }
        : confirmation.kind === "resetPassword"
          ? {
              title: "Reset member password?",
              message: `Generate a temporary password for ${confirmation.member.name}. It will be emailed when an address is on file.`,
              confirmText: "Reset password",
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

  const isInitialLoad = loading && members.length === 0;

  return (
    <AdminPageLayout>
      <PageHeader
        title="Members Registry"
        subtitle="Manage welfare members, approvals, registration payments, beneficiaries, and account status."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshIconButton
              loading={loading}
              onClick={() => void load(filters)}
            />
            <Button variant="secondary" size="sm" onClick={exportMembers}>
              <FiDownload className="h-4 w-4" />
              Export
            </Button>
            {canCreate ? (
              <Button variant="primary" size="sm" onClick={openCreate}>
                <FiUserPlus className="h-4 w-4" />
                Add New Member
              </Button>
            ) : null}
          </div>
        }
      />

      

      <AdminPageStatsGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
        {isInitialLoad
          ? Array.from({ length: 5 }, (_, index) => (
              <MembersStatCardSkeleton key={`member-stat-skeleton-${index}`} />
            ))
          : (
            <>
              <StatCard
                icon={PiUsersThreeDuotone}
                iconColor="#1f7a76"
                label="Total Members"
                value={counts.total}
                subtitle="All registry records"
              />
              <StatCard
                icon={TbUserCheck}
                iconColor="#16a34a"
                label="Active"
                value={counts.active}
                subtitle="In good standing"
              />
              <StatCard
                icon={TbCircleDashed}
                iconColor="#d97706"
                label="Pending"
                value={counts.pending}
                subtitle="Awaiting approval"
              />
              <StatCard
                icon={TbUserCancel}
                iconColor="#dc2626"
                label="Suspended"
                value={counts.suspended}
                subtitle="Temporarily blocked"
              />
              <StatCard
                icon={TbUserCancel}
                iconColor="#64748b"
                label="Inactive"
                value={counts.inactive}
                subtitle="Withdrawn, expelled, deceased"
              />
            </>
          )}
      </AdminPageStatsGrid>

      {error ? (
        <div className="mb-3 shrink-0 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

<div className="mb-2">


<MemberVerificationQueue
        canReview={canUpdate}
        onOpenMember={(id) => {
          const row = members.find((m) => m.id === id);
          if (row) setSelectedMember(row);
          else
            void memberApi
              .get(id)
              .then(setSelectedMember)
              .catch(() => undefined);
        }}
      /> </div>

      <AdminPageMain>
        <DataTable
          columns={columns}
          rows={filteredMembers}
          getRowKey={(member) => member.id}
          selectedRowId={selectedMember?.id ?? null}
          onRowClick={(member) => setSelectedMember(member)}
          search
          searchValue={filters.search ?? ""}
          onSearchChange={(search) =>
            setFilters((current) => ({ ...current, search, page: 1 }))
          }
          searchPlaceholder="Search name, member number, phone, email, or ID"
          filter
          filterValue={filterValue}
          onFilterChange={setFilterValue}
          filterSections={memberFilterSections}
          filterButtonLabel="Member Filters"
          filterTitle="Member Filters"
          tableLoading={loading}
          loadingSkeletonRows={pageSize}
          hasSearched={Boolean(filters.search)}
          showAutoNumber
          showCheckboxes={false}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={totalItems}
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={(nextPage) =>
            setFilters((current) => ({ ...current, page: nextPage }))
          }
          onPageSizeChange={(nextSize) =>
            setFilters((current) => ({
              ...current,
              pageSize: nextSize,
              page: 1,
            }))
          }
          fillContainer
          containerClassName="h-full rounded-[1.3rem] border-gray-500/40 shadow-sm"
        />
      </AdminPageMain>

      <MemberDetailSlideOver
        open={Boolean(selectedMember)}
        member={selectedMember}
        busy={busy}
        canUpdate={canUpdate}
        canApprove={canApprove}
        onClose={() => setSelectedMember(null)}
        onEdit={(member) => {
          setSelectedMember(null);
          openEdit(member);
        }}
        onApprove={(member) => setConfirmation({ kind: "approve", member })}
        onSuspend={(member) =>
          setConfirmation({
            kind: "status",
            member,
            status: "SUSPENDED",
            title: "Suspend member?",
            message:
              "This member will temporarily lose access until reactivated.",
            confirmText: "Suspend Member",
          })
        }
        onActivate={(member) =>
          setConfirmation({
            kind: "status",
            member,
            status: "ACTIVE",
            title: "Activate member?",
            message: "This will restore the member account to active status.",
            confirmText: "Activate Member",
          })
        }
        onExpel={(member) =>
          setConfirmation({
            kind: "status",
            member,
            status: "EXPELLED",
            title: "Expel member?",
            message: "This is a terminal membership action.",
            confirmText: "Expel Member",
          })
        }
        onToggleRegistration={(member, paid) =>
          setConfirmation({ kind: "registration", member, paid })
        }
        onResetPassword={
          canResetPassword
            ? (member) => setConfirmation({ kind: "resetPassword", member })
            : undefined
        }
      />

      <MemberFormSlideOver
        open={formOpen}
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
    </AdminPageLayout>
  );
}
