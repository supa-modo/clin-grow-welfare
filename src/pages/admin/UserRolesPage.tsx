import { useEffect, useMemo, useState } from "react";
import { FiRefreshCw, FiSave } from "react-icons/fi";
import { TbUserCog } from "react-icons/tb";
import { AdminPageLayout, AdminPageMain } from "@/layouts/AdminPageLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { NotificationModal } from "@/components/ui/NotificationModal";
import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/auth";
import { userAdminApi, type AdminRole, type AdminUser } from "@/services/userAdminApi";

const OFFICIAL_ROLES = new Set([
  "Secretary",
  "AssistantSecretary",
  "Treasurer",
  "Chairperson",
  "NominatedSignatory",
  "InternalAuditor",
]);

function roleTone(role: string) {
  if (role === "SystemAdmin") return "danger" as const;
  if (role === "Member") return "neutral" as const;
  if (OFFICIAL_ROLES.has(role)) return "success" as const;
  return "gray2" as const;
}

function apiError(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    return response?.data?.message ?? response?.data?.error ?? "User role update failed.";
  }
  return "User role update failed.";
}

export function UserRolesPage() {
  const authUser = useAuthStore((s) => s.user);
  const canManageRoles = Boolean(authUser?.roles.includes("SystemAdmin") || authUser?.permissions.includes("users.manageRoles"));
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const memberRole = roles.find((role) => role.name === "Member");
  const filteredRoles = useMemo(
    () => roles.filter((role) => role.name !== "Member").sort((a, b) => {
      const officialDiff = Number(!OFFICIAL_ROLES.has(a.name)) - Number(!OFFICIAL_ROLES.has(b.name));
      return officialDiff || a.name.localeCompare(b.name);
    }),
    [roles],
  );

  const load = async (nextSearch = search) => {
    setLoading(true);
    try {
      const [userResult, roleResult] = await Promise.all([
        userAdminApi.listUsers(nextSearch),
        userAdminApi.listRoles(),
      ]);
      setUsers(userResult.data);
      setRoles(roleResult.data);
    } catch (error) {
      toastError(apiError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("");
  }, []);

  const openEditor = (user: AdminUser) => {
    setEditing(user);
    setSelectedRoleIds(new Set(user.roles.map((role) => role.id)));
  };

  const exclusiveRoleHolders = useMemo(() => {
    const map = new Map<string, AdminUser>();
    for (const user of users) {
      for (const role of user.roles) {
        if (OFFICIAL_ROLES.has(role.name) && !map.has(role.name)) {
          map.set(role.name, user);
        }
      }
    }
    return map;
  }, [users]);

  const exclusiveRoleConflict = (roleName: string) => {
    if (!editing || !OFFICIAL_ROLES.has(roleName)) return null;
    const holder = exclusiveRoleHolders.get(roleName);
    if (!holder || holder.id === editing.id) return null;
    return holder.member?.name ?? holder.name ?? holder.email ?? "another user";
  };

  const toggleRole = (role: AdminRole, checked: boolean) => {
    if (checked && exclusiveRoleConflict(role.name)) {
      toastError(`${role.name} is already assigned to ${exclusiveRoleConflict(role.name)}.`);
      return;
    }
    setSelectedRoleIds((current) => {
      const next = new Set(current);
      if (checked) next.add(role.id);
      else next.delete(role.id);
      return next;
    });
  };

  const saveRoles = async () => {
    if (!editing || !canManageRoles) return;
    const conflict = filteredRoles.find(
      (role) => selectedRoleIds.has(role.id) && exclusiveRoleConflict(role.name),
    );
    if (conflict) {
      toastError(`${conflict.name} is already assigned to another user.`);
      return;
    }
    setBusy(true);
    try {
      const nextRoleIds = new Set(selectedRoleIds);
      if (editing.memberId && memberRole) nextRoleIds.add(memberRole.id);
      const result = await userAdminApi.updateRoles(editing.id, Array.from(nextRoleIds));
      setUsers((current) => current.map((user) => user.id === result.user.id ? result.user : user));
      setEditing(result.user);
      setConfirmOpen(false);
      toastSuccess("User roles updated. The user should sign in again to refresh permissions.");
    } catch (error) {
      toastError(apiError(error));
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      key: "user",
      header: "User",
      render: (user) => (
        <div>
          <p className="font-bold text-ink-900">{user.member?.name ?? user.name}</p>
          <p className="text-xs font-semibold text-ink-500">{user.member?.membershipNumber ?? user.email ?? "No member record"}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (user) => (
        <div className="text-sm text-ink-600">
          <p>{user.email ?? "No email"}</p>
          <p className="text-xs text-ink-400">{user.phone ?? "No phone"}</p>
        </div>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      render: (user) => (
        <div className="flex max-w-xl flex-wrap gap-1.5">
          {user.roles.map((role) => (
            <Badge key={role.id} tone={roleTone(role.name)}>{role.name}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (user) => <Badge tone={user.status === "ACTIVE" ? "success" : "warning"}>{user.status}</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: (user) => (
        <Button
          size="sm"
          variant="secondary"
          icon={<TbUserCog />}
          onClick={() => openEditor(user)}
          disabled={!canManageRoles}
          title={canManageRoles ? undefined : "Requires users.manageRoles permission"}
        >
          Edit roles
        </Button>
      ),
    },
  ];

  return (
    <AdminPageLayout className="min-h-0 overflow-hidden">
      <PageHeader
        title="User roles"
        subtitle="Promote members to official roles and review system access."
        action={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void load(search)} disabled={loading}>Refresh</Button>}
      />
      <AdminPageMain className="overflow-y-auto pb-6">
        {!canManageRoles ? (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            You can view users but cannot change roles without <strong>users.manageRoles</strong>. Sign out and sign in again if permissions were recently updated.
          </p>
        ) : null}
       
        <DataTable
          showAutoNumber
          search
          searchPlaceholder="Search by name, email, or member number"
          searchValue={search}
          onSearchChange={(value) => {
            setSearch(value);
            void load(value);
          }}
          rows={users}
          columns={columns}
          getRowKey={(user) => user.id}
          tableLoading={loading}
          emptyTitle="No users found"
          emptyMessage="Member users will appear here once accounts are provisioned."
        />
      </AdminPageMain>

      <Modal
        open={Boolean(editing)}
        title="Edit user roles"
        subtitle={editing ? `${editing.member?.membershipNumber ?? editing.email ?? editing.name}` : undefined}
        onClose={() => setEditing(null)}
        size="lg"
      >
        {editing ? (
          <div className="space-y-5 p-5">
            <div className="rounded-lg border border-ink-100 bg-ink-50 p-4">
              <p className="font-bold text-ink-900">{editing.member?.name ?? editing.name}</p>
              <p className="text-sm text-ink-600">{editing.email ?? "No email"}</p>
              {editing.memberId ? (
                <p className="mt-2 text-xs font-semibold text-ink-500">Member role is kept automatically for member-linked accounts.</p>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {filteredRoles.map((role) => {
                const holder = exclusiveRoleConflict(role.name);
                const taken = Boolean(holder) && !selectedRoleIds.has(role.id);
                const checked = selectedRoleIds.has(role.id);
                const disabled = !canManageRoles || taken;
                return (
                  <div key={role.id} className="rounded-lg border border-ink-100 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-ink-900">{role.name}</p>
                        <p className="mt-1 text-xs text-ink-500">{role.permissions.length} permission(s)</p>
                      </div>
                      <ToggleSwitch
                        checked={checked}
                        onChange={(nextChecked) => toggleRole(role, nextChecked)}
                        disabled={disabled}
                        variant={role.name === "SystemAdmin" ? "danger" : "primary"}
                        title={disabled && taken ? `${role.name} is held by ${holder}` : `Toggle ${role.name}`}
                    />
                    </div>
                    {taken ? (
                      <p className="mt-1 text-xs font-semibold text-amber-700">Held by {holder}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
              <Button icon={<FiSave />} onClick={() => setConfirmOpen(true)} disabled={busy || !canManageRoles}>Save roles</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <NotificationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Update user roles?"
        message="The role change takes effect on the next sign-in for that user. Continue?"
        confirmText="Update Roles"
        onConfirm={() => void saveRoles()}
      />
    </AdminPageLayout>
  );
}
