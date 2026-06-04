import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiChevronDown, FiLogOut, FiMenu } from "react-icons/fi";
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
import {
  PortalNotificationMenu,
  type PortalNotificationItem,
} from "@/components/notifications/PortalNotificationMenu";

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
  roleLabel?: string;
};

export function Header({ workspaceLabel, roleLabel }: HeaderProps) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleMobileDrawer = useUiStore((s) => s.toggleMobileDrawer);
  const menuRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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

  const switchWorkspace = (workspace: WorkspaceKey) => {
    setProfileOpen(false);
    if (workspace !== currentWorkspace) navigate(workspaceRoutes[workspace]);
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const centerPath = `${workspaceRoutes[currentWorkspace]}/notifications`;

  async function loadNotificationPreview(): Promise<PortalNotificationItem[]> {
    const res = await api.get("/notifications", {
      params: { status: "UNREAD" },
    });
    return (res.data.notifications ?? []).slice(0, 8).map((row: any) => ({
      id: row.id,
      title: row.title,
      message: row.body ?? "",
      createdAt: row.createdAt,
      isRead: row.status === "READ",
      actionUrl: row.link,
    }));
  }

  async function loadUnreadCount() {
    const res = await api.get("/notifications/unread-count");
    return Number(res.data.count ?? 0);
  }

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all");
  }

  async function openNotification(item: PortalNotificationItem) {
    await markRead(item.id).catch(() => undefined);
    if (item.actionUrl) navigate(item.actionUrl);
  }

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
          className="shrink-0  text-gray-500 transition hover:text-gray-700"
          aria-label="Toggle menu"
        >
          <FiMenu className="h-6 w-6" />
        </button>
        <div className="pl-4 min-w-0">
          <p className="flex items-center gap-4 truncate text-sm font-bold text-gray-900">
            {roleLabel
              ? `${workspaceLabel ?? workspaceLabels[currentWorkspace]} workspace`
              : "Clin-Grow Welfare Group"}
            {roleLabel ? (
              <div className="flex items-center gap-4">
                <div className="w-px h-4 bg-gray-300" />
                <span className="truncate font-google text-xs font-semibold tracking-wide text-gray-500">
                  {roleLabel}
                </span>
              </div>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <PortalNotificationMenu
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
          centerPath={centerPath}
          loadPreview={loadNotificationPreview}
          loadUnreadCount={loadUnreadCount}
          markRead={markRead}
          markAllRead={markAllRead}
          onOpenItem={openNotification}
          onBellInteract={() => setProfileOpen(false)}
        />

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
                {workspaces.map((workspace) => {
                  const active = workspace === currentWorkspace;
                  return (
                    <button
                      key={workspace}
                      type="button"
                      role="menuitem"
                      onClick={() => switchWorkspace(workspace)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                        active
                          ? "bg-primary-100 text-primary-800"
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
