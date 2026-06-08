import { useEffect, type ReactNode } from 'react';
import { Spinner } from '@/components/ui/Feedback';
import { useAuthStore } from '@/store/auth';

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (status !== 'ready') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-ink-50 text-ink-600">
        <Spinner />
        <p className="text-sm font-medium">Loading your session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
