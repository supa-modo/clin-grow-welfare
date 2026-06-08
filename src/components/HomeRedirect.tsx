import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { defaultRouteForUser } from '@/lib/workspaces';
import { Spinner } from '@/components/ui/Feedback';

export function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const status = useAuthStore((s) => s.status);

  if (status !== 'ready') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <Navigate to={token ? defaultRouteForUser(user) : '/login'} replace />;
}
