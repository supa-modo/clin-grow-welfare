import {
  type KeyboardEventHandler,
  type ReactNode,
} from "react";
import clsx from "clsx";
export type SegmentedTab<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
};

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  variant = "segmented",
  compact = false,
  className,
  "aria-label": ariaLabel = "Sections",
}: {
  tabs: readonly SegmentedTab<T>[];
  value: T;
  onChange: (next: T) => void;
  variant?: "segmented" | "line";
  compact?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  function enabledTabs() {
    return tabs.filter((tab) => !tab.disabled);
  }

  function handleTabKeyDown(
    tab: SegmentedTab<T>,
  ): KeyboardEventHandler<HTMLButtonElement> {
    return (event) => {
      const available = enabledTabs();
      const index = available.findIndex((item) => item.value === tab.value);
      if (index < 0) return;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        const next = available[(index + 1) % available.length];
        if (next) onChange(next.value);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        const next = available[(index - 1 + available.length) % available.length];
        if (next) onChange(next.value);
      } else if (event.key === "Home") {
        event.preventDefault();
        const first = available[0];
        if (first) onChange(first.value);
      } else if (event.key === "End") {
        event.preventDefault();
        const last = available[available.length - 1];
        if (last) onChange(last.value);
      }
    };
  }

  const tabButtons = tabs.map((tab) => {
    const selected = value === tab.value;
    const countBadge =
      tab.count !== undefined ? (
        <span
          className={clsx(
            "inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-[0.65rem] font-bold tabular-nums",
            variant === "line" &&
              (selected
                ? "bg-primary-100 text-primary-800"
                : "bg-slate-100 text-slate-600"),
            variant === "segmented" &&
              (selected
                ? "bg-secondary-600 text-white"
                : "bg-slate-300 text-slate-600"),
          )}
        >
          {tab.count > 99 ? "99+" : tab.count}
        </span>
      ) : null;

    const content = (
      <span className="inline-flex max-w-full min-w-0 items-center justify-center gap-2">
        {tab.icon ? (
          <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{tab.icon}</span>
        ) : null}
        <span className="truncate">{tab.label}</span>
        {countBadge}
      </span>
    );

    if (variant === "line") {
      return (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={selected}
          disabled={tab.disabled}
          tabIndex={selected ? 0 : -1}
          onClick={() => onChange(tab.value)}
          onKeyDown={handleTabKeyDown(tab)}
          className={clsx(
            "shrink-0 border-b-2 px-2 text-sm font-medium transition-all duration-200 focus:outline-none md:px-3",
            compact ? "py-1.5" : "py-2.5",
            selected
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
            tab.disabled && "cursor-not-allowed opacity-50 hover:border-transparent hover:text-slate-500",
          )}
        >
          {content}
        </button>
      );
    }

    return (
      <button
        key={tab.value}
        type="button"
        role="tab"
        aria-selected={selected}
        disabled={tab.disabled}
        tabIndex={selected ? 0 : -1}
        onClick={() => onChange(tab.value)}
        onKeyDown={handleTabKeyDown(tab)}
        className={clsx(
          "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[0.4rem] px-2 text-[0.7rem] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:px-3 md:text-xs lg:text-sm",
          compact ? "py-1" : "py-1.5",
          selected
            ? "bg-white font-bold text-secondary-700 shadow-md"
            : "font-semibold text-slate-500 hover:text-slate-800",
          tab.disabled && "cursor-not-allowed opacity-50 hover:text-slate-500",
        )}
      >
        {content}
      </button>
    );
  });

  if (variant === "line") {
    return (
      <div className={clsx("border-b border-slate-200", className)}>
        <nav
          className="-mb-px flex gap-1 overflow-x-auto pb-px [-ms-overflow-style:none] scrollbar-none md:gap-4 [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label={ariaLabel}
        >
          {tabButtons}
        </nav>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex w-full gap-1 overflow-x-auto rounded-[0.65rem] bg-gray-100/80 p-[0.2rem] [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabButtons}
    </div>
  );
}

