import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { defaultRouteForUser } from '@/lib/workspaces';

export function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  return <Navigate to={token ? defaultRouteForUser(user) : '/login'} replace />;
}
