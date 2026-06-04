import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { canViewLedgerNav } from "@/lib/workspaces";
import { filterNavItems, type NavItemDef } from "@/navigation/adminNav";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/uiStore";

function normalizePath(path: string) {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

type SidebarProps = {
  items: NavItemDef[];
  brandTitle: string;
  roleLabel?: string;
};

export function Sidebar({ items, brandTitle, roleLabel }: SidebarProps) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const mobileDrawerOpen = useUiStore((s) => s.mobileDrawerOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const closeMobileDrawer = useUiStore((s) => s.closeMobileDrawer);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 1023px)");

  const visibleItems = useMemo(() => {
    const filtered = filterNavItems(items, user?.permissions ?? []);
    return filtered.filter((item) => !item.ledgerNavOnly || canViewLedgerNav(user));
  }, [items, user]);

  const matchesPath = (item: NavItemDef) => {
    const currentPath = normalizePath(location.pathname);
    const itemPath = normalizePath(item.path);

    if (item.exactMatch) {
      return currentPath === itemPath;
    }

    return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
  };

  const activeItemPath = useMemo(() => {
    const matches = visibleItems.filter((item) => matchesPath(item));
    if (matches.length === 0) return null;
    matches.sort((a, b) => b.path.length - a.path.length);
    return matches[0].path;
  }, [location.pathname, visibleItems]);

  useEffect(() => {
    if (!isMobile) closeMobileDrawer();
  }, [isMobile, closeMobileDrawer]);

  const showMobileDrawer = isMobile && mobileDrawerOpen;

  const NavItem = ({ item }: { item: NavItemDef }) => {
    const Icon = item.icon;
    const active = item.path === activeItemPath;

    return (
      <Link
        to={item.path}
        title={collapsed && !isMobile ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        onClick={() => isMobile && closeMobileDrawer()}
        className={clsx(
          "group relative flex items-center gap-3 rounded-r-xl px-3 py-[0.4rem] transition-all duration-300",
          active
            ? "border-l-[3px] border-white bg-primary-600 text-white"
            : "border-l-[3px] border-transparent text-slate-300 hover:bg-white/35 hover:text-slate-200",
        )}
      >
        <span
          className={clsx(
            "shrink-0 transition-colors",
            active ? "text-white" : "text-slate-100 group-hover:text-slate-100",
          )}
        >
          <Icon className="h-6 w-6" />
        </span>
        {(!collapsed || isMobile) && (
          <span
            className={clsx(
              "whitespace-nowrap font-google text-[0.8rem] transition-colors",
              active
                ? "text-white"
                : "text-slate-200 group-hover:text-slate-100",
            )}
          >
            {item.label}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {showMobileDrawer ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-primary-600/60 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={closeMobileDrawer}
        />
      ) : null}

      <aside
        style={{
          background:
            "linear-gradient(160deg, #14532d 0%, #15803d 50%, #14532d 100%)",
        }}
        className={clsx(
          "relative z-50 flex h-full shrink-0 flex-col overflow-hidden border-r border-primary-600 transition-all duration-300 ease-in-out",
          collapsed && !isMobile ? "w-[80px]" : "w-[270px]",
          isMobile &&
            clsx(
              "fixed inset-y-0 left-0 w-[270px] max-w-[min(270px,100vw)]",
              mobileDrawerOpen ? "translate-x-0" : "-translate-x-full",
            ),
          !isMobile && "translate-x-0",
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Ccircle cx='7' cy='7' r='1.2'/%3E%3Ccircle cx='27' cy='7' r='1.2'/%3E%3Ccircle cx='47' cy='7' r='1.2'/%3E%3Ccircle cx='7' cy='27' r='1.2'/%3E%3Ccircle cx='27' cy='27' r='1.2'/%3E%3Ccircle cx='47' cy='27' r='1.2'/%3E%3Ccircle cx='7' cy='47' r='1.2'/%3E%3Ccircle cx='27' cy='47' r='1.2'/%3E%3Ccircle cx='47' cy='47' r='1.2'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        

        <div
          className={clsx(
            "relative flex h-18 shrink-0 items-center border-b border-white/30",
            collapsed && !isMobile
              ? "justify-center px-0"
              : "justify-between px-4",
          )}
        >
          {(!collapsed || isMobile) && (
            <div className="flex min-w-0 items-center gap-2.5">
              <img
                src="/logo.webp"
                alt=""
                className="h-16 w-16 shrink-0"
              />
              <div className="min-w-0 flex-col">
                <span className="font-google text-lg font-extrabold leading-tight tracking-wide text-primary-300">
                  {brandTitle}
                </span>
               
                
              </div>
            </div>
          )}
          {collapsed && !isMobile && (
            <img
              src="/logo.webp"
              alt={brandTitle}
              title={brandTitle}
              className="h-16 w-16 shrink-0"
            />
          )}
          {isMobile ? (
            <button
              type="button"
              onClick={closeMobileDrawer}
              className="ml-auto rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Close menu"
            >
              <FiX className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <nav className="relative min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2.5 py-3 scrollbar-hide">
          {visibleItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>

        {!isMobile ? (
          <div className="relative shrink-0 border-t border-white/30 p-2.5">
            <button
              type="button"
              onClick={toggleSidebar}
              className={clsx(
                "flex w-full items-center rounded-xl bg-white/5 px-3 py-2 text-slate-300 transition-all duration-200 hover:bg-white/15 hover:text-slate-200",
                collapsed ? "justify-center" : "justify-between",
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {!collapsed && (
                <span className="text-[0.9rem] font-medium">Collapse</span>
              )}
              {collapsed ? (
                <FiChevronRight className="h-4 w-4 text-slate-200" />
              ) : (
                <FiChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>
        ) : null}
      </aside>
    </>
  );
}
