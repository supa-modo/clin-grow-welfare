import clsx from "clsx";
export function Badge({
  children,
  tone = "neutral",
  size = "md",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "gray2";
  size?: "xs" | "sm" | "md" | "lg";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md px-2.5 py-0.5 font-semibold border",
        size === "xs" && "text-[0.6rem] md:text-[0.65rem] lg:text-[0.7rem]",
        size === "sm" && "text-[0.65rem] md:text-xs lg:text-[0.75rem]",
        size === "md" && "text-[0.7rem] md:text-xs lg:text-[0.85rem]",
        size === "lg" && "text-[0.7rem] md:text-xs lg:text-[0.85rem]",
        tone === "neutral" && "bg-gray-100 text-gray-700 border-gray-300",
        tone === "gray2" && "bg-gray-200 text-gray-700 border-gray-300",
        tone === "success" && "bg-green-100 text-green-600 border-green-600/60",
        tone === "warning" && "bg-amber-100 text-amber-600 border-amber-600/30",
        tone === "danger" && "bg-red-100 text-red-700",
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ active }: { active?: boolean }) {
  return (
    <Badge tone={active ? "success" : "neutral"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}
