import { Outlet } from "react-router-dom";
import { Toasts } from "@/components/ui/Feedback";
import { displayRoleLabel } from "@/lib/workspaces";
import { Header } from "@/layouts/Header";
import { Sidebar } from "@/layouts/Sidebar";
import type { NavItemDef } from "@/navigation/adminNav";
import { useAuthStore } from "@/store/auth";

type DashboardLayoutProps = {
  navItems: NavItemDef[];
  brandTitle: string;
  brandSubtitle?: string;
  workspaceLabel?: string;
};

export function DashboardLayout({
  navItems,
  brandTitle,
  brandSubtitle,
  workspaceLabel,
}: DashboardLayoutProps) {
  const user = useAuthStore((s) => s.user);
  const roleLabel = displayRoleLabel(user);

  return (
    <div className="fixed inset-0 flex min-h-0 overflow-hidden">
      <Sidebar
        items={navItems}
        brandTitle={brandTitle}
        brandSubtitle={brandSubtitle}
        roleLabel={roleLabel}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header workspaceLabel={workspaceLabel} roleLabel={roleLabel} />
        <main
          data-route-scroll-container
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 py-4 md:px-4 lg:px-5"
        >
            <Outlet />
        </main>
      </div>
      <Toasts />
    </div>
  );
}
