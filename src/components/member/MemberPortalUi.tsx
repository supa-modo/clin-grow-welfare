import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { FiCalendar, FiCreditCard, FiFileText } from "react-icons/fi";

export type TrendMonths = 3 | 6 | 9;

export function getInitials(name?: string) {
  if (!name?.trim()) return "CG";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function MemberWelcomeHeader({
  greeting,
  name,
  membershipNumber,
  statusLabel,
  avatarName,
  backTo,
}: {
  greeting: string;
  name: string;
  membershipNumber: string;
  statusLabel: string;
  avatarName?: string;
  backTo?: string;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {backTo ? (
          <Link
            to={backTo}
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
          >
            ← Back
          </Link>
        ) : null}
        {greeting ? (
          <p className="text-sm font-medium text-ink-500">{greeting}</p>
        ) : null}
        <h1 className="font-google text-[1rem] font-extrabold tracking-tight text-ink-950 md:text-2xl lg:text-[1.3rem]">
          {name}
        </h1>
        <p className="mt-1 text-xs text-gray-600 md:text-[0.8rem] lg:text-sm">
          {membershipNumber} · {statusLabel}
        </p>
      </div>
      {avatarName ? (
        <div
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary-500 to-secondary-600 text-sm font-extrabold text-white shadow-md"
        >
          {getInitials(avatarName ?? name)}
        </div>
      ) : null}
    </header>
  );
}

export function MemberHeroCard({
  label,
  value,
  hint,
  trendLabel,
}: {
  label: string;
  value: string;
  hint?: string;
  trendLabel?: string;
}) {
  return (
    <section className="rounded-2xl border border-primary-100 bg-linear-to-br from-primary-50 via-white to-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-primary-700">
        {label}
      </p>
      <p className="mt-2 font-google text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
        {value}
      </p>
      {hint ? <p className="mt-2 text-sm text-ink-600">{hint}</p> : null}
      {trendLabel ? (
        <p className="mt-3 inline-flex rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-primary-700 ring-1 ring-primary-100">
          {trendLabel}
        </p>
      ) : null}
    </section>
  );
}

const quickActions = [
  {
    label: "Contributions",
    href: "/member/contributions",
    icon: FiCreditCard,
    tone: "bg-primary-600 hover:bg-primary-700",
  },
  {
    label: "Loans",
    href: "/member/loans",
    icon: FiFileText,
    tone: "bg-secondary-600 hover:bg-secondary-700",
  },
  {
    label: "Meetings",
    href: "/member/meetings",
    icon: FiCalendar,
    tone: "bg-ink-800 hover:bg-ink-900",
  },
] as const;

export function MemberQuickActions() {
  return (
    <section className="grid grid-cols-3 gap-2 max-[360px]:grid-cols-2 sm:gap-3">
      {quickActions.map((action) => (
        <Link
          key={action.href}
          to={action.href}
          className="group flex flex-col items-center gap-2 rounded-2xl border border-ink-100 bg-white p-3 shadow-sm transition hover:border-primary-200 hover:shadow-md"
        >
          <span
            className={clsx(
              "flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm transition group-hover:scale-105",
              action.tone,
            )}
          >
            <action.icon className="h-5 w-5" />
          </span>
          <span className="text-center text-xs font-bold text-ink-700">
            {action.label}
          </span>
        </Link>
      ))}
    </section>
  );
}

export function MemberSectionCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-b border-ink-100 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-5">
        <div>
          <h2 className="text-sm font-extrabold text-ink-950">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function PeriodToggle({
  value,
  onChange,
}: {
  value: TrendMonths;
  onChange: (months: TrendMonths) => void;
}) {
  const options: TrendMonths[] = [3, 6, 9];

  return (
    <div className="inline-flex rounded-full bg-ink-100 p-1">
      {options.map((months) => (
        <button
          key={months}
          type="button"
          onClick={() => onChange(months)}
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-bold transition",
            value === months
              ? "bg-white text-primary-700 shadow-sm"
              : "text-ink-500 hover:text-ink-700",
          )}
        >
          {months}m
        </button>
      ))}
    </div>
  );
}

export function MemberFundRow({
  icon,
  title,
  subtitle,
  amount,
  accent = "primary",
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  amount: string;
  accent?: "primary" | "secondary" | "neutral";
}) {
  const iconTone =
    accent === "secondary"
      ? "bg-secondary-100 text-secondary-700"
      : accent === "neutral"
        ? "bg-ink-100 text-ink-600"
        : "bg-primary-100 text-primary-700";

  return (
    <div className="flex items-center gap-2 border-b border-ink-100 py-3 transition hover:bg-white">
      <span
        className={clsx(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          iconTone,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-ink-900">{title}</p>
        {subtitle ? (
          <p className="truncate text-xs text-ink-500">{subtitle}</p>
        ) : null}
      </div>
      <p className="shrink-0 text-sm font-extrabold text-ink-950">{amount}</p>
    </div>
  );
}

export function MemberAlertChips({
  alerts,
}: {
  alerts: Array<{
    id: string;
    title: string;
    tone: "success" | "warning" | "danger" | "info" | "neutral";
  }>;
}) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {alerts.slice(0, 4).map((alert) => (
        <span
          key={alert.id}
          className={clsx(
            "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold",
            alert.tone === "danger" &&
              "bg-red-50 text-red-800 ring-1 ring-red-100",
            alert.tone === "warning" &&
              "bg-amber-50 text-amber-900 ring-1 ring-amber-100",
            alert.tone === "success" &&
              "bg-primary-50 text-primary-800 ring-1 ring-primary-100",
            alert.tone === "info" &&
              "bg-secondary-50 text-secondary-800 ring-1 ring-secondary-100",
            alert.tone === "neutral" &&
              "bg-ink-50 text-ink-700 ring-1 ring-ink-100",
          )}
        >
          {alert.title}
        </span>
      ))}
    </div>
  );
}
