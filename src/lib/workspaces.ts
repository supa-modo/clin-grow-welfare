export type WorkspaceKey = 'admin' | 'officials' | 'member';

export type AuthUser = {
  id: string;
  memberId: string | null;
  roles: string[];
  permissions: string[];
  name?: string;
  email?: string | null;
  phone?: string | null;
};

export const officialRoles = [
  'Secretary',
  'AssistantSecretary',
  'Treasurer',
  'Chairperson',
  'NominatedSignatory',
  'InternalAuditor',
] as const;

export const workspaceLabels: Record<WorkspaceKey, string> = {
  admin: 'Admin Portal',
  officials: 'Officials Portal',
  member: 'Member Portal',
};

export const workspaceRoutes: Record<WorkspaceKey, string> = {
  admin: '/dashboard',
  officials: '/officials',
  member: '/member',
};

export function isSystemAdmin(user: AuthUser | null) {
  return user?.roles.includes('SystemAdmin') ?? false;
}

export function isOfficial(user: AuthUser | null) {
  return user?.roles.some((role) => officialRoles.includes(role as (typeof officialRoles)[number])) ?? false;
}

export function canAccessWorkspace(user: AuthUser | null, workspace: WorkspaceKey) {
  if (!user) return false;
  if (workspace === 'admin') return isSystemAdmin(user);
  if (workspace === 'officials') return isOfficial(user);
  return Boolean(user.memberId);
}

export function availableWorkspaces(user: AuthUser | null) {
  return (['member', 'admin', 'officials'] as WorkspaceKey[]).filter((workspace) => canAccessWorkspace(user, workspace));
}

export function defaultRouteForUser(user: AuthUser | null) {
  if (!user) return '/login';
  if (user.memberId) return '/member';
  if (isSystemAdmin(user)) return '/dashboard';
  if (isOfficial(user)) return '/officials';
  return '/forbidden';
}
