import { api } from "./api";

export type AdminRole = {
  id: string;
  name: string;
  description?: string | null;
  permissions: string[];
};

export type AdminPermission = {
  id: string;
  name: string;
  module: string;
  description?: string | null;
};

export type AdminUser = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  memberId?: string | null;
  member?: {
    id: string;
    name: string;
    membershipNumber: string;
    status: string;
  } | null;
  roles: AdminRole[];
  createdAt: string;
  lastLoginAt?: string | null;
};

export const userAdminApi = {
  async listUsers(search?: string) {
    const { data } = await api.get("/users", { params: search ? { search } : undefined });
    return data as { data: AdminUser[] };
  },

  async listRoles() {
    const { data } = await api.get("/users/roles");
    return data as { data: AdminRole[] };
  },

  async listPermissions() {
    const { data } = await api.get("/users/permissions");
    return data as { data: AdminPermission[] };
  },

  async updateRoles(userId: string, roleIds: string[]) {
    const { data } = await api.put(`/users/${userId}/roles`, { roleIds });
    return data as { user: AdminUser };
  },

  async createRole(payload: { name: string; description?: string | null; permissionIds: string[] }) {
    const { data } = await api.post("/users/roles", payload);
    return data as { role: AdminRole };
  },

  async updateRolePermissions(roleId: string, permissionIds: string[]) {
    const { data } = await api.put(`/users/roles/${roleId}/permissions`, { permissionIds });
    return data as { role: AdminRole };
  },
};
