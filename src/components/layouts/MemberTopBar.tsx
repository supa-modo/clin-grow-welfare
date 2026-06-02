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
  FiChevronRight,
  FiCreditCard,
  FiFileText,
  FiLogOut,
  FiMenu,
  FiX,
} from "react-icons/fi";
import { MdOutlineNotificationsActive, MdSpaceDashboard } from "react-icons/md";
import { TbLayoutDashboard, TbUsers } from "react-icons/tb";
import { PiUserDuotone } from "react-icons/pi";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/auth";
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
type MemberModuleId = "home" | "finance" | "community";

type ParentModule = {
  id: MemberModuleId;
  label: string;
  href: string;
  icon: NavIcon;
};

type SecondaryNavItem = {
  label: string;
  href: string;
  icon: NavIcon;
  end?: boolean;
};

const parentModules: ParentModule[] = [
  { id: "home", label: "Home", href: "/member", icon: TbLayoutDashboard },
  {
    id: "finance",
    label: "Finances",
    href: "/member/contributions",
    icon: FiCreditCard,
  },
  {
    id: "community",
    label: "Community",
    href: "/member/meetings",
    icon: TbUsers,
  },
];

const homeNavItems: SecondaryNavItem[] = [
  {
    label: "Dashboard",
    href: "/member",
    icon: MdSpaceDashboard,
    end: true,
  },
  { label: "My Profile", href: "/member/profile", icon: PiUserDuotone },
  {
    label: "Notifications",
    href: "/member/notifications",
    icon: MdOutlineNotificationsActive,
  },
];

const financeNavItems: SecondaryNavItem[] = [
  {
    label: "Contributions",
    href: "/member/contributions",
    icon: FiCreditCard,
    end: true,
  },
  { label: "Loans", href: "/member/loans", icon: FiFileText },
  { label: "Statements", href: "/member/statements", icon: FiFileText },
  {
    label: "Notifications",
    href: "/member/notifications",
    icon: MdOutlineNotificationsActive,
  },
];

const communityNavItems: SecondaryNavItem[] = [
  {
    label: "Meetings",
    href: "/member/meetings",
    icon: FiFileText,
    end: true,
  },
  { label: "Welfare Claims", href: "/member/welfare", icon: TbUsers },
  {
    label: "Notifications",
    href: "/member/notifications",
    icon: MdOutlineNotificationsActive,
  },
];

const bottomNavItems: SecondaryNavItem[] = [
  { label: "Home", href: "/member", icon: TbLayoutDashboard, end: true },
  { label: "Finances", href: "/member/contributions", icon: FiCreditCard },
  { label: "Community", href: "/member/meetings", icon: TbUsers },
  { label: "Profile", href: "/member/profile", icon: PiUserDuotone },
];

function getActiveMemberModule(pathname: string): MemberModuleId {
  if (
    pathname.startsWith("/member/contributions") ||
    pathname.startsWith("/member/loans") ||
    pathname.startsWith("/member/statements")
  ) {
    return "finance";
  }
  if (
    pathname.startsWith("/member/meetings") ||
    pathname.startsWith("/member/welfare")
  ) {
    return "community";
  }
  return "home";
}

function buildSecondaryNav(moduleId: MemberModuleId): SecondaryNavItem[] {
  if (moduleId === "finance") return financeNavItems;
  if (moduleId === "community") return communityNavItems;
  return homeNavItems;
}

function moduleSectionLabel(moduleId: MemberModuleId): string {
  if (moduleId === "finance") return "Savings & loans";
  if (moduleId === "community") return "Meetings & welfare";
  return "Member account";
}

