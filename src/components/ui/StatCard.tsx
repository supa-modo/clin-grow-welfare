import type { ReactNode } from "react";
import clsx from "clsx";
import { FiArrowDownRight, FiArrowUpRight } from "react-icons/fi";

export interface StatCardBadge {
  label: string;
  positive?: boolean | null;
}

export interface StatCardProps {
  icon?:
    | ReactNode
    | React.ComponentType<{ size?: number; className?: string }>;
  iconColor?: string;
  title?: string;
  label?: string;
  value?: string | number;
  sub?: string;
  subtitle?: string;
  /** Backwards compatible alias used by legacy Card StatCard */
  detail?: string;
  subtitleColor?: string;
  badge?: StatCardBadge;
  clickable?: boolean;
  onClick?: () => void;
  gradient?: string;
  borderColor?: string;
  className?: string;
}

export function StatCard({
  icon: IconProp,
  iconColor = "#1f7a76",
  title,
  label = "Metric",
  value = "—",
  sub,
  subtitle,
  detail,
  subtitleColor = "text-gray-500",
  badge,
  clickable = false,
  onClick,
  gradient,
  borderColor = "border-gray-400",
  className = "",
}: StatCardProps) {
  const effectiveSubtitle = subtitle ?? sub ?? detail;
  const tint = gradient ?? (className?.trim() ? className : undefined);

  const handleClick = () => {
    if (clickable && onClick) onClick();
  };

  const renderIcon = () => {
    if (IconProp == null) return null;
    if (typeof IconProp === "function") {
      const Cmp = IconProp as React.ComponentType<{
        size?: number;
        className?: string;
      }>;
      return (
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center"
          style={{ color: iconColor }}
        >
          <Cmp size={36} className="h-9 w-9" />
        </div>
      );
    }
    return (
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center text-[28px] leading-none"
        style={{ color: iconColor }}
      >
        {IconProp}
      </div>
    );
  };

  return (
    <div
      onClick={handleClick}
      role={clickable ? "button" : undefined}
      className={clsx(
        "group relative overflow-hidden rounded-[1.2rem] border bg-white px-4 py-2.5 text-slate-900",
        "shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all duration-200 ease-out hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]",
        clickable ? "cursor-pointer" : "cursor-default",
        borderColor,
      )}
    >
      {tint ? (
        <div
          className={clsx(
            "pointer-events-none absolute inset-0 rounded-[1.2rem] bg-white",
            tint,
          )}
        />
      ) : null}

      <div className="relative flex items-center gap-4">
        {renderIcon()}

        <div className="min-w-0 flex-1">
          <p className="mb-0.5 truncate text-sm font-medium text-gray-700">
            {title ?? label}
          </p>
          <p className="truncate font-google text-2xl font-extrabold leading-tight tracking-tight text-slate-900">
            {value}
          </p>
          {effectiveSubtitle ? (
            <p className={clsx("mt-0.5 truncate text-[0.8rem]", subtitleColor)}>
              {effectiveSubtitle}
            </p>
          ) : null}
        </div>

        {badge ? (
          <div className="shrink-0">
            <span
              className={clsx(
                "inline-flex items-center gap-0.5 whitespace-nowrap rounded-lg px-2 py-1 text-[10.5px] font-bold",
                badge.positive === false
                  ? "bg-red-50 text-red-600"
                  : badge.positive === true
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600",
              )}
            >
              {badge.positive === true && <FiArrowUpRight size={11} />}
              {badge.positive === false && <FiArrowDownRight size={11} />}
              {badge.label}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default StatCard;
