import { createBrowserRouter, Outlet } from "react-router-dom";
import {
  PermissionGate,
  ProtectedRoute,
  RequireAdmin,
  RequireOfficial,
  RequireMember,
} from "@/components/ProtectedRoute";
import { HomeRedirect } from "@/components/HomeRedirect";
import { AdminLayout, OfficialsLayout, MemberLayout } from "@/layouts";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { MemberRegistrationPage } from "@/pages/auth/MemberRegistrationPage";
import { Placeholder } from "@/pages/auth/Placeholder";
import { MembersPage } from "@/pages/admin/members";
import { UserRolesPage } from "@/pages/admin/UserRolesPage";
import { RolesPermissionsPage } from "@/pages/admin/RolesPermissionsPage";
import { SystemSettingsPage } from "@/pages/admin/SystemSettingsPage";
import { MemberDashboardPage } from "@/pages/member/DashboardPage";
import { MemberProfilePage } from "@/pages/member/ProfilePage";
import { MemberContributionsPage } from "@/pages/member/ContributionsPage";
import { MemberLoansPage } from "@/pages/member/LoansPage";
import { MemberMeetingsPage } from "@/pages/member/MeetingsPage";
import { MemberMeetingDetailPage } from "@/pages/member/MemberMeetingDetailPage";
import { MemberWelfareClaimsPage } from "@/pages/member/WelfareClaimsPage";
import { MemberStatementsPage } from "@/pages/member/StatementsPage";
import { MemberConstitutionPage } from "@/pages/member/MemberConstitutionPage";
import { ForbiddenPage } from "@/pages/ForbiddenPage";
import { WelfarePage } from "@/pages/admin/welfare/WelfareClaimsPage";
import { MeetingsPage } from "@/pages/admin/meetings/MeetingsPage";
import { ApprovalsPage } from "@/pages/admin/approvals/ApprovalsPage";
import { ReportsPage } from "@/pages/admin/reports/ReportsPage";
import { RouteErrorPage } from "@/pages/RouteErrorPage";
import { PortalDashboardPage } from "@/pages/PortalDashboardPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { FinancialYearsPage } from "@/pages/admin/finance/FinancialYearsPage";
import { Navigate } from "react-router-dom";
import { LedgerHubPage } from "@/pages/admin/finance/LedgerHubPage";
import { ContributionsPage } from "@/pages/admin/finance/ContributionsPage";
import { LoansPage } from "@/pages/admin/finance/LoansPage";
import { VouchersPage } from "@/pages/admin/finance/VouchersPage";
import { ScrollToTop } from "@/components/routing/ScrollToTop";