function getInitials(name?: string) {
  if (!name) return "CG";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isHrefActive(pathname: string, item: SecondaryNavItem) {
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const workspaces = useMemo(() => availableWorkspaces(user), [user]);
  const currentWorkspace: WorkspaceKey = "member";
  const isConstitution = location.pathname === "/member/constitution";

  const activeModule = useMemo(
    () => (isConstitution ? "home" : getActiveMemberModule(location.pathname)),
    [location.pathname, isConstitution],
  );

  const secondaryNav = useMemo(
    () => buildSecondaryNav(activeModule),
    [activeModule],
  );

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
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function closeDropdowns(event: MouseEvent) {
      const target = event.target as Node;
      if (headerRef.current?.contains(target)) return;
      setNotificationsOpen(false);
      setProfileOpen(false);
      setMobileMenuOpen(false);
    }
    document.addEventListener("mousedown", closeDropdowns);
    return () => document.removeEventListener("mousedown", closeDropdowns);
  }, []);

  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-gray-200 bg-white shadow-xs">
        <div ref={headerRef} className="relative mx-auto max-w-7xl">
          {/* Primary row */}
          <div className="flex items-center justify-between gap-3 px-3 py-1 lg:px-3">
            <Link
              to="/member"
              className="flex min-w-0 shrink items-center gap-2.5"
            >
              <img
                src="/logo.png"
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src.endsWith("/favicon.svg")) return;
                  img.src = "/favicon.svg";
                }}
              />
              <div className="min-w-0">
                <p className="text-[0.85rem] lg:text-base my-0.5 font-extrabold leading-tight text-primary-700">
                  Clin-Grow Welfare
                </p>
                <p className="text-[0.65rem] lg:text-[0.7rem] font-semibold text-gray-500">
                  Member portal
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              {!isConstitution ? (
                <nav
                  className="hidden items-center gap-1 lg:flex"
                  aria-label="Member modules"
                >
                  {parentModules.map((mod) => {
                    const isActive = activeModule === mod.id;
                    const Icon = mod.icon;
                    return (
                      <Link
                        key={mod.id}
                        to={mod.href}
                        className={clsx(
                          "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[0.85rem] transition active:scale-[0.98]",
                          isActive
                            ? "bg-brand-600 font-semibold text-white shadow-sm"
                            : "font-bold text-primary-700 hover:bg-brand-50",
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                        {mod.label}
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
                onBellInteract={() => {
                  setProfileOpen(false);
                  setMobileMenuOpen(false);
                }}
              />

              <div className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen((o) => !o);
                    setNotificationsOpen(false);
                    setMobileMenuOpen(false);
                  }}
                  className="flex h-[2.6rem] items-center gap-2 rounded-[0.7rem] border border-gray-300/80 bg-white pl-[0.3rem] pr-2.5 text-ink-700 shadow-sm transition hover:bg-ink-50"
                  aria-label="Profile menu"
                  aria-expanded={profileOpen}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-[0.6rem] bg-brand-600 text-xs font-bold text-white">
                    {getInitials(user?.name)}
                  </span>
                  <span className="max-w-28 truncate text-[0.82rem] font-bold text-primary-800">
                    {user?.name?.split(" ")[0] ?? "Member"}
                  </span>
                  <FiChevronDown className="h-4 w-4 text-gray-500" />
                </button>
                {profileOpen ? (
                  <div className="absolute right-0 z-50 mt-2 w-[18rem] overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.18)] lg:w-64">
                    <div className="border-b border-ink-100 px-4 py-3">
                      <p className="truncate text-sm font-bold text-gray-900">
                        {user?.name ?? "Member"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {user?.email ?? user?.phone ?? "Member workspace"}
                      </p>
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

              <button
                type="button"
                className="flex h-10 w-9 shrink-0 items-center justify-center transition lg:hidden"
                aria-expanded={mobileMenuOpen}
                aria-controls="member-mobile-nav"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                onClick={() => {
                  setMobileMenuOpen((open) => !open);
                  setNotificationsOpen(false);
                  setProfileOpen(false);
                }}
              >
                {mobileMenuOpen ? (
                  <FiX className="h-5 w-5" />
                ) : (
                  <FiMenu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Secondary row (desktop) */}
          {!isConstitution ? (
            <div className="hidden border-t border-gray-200/70 bg-ink-50/50 lg:block">
              <div className="flex items-center justify-between gap-3 px-3 py-1">
                <p className="min-w-0 pl-1 font-google text-sm font-bold text-secondary-600">
                  {moduleSectionLabel(activeModule)}
                </p>
                <nav
                  className="flex items-center gap-1"
                  aria-label="Member sections"
                >
                  {secondaryNav.map((item) => (
                    <Link
                      key={`${item.label}-${item.href}`}
                      to={item.href}
                      aria-current={
                        isHrefActive(location.pathname, item)
                          ? "page"
                          : undefined
                      }
                      className={clsx(
                        "inline-flex items-center justify-center px-3 py-1.5 text-[0.85rem] font-bold transition active:scale-[0.98]",
                        isHrefActive(location.pathname, item)
                          ? "border-b-2 border-secondary-600 text-secondary-600 hover:text-secondary-800"
                          : "text-gray-700 hover:text-gray-900",
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          ) : null}

          <div
            id="member-mobile-nav"
            className={clsx(
              "origin-top transition-all duration-300 lg:hidden",
              mobileMenuOpen
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0",
            )}
          >
            <div
              className={clsx(
                "absolute left-0 right-0 top-full z-50 px-2 transition-all duration-300",
                mobileMenuOpen
                  ? "translate-y-0 scale-100"
                  : "-translate-y-3 scale-95",
              )}
            >
              <div className="mx-auto w-full max-w-md pb-3">
                <div className="relative overflow-hidden rounded-b-2xl border border-slate-200/90 bg-white/95 p-3 shadow-xl backdrop-blur-[2px]">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-linear-to-br from-brand-50/60 via-white to-emerald-50/30"
                  />
                 
                  <nav
                    className="relative z-10 flex flex-col gap-1"
                    aria-label="Member sections"
                  >
                    {secondaryNav.map((item) => {
                      const Icon = item.icon;
                      const active = isHrefActive(location.pathname, item);
                      return (
                        <Link
                          key={`${activeModule}-${item.label}-${item.href}`}
                          to={item.href}
                          onClick={closeMobileMenu}
                          aria-current={active ? "page" : undefined}
                          className={clsx(
                            "group flex items-center justify-between rounded-xl px-4 py-2.5 text-[0.8rem] font-semibold transition",
                            active
                              ? "bg-brand-600 text-white"
                              : "text-slate-700 hover:bg-slate-100",
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <Icon className="h-5 w-5 shrink-0" />
                            {item.label}
                          </span>
                          <FiChevronRight className="h-4 w-4 shrink-0 opacity-60 transition group-hover:translate-x-0.5" />
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="relative z-10 my-3 border-t border-dashed border-slate-200" />

                  <div className="relative z-10 flex flex-col gap-2 px-2">
                    <div className="flex flex-wrap gap-2">
                      {parentModules.map((mod) => {
                        const Icon = mod.icon;
                        const active = activeModule === mod.id;
                        return (
                          <Link
                            key={mod.id}
                            to={mod.href}
                            onClick={closeMobileMenu}
                            className={clsx(
                              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[0.7rem] font-bold",
                              active
                                ? "bg-brand-600 text-white"
                                : "border border-slate-200 bg-white text-slate-700",
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {mod.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="relative z-10 mt-3 border-t border-dashed border-slate-200 pt-3">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50"
                    >
                      <FiLogOut className="h-5 w-5" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <button
        type="button"
        aria-hidden={!mobileMenuOpen}
        tabIndex={-1}
        onClick={() => setMobileMenuOpen(false)}
        className={clsx(
          "fixed inset-0 z-[35] cursor-default bg-slate-900/25 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden",
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {!isConstitution ? (
        <nav
          aria-label="Member quick navigation"
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-6px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:hidden"
        >
          <ul className="mx-auto grid max-w-md grid-cols-4 gap-1">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isProfile = item.href === "/member/profile";
              const isActive = isProfile
                ? location.pathname.startsWith("/member/profile")
                : item.href === "/member"
                  ? activeModule === "home" &&
                    !location.pathname.startsWith("/member/profile")
                  : item.href === "/member/contributions"
                    ? activeModule === "finance"
                    : item.href === "/member/meetings"
                      ? activeModule === "community"
                      : isHrefActive(location.pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={clsx(
                      "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[0.65rem] font-bold transition",
                      isActive
                        ? "bg-primary-100/70 text-primary-700"
                        : "text-slate-500 hover:text-primary-700",
                    )}
                  >
                    <Icon
                      className={clsx(
                        "h-[1.35rem] w-[1.35rem]",
                        isActive ? "text-primary-700" : "text-slate-500",
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
