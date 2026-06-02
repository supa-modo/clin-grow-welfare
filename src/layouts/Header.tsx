import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiBell,
  FiChevronDown,
  FiLogOut,
  FiMenu,
} from "react-icons/fi";
import { TbLayoutDashboard } from "react-icons/tb";
import {
  availableWorkspaces,
  workspaceLabels,
  workspaceRoutes,
  type WorkspaceKey,
} from "@/lib/workspaces";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/uiStore";

function getInitials(name?: string) {
  if (!name) return "CG";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type HeaderProps = {
  workspaceLabel?: string;
};

export function Header({ workspaceLabel }: HeaderProps) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleMobileDrawer = useUiStore((s) => s.toggleMobileDrawer);
  const menuRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; body?: string; link?: string }>
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const workspaces = availableWorkspaces(user);
  const currentWorkspace: WorkspaceKey = location.pathname.startsWith("/member")
    ? "member"
    : location.pathname.startsWith("/officials")
      ? "officials"
      : "admin";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setProfileOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get("/notifications", { params: { status: "UNREAD" } }),
      api.get("/notifications/unread-count"),
    ])
      .then(([listRes, countRes]) => {
        setNotifications(listRes.data.notifications ?? []);
        setUnreadCount(countRes.data.count ?? 0);
      })
      .catch(() => {
        setNotifications([]);
        setUnreadCount(0);
      });
  }, [user]);

  const switchWorkspace = (workspace: WorkspaceKey) => {
    setProfileOpen(false);
    if (workspace !== currentWorkspace) navigate(workspaceRoutes[workspace]);
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-3 md:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (window.matchMedia("(max-width: 1023px)").matches) {
              toggleMobileDrawer();
            } else {
              toggleSidebar();
            }
          }}
          className="grid h-9 w-9 place-items-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 lg:hidden"
          aria-label="Toggle menu"
        >
          <FiMenu className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">
            {workspaceLabel ?? workspaceLabels[currentWorkspace]}
          </p>
          <p className="truncate text-xs text-gray-500">
            Clin-Grow Welfare Group
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            className="relative grid h-9 w-9 place-items-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50"
            aria-label="Notifications"
            data-testid="notification-bell"
          >
            <FiBell className="h-4 w-4" />
            {unreadCount ? (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[0.65rem] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </button>
          {notificationsOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-bold text-gray-900">Notifications</p>
                <p className="text-xs text-gray-500">
                  Meeting, finance, and approval updates.
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {notifications.length ? (
                  notifications.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full rounded-xl px-3 py-2 text-left transition hover:bg-gray-50"
                      onClick={async () => {
                        await api
                          .post(`/notifications/${item.id}/read`)
                          .catch(() => undefined);
                        setNotifications((rows) =>
                          rows.filter((row) => row.id !== item.id),
                        );
                        setUnreadCount((count) => Math.max(0, count - 1));
                        setNotificationsOpen(false);
                        if (item.link) navigate(item.link);
                      }}
                    >
                      <span className="block text-xs font-bold text-gray-900">
                        {item.title}
                      </span>
                      {item.body ? (
                        <span className="mt-0.5 block text-xs text-gray-500">
                          {item.body}
                        </span>
                      ) : null}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-6 text-center text-sm text-gray-500">
                    No unread notifications.
                  </p>
                )}
              </div>
              <button
                type="button"
                className="w-full border-t border-gray-100 px-4 py-3 text-sm font-bold text-brand-800 transition hover:bg-brand-50"
                onClick={() => {
                  setNotificationsOpen(false);
                  navigate(
                    `${workspaceRoutes[currentWorkspace]}/notifications`,
                  );
                }}
                data-testid="notification-center-link"
              >
                Open notification center
              </button>
            </div>
          ) : null}
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-left transition hover:bg-gray-50"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
              {getInitials(user?.name)}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-40 truncate text-xs font-bold text-gray-900">
                {user?.name ?? "User"}
              </span>
              <span className="block max-w-40 truncate text-[0.68rem] text-gray-500">
                {user?.email ?? user?.phone ?? "Authenticated session"}
              </span>
            </span>
            <FiChevronDown className="h-4 w-4 text-gray-500" />
          </button>

          {profileOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg"
            >
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-bold text-gray-900">
                  {user?.name ?? "User"}
                </p>
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {user?.email ?? user?.phone ?? "Authenticated session"}
                </p>
              </div>
              <div className="px-2 py-2">
                <p className="px-2 pb-1 pt-1 text-[0.68rem] font-bold uppercase tracking-wider text-gray-400">
                  Portal
                </p>
                {workspaces.map((workspace) => {
                  const active = workspace === currentWorkspace;
                  return (
                    <button
                      key={workspace}
                      type="button"
                      role="menuitem"
                      onClick={() => switchWorkspace(workspace)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        active
                          ? "bg-brand-50 text-brand-800"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <TbLayoutDashboard className="h-4 w-4 shrink-0" />
                      <span className="flex-1 font-semibold">
                        {workspaceLabels[workspace]}
                      </span>
                      {active ? (
                        <span className="text-[0.65rem] font-bold uppercase">
                          Active
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-gray-100 p-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
                >
                  <FiLogOut className="h-4 w-4 shrink-0" />
                  Logout
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
