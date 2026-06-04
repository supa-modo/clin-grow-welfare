import { useEffect, useMemo, useState } from "react";
import { FiRefreshCw, FiSave } from "react-icons/fi";
import { TbShieldCog } from "react-icons/tb";
import { AdminPageLayout, AdminPageMain } from "@/layouts/AdminPageLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import Checkbox from "@/components/ui/Checkbox";
import { NotificationModal } from "@/components/ui/NotificationModal";
import { useUiStore } from "@/store/uiStore";
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
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const permissionByName = useMemo(
    () => new Map(permissions.map((permission) => [permission.name, permission])),
    [permissions],
  );
  const grouped = useMemo(() => groupPermissions(permissions), [permissions]);
  const groupNames = Object.keys(grouped).sort();

  const load = async () => {
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
    void load();
  }, []);

  const openEditor = (role: AdminRole) => {
    setEditingRole(role);
    const ids = role.permissions
      .map((permissionName) => permissionByName.get(permissionName)?.id)
      .filter(Boolean) as string[];
    setSelectedPermissionIds(new Set(ids));
  };

  const togglePermission = (permissionId: string, checked: boolean) => {
    setSelectedPermissionIds((current) => {
      const next = new Set(current);
      if (checked) next.add(permissionId);
      else next.delete(permissionId);
      return next;
    });
  };

  const savePermissions = async () => {
    if (!editingRole) return;
    setBusy(true);
    try {
      const result = await userAdminApi.updateRolePermissions(editingRole.id, Array.from(selectedPermissionIds));
      setRoles((current) => current.map((role) => role.id === result.role.id ? result.role : role));
      setEditingRole(result.role);
      setConfirmOpen(false);
      toastSuccess("Role permissions updated. Affected users should sign in again.");
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
          icon={<TbShieldCog />}
          disabled={role.name === "SystemAdmin"}
          onClick={() => openEditor(role)}
        >
          Edit permissions
        </Button>
      ),
    },
  ];

  return (
    <AdminPageLayout className="min-h-0">
      <PageHeader
        title="Roles and permissions"
        subtitle="Review role access and edit the permissions assigned to each official role."
        action={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void load()} disabled={loading}>Refresh</Button>}
      />
      <AdminPageMain className="overflow-y-auto pb-6">
        <DataTable
          rows={roles}
          columns={columns}
          getRowKey={(role) => role.id}
          tableLoading={loading}
          emptyTitle="No roles found"
          emptyMessage="Seed the role catalogue to manage permissions."
        />
      </AdminPageMain>

      <Modal
        open={Boolean(editingRole)}
        title={editingRole ? `Permissions - ${editingRole.name}` : "Permissions"}
        subtitle="Changes affect future sessions after users sign in again."
        onClose={() => setEditingRole(null)}
        size="xl"
      >
        {editingRole ? (
          <div className="space-y-5 p-5">
            {groupNames.map((group) => (
              <section key={group} className="rounded-lg border border-ink-100 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold capitalize text-ink-900">{group}</h3>
                  <Badge tone="neutral">{grouped[group].length} permissions</Badge>
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {grouped[group].map((permission) => (
                    <label key={permission.id} className="rounded-lg border border-ink-100 bg-ink-50 p-3">
                      <Checkbox
                        checked={selectedPermissionIds.has(permission.id)}
                        onChange={(checked) => togglePermission(permission.id, checked)}
                        label={permission.name}
                      />
                      {permission.description ? <p className="mt-1 text-xs text-ink-500">{permission.description}</p> : null}
                    </label>
                  ))}
                </div>
              </section>
            ))}
            <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
              <Button variant="secondary" onClick={() => setEditingRole(null)} disabled={busy}>Cancel</Button>
              <Button icon={<FiSave />} onClick={() => setConfirmOpen(true)} disabled={busy}>Save permissions</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <NotificationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Update role permissions?"
        message="Users with this role will receive the new permissions after their next sign-in. Continue?"
        confirmText="Update Permissions"
        onConfirm={() => void savePermissions()}
      />
    </AdminPageLayout>
  );
}
