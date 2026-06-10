import { useEffect, useMemo, useState } from "react";
import { FiPlus, FiRefreshCw, FiSave } from "react-icons/fi";
import { TbShieldCog } from "react-icons/tb";
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
import { userAdminApi, type AdminPermission, type AdminRole } from "@/services/userAdminApi";

function apiError(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    return response?.data?.message ?? response?.data?.error ?? "Role permission update failed.";
  }
  return "Role permission update failed.";
}

function groupPermissions(permissions: AdminPermission[]) {
  return permissions.reduce<Record<string, AdminPermission[]>>((acc, permission) => {
    acc[permission.module] = [...(acc[permission.module] ?? []), permission];
    return acc;
  }, {});
}

export function RolesPermissionsPage() {
  const authUser = useAuthStore((s) => s.user);
  const canManagePermissions = Boolean(authUser?.roles.includes("SystemAdmin") || authUser?.permissions.includes("roles.managePermissions"));
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [search, setSearch] = useState("");
  const permissionByName = useMemo(
    () => new Map(permissions.map((permission) => [permission.name, permission])),
    [permissions],
  );
  const grouped = useMemo(() => groupPermissions(permissions), [permissions]);
  const groupNames = Object.keys(grouped).sort();
  const visibleRoles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return roles;
    return roles.filter((role) =>
      role.name.toLowerCase().includes(term) ||
      (role.description ?? "").toLowerCase().includes(term),
    );
  }, [roles, search]);

  const load = async (nextSearch = search) => {
    setLoading(true);
    try {
      const [roleResult, permissionResult] = await Promise.all([
        userAdminApi.listRoles(),
        userAdminApi.listPermissions(),
      ]);
      setRoles(roleResult.data);
      setPermissions(permissionResult.data);
    } catch (error) {
      toastError(apiError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(search);
  }, []);

  const openEditor = (role: AdminRole) => {
    setIsCreating(false);
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description ?? "");
    const ids = role.permissions
      .map((permissionName) => permissionByName.get(permissionName)?.id)
      .filter(Boolean) as string[];
    setSelectedPermissionIds(new Set(ids));
  };

  const openCreate = () => {
    setIsCreating(true);
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissionIds(new Set());
  };

  const closeEditor = () => {
    setIsCreating(false);
    setEditingRole(null);
    setConfirmOpen(false);
  };

  const togglePermission = (permissionId: string, checked: boolean) => {
    setSelectedPermissionIds((current) => {
      const next = new Set(current);
      if (checked) next.add(permissionId);
      else next.delete(permissionId);
      return next;
    });
  };

  const togglePermissionGroup = (group: string, checked: boolean) => {
    const groupIds = grouped[group].map((permission) => permission.id);
    setSelectedPermissionIds((current) => {
      const next = new Set(current);
      for (const id of groupIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const saveRole = async () => {
    if (!canManagePermissions) return;
    const trimmedName = roleName.trim();
    if (!isCreating && !editingRole) return;
    if (isCreating && !trimmedName) {
      toastError("Role name is required.");
      return;
    }
    setBusy(true);
    try {
      const permissionIds = Array.from(selectedPermissionIds);
      const result = isCreating
        ? await userAdminApi.createRole({
          name: trimmedName,
          description: roleDescription.trim() || null,
          permissionIds,
        })
        : await userAdminApi.updateRolePermissions(editingRole!.id, permissionIds);
      setRoles((current) => isCreating
        ? [...current, result.role].sort((a, b) => a.name.localeCompare(b.name))
        : current.map((role) => role.id === result.role.id ? result.role : role));
      setConfirmOpen(false);
      closeEditor();
      toastSuccess(isCreating ? "Role created. You can now assign it to users." : "Role permissions updated. Affected users should sign in again.");
    } catch (error) {
      toastError(apiError(error));
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<AdminRole>[] = [
    {
      key: "role",
      header: "Role",
      render: (role) => (
        <div>
          <p className="font-bold text-ink-900">{role.name}</p>
          <p className="text-xs text-ink-500">{role.description ?? "Role access profile"}</p>
        </div>
      ),
    },
    {
      key: "permissions",
      header: "Permissions",
      render: (role) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={role.name === "SystemAdmin" ? "danger" : "neutral"}>{role.permissions.length} permissions</Badge>
          {role.permissions.slice(0, 5).map((permission) => <Badge key={permission} tone="gray2">{permission}</Badge>)}
          {role.permissions.length > 5 ? <Badge tone="gray2">+{role.permissions.length - 5}</Badge> : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (role) => (
        <Button
          size="sm"
          variant="secondary"
          className="w-full shrink-0"
          icon={<TbShieldCog />}
          disabled={!canManagePermissions || role.name === "SystemAdmin"}
          onClick={() => openEditor(role)}
          title={!canManagePermissions ? "Requires roles.managePermissions permission" : undefined}
        >
          Edit permissions
        </Button>
      ),
    },
  ];

  return (
    <AdminPageLayout className="pb-8">
      <PageHeader
        title="Roles and permissions"
        subtitle="Review role access and edit the permissions assigned to each official role."
        action={(
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void load(search)} disabled={loading}>Refresh</Button>
            <Button icon={<FiPlus />} onClick={openCreate} disabled={!canManagePermissions}>Create role</Button>
          </div>
        )}
      />
      <AdminPageMain>
        {!canManagePermissions ? (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            You can view roles but cannot change permissions without <strong>roles.managePermissions</strong>.
          </p>
        ) : null}
        <DataTable
          search
          searchPlaceholder="Search by role name"
          searchValue={search}
          onSearchChange={(value) => setSearch(value)}
          rows={visibleRoles}
          columns={columns}
          getRowKey={(role) => role.id}
          tableLoading={loading}
          emptyTitle="No roles found"
          emptyMessage="Seed the role catalogue to manage permissions."
        />
      </AdminPageMain>

      <Modal
        open={Boolean(editingRole) || isCreating}
        title={isCreating ? "Create role" : editingRole ? `Permissions - ${editingRole.name}` : "Permissions"}
        subtitle="Changes affect future sessions after users sign in again."
        onClose={closeEditor}
        size="xl"
      >
        {editingRole || isCreating ? (
          <div className="space-y-5">
            {isCreating ? (
              <div className="grid gap-3 rounded-lg border border-ink-100 bg-ink-50 p-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-ink-500">Role name</span>
                  <input
                    value={roleName}
                    onChange={(event) => setRoleName(event.target.value)}
                    placeholder="Secretary"
                    className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-ink-500">Description</span>
                  <input
                    value={roleDescription}
                    onChange={(event) => setRoleDescription(event.target.value)}
                    placeholder="Access profile for this office"
                    className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </label>
              </div>
            ) : null}
            {groupNames.map((group) => (
              <section key={group} className="rounded-lg border border-ink-100 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold capitalize text-ink-900">{group}</h3>
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">{grouped[group].length} permissions</Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => togglePermissionGroup(group, !grouped[group].every((permission) => selectedPermissionIds.has(permission.id)))}
                      disabled={!canManagePermissions || busy}
                    >
                      {grouped[group].every((permission) => selectedPermissionIds.has(permission.id)) ? "Clear" : "Select all"}
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {grouped[group].map((permission) => {
                    const checked = selectedPermissionIds.has(permission.id);
                    return (
                    <div key={permission.id} className="rounded-lg border border-ink-100 bg-ink-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 break-words text-sm font-bold text-ink-800">{permission.name}</p>
                        <ToggleSwitch
                          checked={checked}
                          onChange={(nextChecked) => togglePermission(permission.id, nextChecked)}
                          disabled={!canManagePermissions || busy}
                          size="small"
                          variant="primary"
                          title={`Toggle ${permission.name}`}
                        />
                      </div>
                      {permission.description ? <p className="mt-1 text-xs text-ink-500">{permission.description}</p> : null}
                    </div>
                  );
                  })}
                </div>
              </section>
            ))}
            <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
              <Button variant="secondary" onClick={closeEditor} disabled={busy}>Cancel</Button>
              <Button icon={<FiSave />} onClick={() => setConfirmOpen(true)} disabled={busy || !canManagePermissions}>
                {isCreating ? "Create role" : "Save permissions"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <NotificationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={isCreating ? "Create role?" : "Update role permissions?"}
        message={isCreating ? "The role will be available for assignment immediately. Continue?" : "Users with this role will receive the new permissions after their next sign-in. Continue?"}
        confirmText={isCreating ? "Create Role" : "Update Permissions"}
        onConfirm={() => void saveRole()}
      />
    </AdminPageLayout>
  );
}
