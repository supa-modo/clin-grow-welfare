import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';

export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await loaderRef.current());
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'error' in err.response.data
          ? String(err.response.data.error)
          : err instanceof Error
            ? err.message
            : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, error, reload: load };
}

export function StateBlock({ loading, error, empty }: { loading?: boolean; error?: string; empty?: boolean }) {
  if (loading) return <Card className="p-6 text-sm font-semibold text-ink-500">Loading workspace data...</Card>;
  if (error) return <Card className="border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">{error}</Card>;
  if (empty) return <Card className="p-6 text-sm font-semibold text-ink-500">No records match this workspace yet.</Card>;
  return null;
}

export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
