import type { ReactNode } from 'react';
import clsx from 'clsx';

type ProfileSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ProfileSection({
  title,
  description,
  action,
  children,
  className,
}: ProfileSectionProps) {
  return (
    <section
      className={clsx(
        'overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm',
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-slate-950">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function ProfileFieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

export function ProfileDetailTile({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-3',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <div className="mt-0.5 wrap-break-word text-base font-semibold text-slate-900">
            {value ?? '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileField({ label, value }: { label: string; value?: ReactNode }) {
  return <ProfileDetailTile label={label} value={value} />;
}
