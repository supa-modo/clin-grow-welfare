import type React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { isOfficial, isSystemAdmin } from '@/lib/workspaces';

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  return token ? <Outlet /> : <Navigate to='/login' replace />;
}

export function hasPermission(user: any, permission: string) { return !!user?.permissions?.includes(permission); }

export function RequireAdmin() { const user = useAuthStore((s) => s.user); return isSystemAdmin(user) ? <Outlet /> : <Navigate to='/forbidden' replace />; }
export function RequireOfficial() { const user = useAuthStore((s) => s.user); return isOfficial(user) ? <Outlet /> : <Navigate to='/forbidden' replace />; }
export function RequireMember() { const user = useAuthStore((s) => s.user); return user?.memberId ? <Outlet /> : <Navigate to='/forbidden' replace />; }

export function PermissionGate({ permission, children }: { permission: string; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return hasPermission(user, permission) ? <>{children}</> : <Navigate to='/forbidden' replace />;
}
