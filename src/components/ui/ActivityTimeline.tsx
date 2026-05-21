import type { ReactNode } from "react";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiBell,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiPackage,
  FiShield,
  FiTool,
  FiUploadCloud,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { EmptyState } from "./Feedback";
import { PiUserDuotone } from "react-icons/pi";

export type TimelineActor = {
  name: string;
};

export type TimelineItem = {
  id: string;
  title: string;
  description?: string | null;
  timestamp?: string | null;
  /** Legacy / secondary label shown as chip */
  meta?: string;
  /** Primary category for icon + accent color (falls back to `type`) */
  eventType?: string | null;
  type?: string | null;
  status?: string | null;
  href?: string | null;
  icon?: ReactNode;
  /** Optional structured payload shown in an expandable section */
  metadata?: Record<string, unknown> | null;
  actor?: TimelineActor | null;
};

const iconMap: Record<string, ReactNode> = {
  ASSIGNMENT: <FiPackage className="h-4 w-4" />,
  ASSIGNED: <FiPackage className="h-4 w-4" />,
  ACKNOWLEDGEMENT: <FiCheckCircle className="h-4 w-4" />,
  ACKNOWLEDGED: <FiCheckCircle className="h-4 w-4" />,
  BORROW: <FiArrowRight className="h-4 w-4" />,
  BORROW_REQUEST: <FiArrowRight className="h-4 w-4" />,
  DAMAGE: <FiAlertTriangle className="h-4 w-4" />,
  DAMAGE_REPORT: <FiAlertTriangle className="h-4 w-4" />,
  MAINTENANCE: <FiTool className="h-4 w-4" />,
  CLEARANCE: <FiShield className="h-4 w-4" />,
  NOTIFICATION: <FiBell className="h-4 w-4" />,
  DOCUMENT: <FiFileText className="h-4 w-4" />,
  UPLOAD: <FiUploadCloud className="h-4 w-4" />,
  STATUS_CHANGED: <FiArrowRight className="h-4 w-4" />,
};

function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const datePart = date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} at ${timePart}`;
}

function friendly(value?: string | null): string {
  if (!value) return "";
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolveEventKey(item: TimelineItem): string {
  const raw = item.eventType ?? item.type ?? item.status ?? "";
  return raw.toUpperCase();
}

function iconCircleClass(): string {
  return "bg-slate-100 text-slate-600";
}

function resolveIcon(item: TimelineItem): ReactNode {
  if (item.icon) return item.icon;
  const eventKey = resolveEventKey(item);
  return iconMap[eventKey] ?? <FiClock className="h-4 w-4" />;
}

function metadataKeys(meta: Record<string, unknown>): number {
  return Object.keys(meta).length;
}

function TimelineMetadata({ meta }: { meta: Record<string, unknown> }) {
  if (metadataKeys(meta) === 0) return null;
  let serialized: string;
  try {
    serialized = JSON.stringify(meta, null, 2);
  } catch {
    serialized = "[Unable to serialize metadata]";
  }
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600">
        Details
      </summary>
      <pre className="mt-1 max-h-24 overflow-auto rounded bg-slate-50 p-2 text-[0.65rem] lg:text-[0.7rem] leading-relaxed text-slate-600">
        {serialized}
      </pre>
    </details>
  );
}

function TimelineRow({ item, last }: { item: TimelineItem; last: boolean }) {
  const eventLabelRaw = item.eventType ?? item.type ?? "";
  const eventLabel = friendly(eventLabelRaw);
  const icon = resolveIcon(item);
  const circleTone = iconCircleClass();
  const when = formatDateTime(item.timestamp);

  const body = (
    <div className="flex gap-4 pl-0">
      <div
        className={clsx(
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          circleTone,
        )}
      >
        {icon}
      </div>
      <div
        className={clsx(
          "min-w-0 flex-1 pb-3",
          !last && "border-b border-slate-100",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <p className="text-[0.8rem] md:text-[0.85rem] lg:text-sm font-semibold text-primary-600">
            {item.title}
          </p>
          <div className="flex items-center gap-1.5">
            {item.status ? (
              <span
                className={clsx(
                  "shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-slate-200 text-slate-600",
                )}
              >
                {friendly(item.status)}
              </span>
            ) : null}
            {when ? (
              <span className="text-[0.65rem] md:text-[0.7rem] lg:text-xs text-slate-400 hidden lg:block">
                {when}
              </span>
            ) : null}{" "}
          </div>
        </div>
        {item.description ? (
          <p className="lg:mt-1 mt-0.5 text-[0.75rem] md:text-[0.8rem] lg:text-sm leading-relaxed text-slate-600">
            {item.description}
          </p>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="flex items-center gap-1.5 text-[0.65rem] lg:text-[0.7rem] text-slate-500">
            <PiUserDuotone className="h-3 lg:h-3.5 w-3 lg:w-3.5 shrink-0" />
            {item.actor?.name || "N/A"}
          </p>
          {when ? (
            <span className="text-[0.65rem] md:text-[0.7rem] lg:text-xs text-slate-400 lg:hidden">
              {when}
            </span>
          ) : null}
          {eventLabelRaw ? (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[0.65rem] md:text-[0.7rem] lg:text-xs text-slate-500">
              {eventLabel}
            </span>
          ) : null}
          {item.meta ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.65rem] md:text-[0.7rem] lg:text-xs text-slate-500">
              {friendly(item.meta)}
            </span>
          ) : null}
        </div>
        {item.metadata && metadataKeys(item.metadata) > 0 ? (
          <TimelineMetadata meta={item.metadata} />
        ) : null}
      </div>
    </div>
  );

  if (!item.href) return body;
  return (
    <Link
      to={item.href}
      className="-mx-1 block rounded-lg px-1 py-0.5 transition hover:bg-slate-50"
    >
      {body}
    </Link>
  );
}

export function ActivityTimeline({
  items,
  emptyTitle = "No activity captured yet",
  emptyMessage = "New lifecycle actions will appear here as they are recorded.",
  className,
  title,
  showCount = true,
  embedded = false,
}: {
  items: TimelineItem[];
  emptyTitle?: string;
  emptyMessage?: string;
  className?: string;
  /** Optional section heading (e.g. Recent activity) */
  title?: string;
  /** When true with `title`, shows item count badge */
  showCount?: boolean;
  /** No outer card — use inside another container (e.g. tab panel, StaffSection) */
  embedded?: boolean;
}) {
  if (!items.length)
    return <EmptyState title={emptyTitle} message={emptyMessage} />;

  return (
    <div
      className={clsx(
        embedded
          ? "p-0"
          : "rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      {title ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h3 className="text-[0.75rem] md:text-[0.8rem] lg:text-sm font-semibold text-primary-600">
            {title}
          </h3>
          {showCount ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {items.length} {items.length === 1 ? "event" : "events"}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="relative">
        <div
          className="pointer-events-none absolute bottom-0 left-5 top-4 w-px bg-slate-200"
          aria-hidden
        />
        <div className="space-y-3">
          {items.map((item, index) => (
            <TimelineRow
              key={item.id}
              item={item}
              last={index === items.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
