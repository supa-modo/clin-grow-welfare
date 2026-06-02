import { Outlet, useLocation } from "react-router-dom";
import { Toasts } from "@/components/ui/Feedback";
import { MemberTopBar } from "@/components/layouts/MemberTopBar";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { adminNavGroups, officialsNavGroups } from "@/navigation/adminNav";

export function AdminLayout() {
  return (
    <DashboardLayout
      navGroups={adminNavGroups}
      brandTitle="Clin-Grow Admin"
      brandSubtitle="Welfare operations"
      workspaceLabel="Administration"
    />
  );
}

export function OfficialsLayout() {
  return (
    <DashboardLayout
      navGroups={officialsNavGroups}
      brandTitle="Officials Portal"
      brandSubtitle="Welfare operations"
      workspaceLabel="Officials"
    />
  );
}

export function MemberLayout() {
  const location = useLocation();
  const isConstitution = location.pathname === "/member/constitution";

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-white text-ink-900">
      <MemberTopBar />
      <main
        className={`mx-auto min-h-[calc(100vh-5rem)] w-full max-w-7xl overflow-x-clip px-2 pb-24 sm:px-3 md:pb-10 lg:pb-10 ${
          isConstitution ? "pt-16" : "pt-16 lg:pt-24"
        }`}
      >
        <Outlet />
      </main>
      <footer className="border-t border-gray-200 bg-white px-4 py-2 pb-2 text-gray-600 lg:py-4 lg:pb-3.5">
        <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-2 text-center text-[0.7rem] sm:flex-row sm:text-left md:text-xs lg:text-[0.8rem]">
          <p className="font-semibold text-primary-600">
            &copy; {new Date().getFullYear()} Clin-Grow Welfare Group
          </p>
          <p className="text-secondary-500">
            Member Portal | Staff welfare savings & loans
          </p>
        </div>
      </footer>
      <Toasts />
    </div>
  );
}
