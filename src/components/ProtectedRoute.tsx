import type React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { isOfficial, isSystemAdmin, type AuthUser } from '@/lib/workspaces';
import { Spinner } from '@/components/ui/Feedback';

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const status = useAuthStore((s) => s.status);

  if (status !== 'ready') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return token ? <Outlet /> : <Navigate to='/login' replace />;
}

export function hasPermission(user: AuthUser | null, permission: string) {
  return isSystemAdmin(user) || !!user?.permissions?.includes(permission);
}

type AuthUserLike = {
  roles?: string[];
  permissions?: string[];
} | null;

export function RequireAdmin() { const user = useAuthStore((s) => s.user); return isSystemAdmin(user) ? <Outlet /> : <Navigate to='/forbidden' replace />; }
export function RequireOfficial() { const user = useAuthStore((s) => s.user); return isOfficial(user) ? <Outlet /> : <Navigate to='/forbidden' replace />; }
export function RequireMember() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!user?.memberId) return <Navigate to='/forbidden' replace />;
  if (!user.memberConstitutionAccepted && location.pathname !== '/member/constitution') {
    return <Navigate to='/member/constitution' replace />;
  }
  if (user.memberConstitutionAccepted && location.pathname === '/member/constitution') {
    return <Navigate to='/member' replace />;
  }
  return <Outlet />;
}

export function PermissionGate({ permission, children }: { permission: string; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return hasPermission(user, permission) ? <>{children}</> : <Navigate to='/forbidden' replace />;
}
