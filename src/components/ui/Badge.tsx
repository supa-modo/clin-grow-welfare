import clsx from 'clsx';

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold',
        tone === 'neutral' && 'bg-ink-100 text-ink-700',
        tone === 'success' && 'bg-mint-100 text-mint-600',
        tone === 'warning' && 'bg-amber-100 text-amber-600',
        tone === 'danger' && 'bg-red-100 text-red-700',
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ active }: { active?: boolean }) {
  return <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Inactive'}</Badge>;
}

