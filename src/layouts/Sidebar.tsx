import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  filterNavGroups,
  type NavGroupDef,
  type NavItemDef,
} from "@/navigation/adminNav";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/uiStore";

function normalizePath(path: string) {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function isNavActive(item: NavItemDef, pathname: string) {
  const current = normalizePath(pathname);
  const target = normalizePath(item.path);
  if (item.path === "/dashboard" || item.path === "/officials") {
    return current === target;
  }
  return current === target || current.startsWith(`${target}/`);
}

type SidebarProps = {
  groups: NavGroupDef[];
  brandTitle: string;
  brandSubtitle?: string;
};

export function Sidebar({ groups, brandTitle, brandSubtitle }: SidebarProps) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const mobileDrawerOpen = useUiStore((s) => s.mobileDrawerOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const closeMobileDrawer = useUiStore((s) => s.closeMobileDrawer);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 1023px)");

  const visibleGroups = useMemo(
    () => filterNavGroups(groups, user?.permissions ?? []),
    [groups, user?.permissions],
  );

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(visibleGroups.map((g) => g.id)),
  );

  useEffect(() => {
    if (!isMobile) closeMobileDrawer();
  }, [isMobile, closeMobileDrawer]);

  useEffect(() => {
    setOpenGroups(new Set(visibleGroups.map((g) => g.id)));
  }, [visibleGroups]);

  const showMobileDrawer = isMobile && mobileDrawerOpen;

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const NavItem = ({ item }: { item: NavItemDef }) => {
    const Icon = item.icon;
    const active = isNavActive(item, location.pathname);

    return (
      <Link
        to={item.path}
        title={collapsed && !isMobile ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        onClick={() => isMobile && closeMobileDrawer()}
        className={clsx(
          "group relative flex min-h-10 items-center gap-3 rounded-r-xl px-3 py-2 text-[0.8rem] font-semibold transition-all duration-200",
          active
            ? "border-l-[3px] border-white bg-amber-600 text-white shadow-sm"
            : "border-l-[3px] border-transparent text-slate-200 hover:bg-white/10 hover:text-white",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" />
        {(!collapsed || isMobile) && (
          <span className="truncate">{item.label}</span>
        )}
      </Link>
    );
  };

  return (
    <>
      {showMobileDrawer ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-primary-900/55 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={closeMobileDrawer}
        />
      ) : null}

      <aside
        style={{
          background:
            "linear-gradient(165deg, #0d223f 0%, #102a4d 45%, #15345f 100%)",
        }}
        className={clsx(
          "relative z-50 flex h-full shrink-0 flex-col overflow-hidden border-r border-primary-600/40 transition-all duration-300 ease-in-out",
          collapsed && !isMobile ? "w-20" : "w-[270px]",
          isMobile &&
            clsx(
              "fixed inset-y-0 left-0 w-[270px] max-w-[min(270px,100vw)]",
              mobileDrawerOpen ? "translate-x-0" : "-translate-x-full",
            ),
          !isMobile && "translate-x-0",
        )}
      >
        <div
          className={clsx(
            "relative flex h-[4.5rem] shrink-0 items-center border-b border-white/20",
            collapsed && !isMobile
              ? "justify-center px-2"
              : "justify-between px-4",
          )}
        >
          <div
            className={clsx(
              "flex min-w-0 flex-col",
              collapsed && !isMobile && "items-center",
            )}
          >
            {(!collapsed || isMobile) && (
              <>
                <span className="font-google text-sm font-bold text-white">
                  {brandTitle}
                </span>
                {brandSubtitle ? (
                  <span className="truncate text-[0.65rem] font-medium text-primary-200">
                    {brandSubtitle}
                  </span>
                ) : null}
              </>
            )}
          </div>
          {isMobile ? (
            <button
              type="button"
              onClick={closeMobileDrawer}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <FiX className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <nav className="relative min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-2.5 py-3 scrollbar-hide">
          {visibleGroups.map((group) => {
            const isOpen = openGroups.has(group.id);
            return (
              <div key={group.id}>
                {(!collapsed || isMobile) && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="mb-1 flex w-full items-center justify-between px-2 text-[0.65rem] font-bold uppercase tracking-widest text-primary-200/80"
                  >
                    {group.label}
                    <span className="text-white/50">{isOpen ? "−" : "+"}</span>
                  </button>
                )}
                {(isOpen || collapsed) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavItem key={item.path} item={item} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {!isMobile ? (
          <div className="shrink-0 border-t border-white/15 p-2">
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <FiChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <FiChevronLeft className="h-4 w-4" />
                  <span className="text-xs font-semibold">Collapse</span>
                </>
              )}
            </button>
          </div>
        ) : null}
      </aside>
    </>
  );
}
