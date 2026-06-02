import clsx from "clsx";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "gray2";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold border",
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