function RouteShell() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <RouteShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/", element: <HomeRedirect /> },
      { path: "/forbidden", element: <ForbiddenPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <MemberRegistrationPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/dashboard",
            element: <RequireAdmin />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  {
                    index: true,
                    element: <PortalDashboardPage portal="admin" />,
                  },
                  {
                    path: "users",
                    element: (
                      <PermissionGate permission="users.view">
                        <UserRolesPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "roles",
                    element: (
                      <PermissionGate permission="roles.view">
                        <RolesPermissionsPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "settings",
                    element: (
                      <PermissionGate permission="welfareSettings.view">
                        <SystemSettingsPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "members",
                    element: (
                      <PermissionGate permission="officialsPortal.members.view">
                        <MembersPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "ledger",
                    element: (
                      <PermissionGate permission="ledger.journal.view">
                        <LedgerHubPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "ledger/journals",
                    element: (
                      <Navigate to="/dashboard/ledger?tab=journals" replace />
                    ),
                  },
                  {
                    path: "ledger/accounts",
                    element: (
                      <Navigate to="/dashboard/ledger?tab=accounts" replace />
                    ),
                  },
                  {
                    path: "ledger/financial-years",
                    element: (
                      <PermissionGate permission="financialYears.view">
                        <FinancialYearsPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "contributions",
                    element: (
                      <PermissionGate permission="officialsPortal.contributions.view">
                        <ContributionsPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "loans",
                    element: (
                      <PermissionGate permission="officialsPortal.loans.view">
                        <LoansPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "vouchers",
                    element: (
                      <PermissionGate permission="officialsPortal.vouchers.view">
                        <VouchersPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "welfare",
                    element: (
                      <PermissionGate permission="officialsPortal.welfareClaims.view">
                        <WelfarePage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "meetings",
                    element: (
                      <PermissionGate permission="officialsPortal.meetings.view">
                        <MeetingsPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "approvals",
                    element: (
                      <PermissionGate permission="officialsPortal.approvals.view">
                        <ApprovalsPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "reports",
                    element: (
                      <PermissionGate permission="officialsPortal.reports.view">
                        <ReportsPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "settings",
                    element: (
                      <PermissionGate permission="welfareSettings.view">
                        <SystemSettingsPage />
                      </PermissionGate>
                    ),
                  },
                  { path: "notifications", element: <NotificationsPage /> },
                ],
              },
            ],
          },
          {
            path: "/officials",
            element: <RequireOfficial />,
            children: [
              {
                element: <OfficialsLayout />,
                children: [
                  {
                    index: true,
                    element: <PortalDashboardPage portal="officials" />,
                  },
                  {
                    path: "members",
                    element: (
                      <PermissionGate permission="officialsPortal.members.view">
                        <MembersPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "ledger",
                    element: (
                      <PermissionGate permission="ledger.journal.view">
                        <LedgerHubPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "ledger/journals",
                    element: (
                      <Navigate to="/officials/ledger?tab=journals" replace />
                    ),
                  },
                  {
                    path: "ledger/accounts",
                    element: (
                      <Navigate to="/officials/ledger?tab=accounts" replace />
                    ),
                  },
                  {
                    path: "ledger/financial-years",
                    element: (
                      <PermissionGate permission="financialYears.view">
                        <FinancialYearsPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "contributions",
                    element: (
                      <PermissionGate permission="officialsPortal.contributions.view">
                        <ContributionsPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "loans",
                    element: (
                      <PermissionGate permission="officialsPortal.loans.view">
                        <LoansPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "vouchers",
                    element: (
                      <PermissionGate permission="officialsPortal.vouchers.view">
                        <VouchersPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "welfare",
                    element: (
                      <PermissionGate permission="officialsPortal.welfareClaims.view">
                        <WelfarePage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "meetings",
                    element: (
                      <PermissionGate permission="officialsPortal.meetings.view">
                        <MeetingsPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "approvals",
                    element: (
                      <PermissionGate permission="officialsPortal.approvals.view">
                        <ApprovalsPage />
                      </PermissionGate>
                    ),
                  },
                  {
                    path: "reports",
                    element: (
                      <PermissionGate permission="officialsPortal.reports.view">
                        <ReportsPage />
                      </PermissionGate>
                    ),
                  },
                  { path: "notifications", element: <NotificationsPage /> },
                ],
              },
            ],
          },
          {
            path: "/member",
            element: <RequireMember />,
            children: [
              {
                element: <MemberLayout />,
                children: [
                  { path: "constitution", element: <MemberConstitutionPage /> },
                  { index: true, element: <MemberDashboardPage /> },
                  { path: "profile", element: <MemberProfilePage /> },
                  {
                    path: "contributions",
                    element: <MemberContributionsPage />,
                  },
                  { path: "loans", element: <MemberLoansPage /> },
                  { path: "meetings", element: <MemberMeetingsPage /> },
                  {
                    path: "meetings/:id",
                    element: <MemberMeetingDetailPage />,
                  },
                  { path: "welfare", element: <MemberWelfareClaimsPage /> },
                  { path: "statements", element: <MemberStatementsPage /> },
                  { path: "notifications", element: <NotificationsPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
