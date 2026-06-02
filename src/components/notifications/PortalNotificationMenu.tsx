import {
  useCallback,
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { FiArrowUpRight } from "react-icons/fi";
import { MdOutlineNotificationsActive } from "react-icons/md";
import { TbCheck } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import { formatDateTime } from "@/lib/formatDateTime";

export type PortalNotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  actionUrl?: string | null;
};

export type PortalNotificationMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centerPath: string;
  loadPreview: () => Promise<PortalNotificationItem[]>;
  loadUnreadCount?: () => Promise<number>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  onOpenItem: (item: PortalNotificationItem) => void | Promise<void>;
  onBellInteract?: () => void;
  bellButtonClassName?: string;
};

export function PortalNotificationMenu({
  open,
  onOpenChange,
  centerPath,
  loadPreview,
  loadUnreadCount,
  markRead: markReadApi,
  markAllRead: markAllReadApi,
  onOpenItem,
  onBellInteract,
  bellButtonClassName,
}: PortalNotificationMenuProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<PortalNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshPreview = useCallback(() => {
    void loadPreview()
      .then(setItems)
      .catch(() => setItems([]));
  }, [loadPreview]);

  const refreshUnreadCount = useCallback(() => {
    if (!loadUnreadCount) return;
    void loadUnreadCount()
      .then(setUnreadCount)
      .catch(() => setUnreadCount(0));
  }, [loadUnreadCount]);

  useEffect(() => {
    refreshPreview();
    refreshUnreadCount();
  }, [refreshPreview, refreshUnreadCount]);

  useEffect(() => {
    if (open) {
      refreshPreview();
      refreshUnreadCount();
    }
  }, [open, refreshPreview, refreshUnreadCount]);

  const unread = loadUnreadCount
    ? unreadCount
    : items.filter((item) => !item.isRead).length;

  function togglePanel() {
    onBellInteract?.();
    onOpenChange(!open);
  }

  async function handleMarkRead(id: string) {
    await markReadApi(id);
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );
    refreshUnreadCount();
  }

  async function handleMarkAllRead() {
    await markAllReadApi();
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  }

  async function handleOpenItem(item: PortalNotificationItem) {
    onOpenChange(false);
    await onOpenItem(item);
  }

  function handleNotificationKeyDown(
    event: ReactKeyboardEvent<HTMLDivElement>,
    item: PortalNotificationItem,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void handleOpenItem(item);
    }
  }

  const defaultBellClass =
    "relative flex h-9 w-9 items-center justify-center rounded-[0.7rem] border border-gray-200/80 bg-white text-ink-700 transition hover:bg-ink-50 md:h-10 md:w-10 lg:rounded-xl lg:border-gray-300";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={togglePanel}
        className={bellButtonClassName ?? defaultBellClass}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <MdOutlineNotificationsActive className="h-5 w-5" />
        {unread ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[0.65rem] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-3.5 w-[18rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-b-2xl border border-ink-100 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.18)] lg:mt-2 lg:w-84 lg:rounded-2xl">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-1.5 lg:py-2">
            <p className="text-[0.7rem] font-semibold text-secondary-600 md:text-xs lg:text-[0.83rem]">
              {unread} unread item{unread === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={!unread}
              className="rounded-lg border border-primary-600/70 px-3 py-0.5 text-[0.65rem] font-bold text-brand-700 disabled:text-ink-400 md:text-[0.7rem] lg:py-[0.2rem] lg:text-[0.8rem]"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto p-1.5 scrollbar-thin lg:p-2">
            {items.length ? (
              items.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => void handleOpenItem(item)}
                  onKeyDown={(event) =>
                    handleNotificationKeyDown(event, item)
                  }
                  className={`mb-1 rounded-xl p-2.5 lg:p-3 ${item.isRead ? "bg-white" : "bg-secondary-100/80"}`}
                  aria-label={`Open notification: ${item.title}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-[0.7rem] font-bold text-gray-600 lg:text-sm">
                      {item.title}
                    </p>
                    {!item.isRead ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleMarkRead(item.id);
                        }}
                        className="rounded-full text-brand-700"
                        aria-label="Mark notification read"
                      >
                        <TbCheck />
                      </button>
                    ) : null}
                  </div>
                  <p className="line-clamp-2 text-[0.6rem] leading-relaxed text-amber-600 md:text-[0.65rem] lg:text-[0.8rem]">
                    {item.message}
                  </p>
                  <p className="mt-1 text-[0.6rem] font-medium text-slate-500 md:text-[0.65rem]">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-[0.7rem] text-gray-400 md:text-[0.8rem] lg:text-[0.9rem]">
                No new notifications yet.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              navigate(centerPath);
            }}
            className="flex w-full items-center justify-center gap-2 border-t border-ink-100 px-4 py-2.5 text-[0.7rem] font-bold text-brand-700 md:text-[0.75rem] lg:py-3 lg:text-[0.85rem]"
          >
            <span className="inline-block">View notification center</span>
            <FiArrowUpRight className="h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
