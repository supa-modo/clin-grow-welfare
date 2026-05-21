import clsx from "clsx";

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

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="px-5 py-2 border-gray-400">
      <p className="text-sm font-medium text-ink-500">{label}</p>
      <div className="flex items-center gap-4">
        <p className="mt-2 text-2xl font-extrabold font-google text-ink-900">{value}</p>
        {detail ? (
          <p className="mt-2 text-[0.85rem] text-ink-500">{detail}</p>
        ) : null}{" "}
      </div>
    </Card>
  );
}
