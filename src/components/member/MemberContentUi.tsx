import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

export function MemberContentHeader({ eyebrow, title, description, action, backTo }: {
  eyebrow: string; title: string; description: ReactNode; action?: ReactNode; backTo?: string;
}) {
  return <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {backTo && <Link to={backTo} className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink-500 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-600"><FiArrowLeft /> All meetings</Link>}
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">{eyebrow}</p>
      <h1 className="mt-2 break-words font-google text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">{title}</h1>
      <div className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">{description}</div>
    </div>
    {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
  </header>;
}

export function MemberContentSection({ title, subtitle, action, children, className = "" }: {
  title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return <section className={`min-w-0 rounded-2xl bg-white p-4 sm:p-6 ${className}`}>
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0"><h2 className="text-base font-bold tracking-tight text-ink-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm leading-5 text-ink-500">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
    {children}
  </section>;
}

export function MemberSummaryMetric({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return <div className="min-w-0 rounded-xl bg-ink-50 p-3 sm:p-4">
    <div className="flex items-center gap-2 text-xs text-ink-500">{icon && <span className="shrink-0 text-brand-600">{icon}</span>}{label}</div>
    <p className="mt-2 break-words text-sm font-bold leading-6 text-ink-900 sm:text-base">{value}</p>
  </div>;
}

export function MeetingDateTile({ date }: { date: string }) {
  const value = new Date(date);
  return <div aria-hidden="true" className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-800 sm:h-20 sm:w-16">
    <span className="text-[10px] font-bold uppercase tracking-widest">{value.toLocaleDateString("en-KE", { month: "short" })}</span>
    <span className="text-2xl font-bold leading-8">{value.getDate()}</span>
    <span className="text-[10px] font-medium">{value.getFullYear()}</span>
  </div>;
}
