import clsx from "clsx";
import { StatCard as StatCardBase, type StatCardProps } from "./StatCard";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={clsx(
        "rounded-2xl border border-ink-300 bg-white shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** @deprecated Prefer importing from `@/components/ui/StatCard` */
export function StatCard({
  label,
  value,
  detail,
  ...rest
}: Pick<StatCardProps, "label" | "value" | "detail" | "icon" | "iconColor" | "borderColor" | "className">) {
  return (
    <StatCardBase
      label={label}
      value={value}
      detail={detail}
      borderColor="border-gray-400"
      {...rest}
    />
  );
}
