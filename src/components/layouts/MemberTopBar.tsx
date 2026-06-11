import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  FiChevronDown,
  FiCreditCard,
  FiFileText,
  FiLogOut,
} from "react-icons/fi";
import { MdSpaceDashboard } from "react-icons/md";
import { TbUsers } from "react-icons/tb";
import { PiUserDuotone } from "react-icons/pi";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { MemberAvatar } from "@/components/member/MemberAvatar";
import {
  availableWorkspaces,
  workspaceLabels,
  workspaceRoutes,
  type WorkspaceKey,
} from "@/lib/workspaces";
import {
  PortalNotificationMenu,
  type PortalNotificationItem,
} from "@/components/notifications/PortalNotificationMenu";

type NavIcon = ComponentType<{ className?: string }>;

type MemberNavItem = {
  label: string;
  href: string;
  icon: NavIcon;
  end?: boolean;
};

const desktopNavItems: MemberNavItem[] = [
  { label: "Home", href: "/member", icon: MdSpaceDashboard, end: true },
  { label: "Contributions", href: "/member/contributions", icon: FiCreditCard },
  { label: "Loans", href: "/member/loans", icon: FiFileText },
  { label: "Meetings", href: "/member/meetings", icon: TbUsers },
  { label: "Claims", href: "/member/welfare", icon: FiFileText },
];

const bottomNavItems: MemberNavItem[] = [
  { label: "Home", href: "/member", icon: MdSpaceDashboard, end: true },
  { label: "Contributions", href: "/member/contributions", icon: FiCreditCard },
  { label: "Loans", href: "/member/loans", icon: FiFileText },
  { label: "Meetings", href: "/member/meetings", icon: TbUsers },
];

