export type WorkspaceKey = 'admin' | 'officials' | 'member';

export type AuthUser = {
  id: string;
  memberId: string | null;
  roles: string[];
  permissions: string[];
  name?: string;
  email?: string | null;
  phone?: string | null;
  memberConstitutionAccepted?: boolean;
  memberConstitutionAcceptedAt?: string | null;
  memberProfileImageUpdatedAt?: string | null;
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
  if (user.memberId && !user.memberConstitutionAccepted) return '/member/constitution';
  if (user.memberId) return '/member';
  if (isSystemAdmin(user)) return '/dashboard';
  if (isOfficial(user)) return '/officials';
  return '/forbidden';
}

export function routeForWorkspace(user: AuthUser | null, workspace: WorkspaceKey) {
  if (workspace === 'member') {
    if (user?.memberId && !user.memberConstitutionAccepted) return '/member/constitution';
    return workspaceRoutes.member;
  }
  return workspaceRoutes[workspace];
}

const roleDisplayNames: Record<string, string> = {
  SystemAdmin: 'System Administrator',
  AssistantSecretary: 'Assistant Secretary',
  NominatedSignatory: 'Nominated Signatory',
  InternalAuditor: 'Internal Auditor',
};

export function displayRoleLabel(user: AuthUser | null): string | undefined {
  if (!user?.roles.length) return undefined;
  if (user.roles.includes('SystemAdmin')) return roleDisplayNames.SystemAdmin;
  const official = officialRoles.find((role) => user.roles.includes(role));
  if (official) return roleDisplayNames[official] ?? official;
  if (user.roles.includes('Member')) return 'Member';
  return roleDisplayNames[user.roles[0]] ?? user.roles[0];
}

export function canViewLedgerNav(user: AuthUser | null) {
  if (!user) return false;
  return isSystemAdmin(user) || user.roles.includes('Treasurer');
}
