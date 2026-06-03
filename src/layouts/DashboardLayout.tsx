import { Outlet } from "react-router-dom";
import { Toasts } from "@/components/ui/Feedback";
import { Header } from "@/layouts/Header";
import { Sidebar } from "@/layouts/Sidebar";
import type { NavGroupDef } from "@/navigation/adminNav";

type DashboardLayoutProps = {
  navGroups: NavGroupDef[];
  brandTitle: string;
  brandSubtitle?: string;
  workspaceLabel?: string;
};

export function DashboardLayout({
  navGroups,
  brandTitle,
  brandSubtitle,
  workspaceLabel,
}: DashboardLayoutProps) {
  return (
    <div className="fixed inset-0 flex min-h-0 overflow-hidden">
      <Sidebar
        groups={navGroups}
        brandTitle={brandTitle}
        brandSubtitle={brandSubtitle}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header workspaceLabel={workspaceLabel} />
        <main
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 py-4 md:px-4 lg:px-5"
        >
            <Outlet />
        </main>
      </div>
      <Toasts />
    </div>
  );
}