function isHrefActive(pathname: string, item: MemberNavItem) {
  if (item.end) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function mapNotification(row: {
  id: string;
  title: string;
  body?: string;
  link?: string | null;
  status?: string;
  createdAt: string;
}): PortalNotificationItem {
  return {
    id: row.id,
    title: row.title,
    message: row.body ?? "",
    createdAt: row.createdAt,
    isRead: row.status === "READ",
    actionUrl: row.link,
  };
}

export function MemberTopBar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLDivElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const workspaces = useMemo(() => availableWorkspaces(user), [user]);
  const currentWorkspace: WorkspaceKey = "member";
  const isConstitution = location.pathname === "/member/constitution";

  const loadMemberNotifications = useCallback(async () => {
    const { data } = await api.get("/notifications", {
      params: { status: "UNREAD" },
    });
    const rows = (data.notifications ?? []) as Array<{
      id: string;
      title: string;
      body?: string;
      link?: string | null;
      status?: string;
      createdAt: string;
    }>;
    return rows.slice(0, 8).map(mapNotification);
  }, []);

  const loadMemberUnreadCount = useCallback(async () => {
    const { data } = await api.get("/notifications/unread-count");
    return (data.count as number) ?? 0;
  }, []);

  const markMemberNotificationRead = useCallback(async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
  }, []);

  const markAllMemberNotificationsRead = useCallback(async () => {
    await api.patch("/notifications/read-all");
  }, []);

  const openMemberNotification = useCallback(
    async (item: PortalNotificationItem) => {
      if (!item.isRead) {
        try {
          await markMemberNotificationRead(item.id);
        } catch {
          // Navigation should still work if mark-read fails.
        }
      }
      navigate(item.actionUrl || "/member/notifications");
    },
    [navigate, markMemberNotificationRead],
  );

  useEffect(() => {
    function closeDropdowns(event: MouseEvent) {
      const target = event.target as Node;
      if (headerRef.current?.contains(target)) return;
      setNotificationsOpen(false);
      setProfileOpen(false);
    }
    document.addEventListener("mousedown", closeDropdowns);
    return () => document.removeEventListener("mousedown", closeDropdowns);
  }, []);

  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-gray-200 bg-white shadow-xs">
        <div
          ref={headerRef}
          className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 px-3 py-1"
        >
          <Link
            to="/member"
            className="flex min-w-0 shrink items-center gap-2.5"
          >
            <img
              src="/logo.webp"
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src.endsWith("/favicon.svg")) return;
                img.src = "/favicon.svg";
              }}
            />
            <div className="min-w-0">
              <p className="my-0.5 text-[0.85rem] font-extrabold leading-tight text-primary-700 lg:text-base">
                Clin-Grow Welfare
              </p>
              <p className="text-[0.65rem] font-semibold text-gray-500 lg:text-[0.7rem]">
                Member portal
              </p>
            </div>
          </Link>

         

          <div className="flex items-center gap-2 md:gap-3">
          {!isConstitution ? (
            <nav
              className="hidden items-center gap-1 lg:flex"
              aria-label="Member navigation"
            >
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                const active = isHrefActive(location.pathname, item);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[0.85rem] font-bold transition active:scale-[0.98]",
                      active
                        ? "bg-secondary-600 text-white shadow-sm"
                        : "text-gray-700 hover:bg-secondary-100",
                    )}
                  >
                    <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
            <PortalNotificationMenu
              open={notificationsOpen}
              onOpenChange={setNotificationsOpen}
              centerPath="/member/notifications"
              loadPreview={loadMemberNotifications}
              loadUnreadCount={loadMemberUnreadCount}
              markRead={markMemberNotificationRead}
              markAllRead={markAllMemberNotificationsRead}
              onOpenItem={openMemberNotification}
              onBellInteract={() => setProfileOpen(false)}
            />

            <div className="relative lg:hidden">
              <button
                type="button"
                onClick={() => {
                  navigate("/member/profile");
                  setNotificationsOpen(false);
                  setProfileOpen(false);
                }}
                className="relative grid h-10 w-10 place-items-center rounded-full text-ink-700 transition"
                aria-label="Open profile"
                aria-expanded={profileOpen}
              >
                <MemberAvatar user={user} className="h-10 w-10 bg-primary-50" />
              </button>
            </div>

            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
                className="flex h-[2.6rem] items-center gap-2 rounded-[0.7rem] border border-gray-300/80 bg-white pl-[0.3rem] pr-2.5 text-ink-700 shadow-sm transition hover:bg-ink-50"
                aria-label="Profile menu"
                aria-expanded={profileOpen}
              >
                <MemberAvatar user={user} className="h-8 w-8 bg-primary-50" />
                <span className="max-w-28 truncate text-[0.82rem] font-bold text-primary-800">
                  {user?.name?.split(" ")[0] ?? "Member"}
                </span>
                <FiChevronDown className="h-4 w-4 text-gray-500" />
              </button>

              {profileOpen ? (
                <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.18)]">
                  <div className="border-b border-ink-100 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <MemberAvatar user={user} className="h-11 w-11 bg-primary-50" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">
                          {user?.name ?? "Member"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {user?.email ?? user?.phone ?? "Member workspace"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/member/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-ink-100"
                  >
                    <PiUserDuotone className="h-[1.2rem] w-[1.2rem]" />
                    Profile and settings
                  </Link>
                  {workspaces.length > 1 ? (
                    <div className="border-t border-ink-100 py-2">
                      {workspaces.map((ws) => (
                        <button
                          key={ws}
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            if (ws !== currentWorkspace)
                              navigate(workspaceRoutes[ws]);
                          }}
                          className="flex w-full px-4 py-2 text-left text-sm font-semibold text-gray-600 transition hover:bg-ink-100"
                        >
                          Switch to {workspaceLabels[ws]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 border-t border-ink-100 px-4 py-3 pl-5 text-sm font-bold text-red-700 transition hover:bg-red-100"
                  >
                    <FiLogOut className="h-[1.2rem] w-[1.2rem]" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {!isConstitution ? (
        <nav
          aria-label="Member quick navigation"
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-6px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:hidden"
        >
          <ul className="mx-auto grid max-w-md grid-cols-4 gap-1">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const active = isHrefActive(location.pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[0.65rem] font-bold transition",
                      active
                        ? "bg-primary-100/70 text-primary-700"
                        : "text-slate-500 hover:text-primary-700",
                    )}
                  >
                    <Icon
                      className={clsx(
                        "h-[1.35rem] w-[1.35rem]",
                        active ? "text-primary-700" : "text-slate-500",
                      )}
                    />
                    <span className="tracking-wide">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </>
  );
}
