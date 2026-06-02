import { createBrowserRouter } from 'react-router-dom';
import { PermissionGate, ProtectedRoute, RequireAdmin, RequireOfficial, RequireMember } from '@/components/ProtectedRoute';
import { HomeRedirect } from '@/components/HomeRedirect';
import { AdminLayout, OfficialsLayout, MemberLayout } from '@/layouts';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { MemberRegistrationPage } from '@/pages/auth/MemberRegistrationPage';
import { Placeholder } from '@/pages/auth/Placeholder';
import { MembersPage } from '@/pages/admin/members';
import { MemberDashboardPage } from '@/pages/member/DashboardPage';
import { MemberProfilePage } from '@/pages/member/ProfilePage';
import { MemberContributionsPage } from '@/pages/member/ContributionsPage';
import { MemberLoansPage } from '@/pages/member/LoansPage';
import { MemberMeetingsPage } from '@/pages/member/MeetingsPage';
import { MemberWelfareClaimsPage } from '@/pages/member/WelfareClaimsPage';
import { MemberStatementsPage } from '@/pages/member/StatementsPage';
import { MemberConstitutionPage } from '@/pages/member/MemberConstitutionPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { WelfarePage, MeetingsPage, ApprovalsPage, ReportsPage } from '@/pages/admin/phase5to9';
import { RouteErrorPage } from '@/pages/RouteErrorPage';
import { PortalDashboardPage } from '@/pages/PortalDashboardPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { FinancialYearsPage } from '@/pages/admin/finance/FinancialYearsPage';
import { ChartOfAccountsPage } from '@/pages/admin/finance/ChartOfAccountsPage';
import { JournalsPage } from '@/pages/admin/finance/JournalsPage';
import { ContributionsPage } from '@/pages/admin/finance/ContributionsPage';
import { LoansPage } from '@/pages/admin/finance/LoansPage';

export const router = createBrowserRouter([
  { path: '/', element: <HomeRedirect />, errorElement: <RouteErrorPage /> },
  { path: '/forbidden', element: <ForbiddenPage />, errorElement: <RouteErrorPage /> },
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
  { path: '/register', element: <MemberRegistrationPage />, errorElement: <RouteErrorPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage />, errorElement: <RouteErrorPage /> },
  { path: '/reset-password', element: <ResetPasswordPage />, errorElement: <RouteErrorPage /> },
  { element: <ProtectedRoute />, errorElement: <RouteErrorPage />, children: [
    { path: '/dashboard', element: <RequireAdmin />, children: [{ element: <AdminLayout />, children: [
      { index: true, element: <PortalDashboardPage portal='admin' /> },
      { path: 'members', element: <PermissionGate permission='officialsPortal.members.view'><MembersPage /></PermissionGate> },
      { path: 'ledger', element: <PermissionGate permission='ledger.journal.view'><JournalsPage /></PermissionGate> },
      { path: 'ledger/journals', element: <PermissionGate permission='ledger.journal.view'><JournalsPage /></PermissionGate> },
      { path: 'ledger/accounts', element: <PermissionGate permission='ledger.accounts.view'><ChartOfAccountsPage /></PermissionGate> },
      { path: 'ledger/financial-years', element: <PermissionGate permission='financialYears.view'><FinancialYearsPage /></PermissionGate> },
      { path: 'contributions', element: <PermissionGate permission='officialsPortal.contributions.view'><ContributionsPage /></PermissionGate> },
      { path: 'loans', element: <PermissionGate permission='officialsPortal.loans.view'><LoansPage /></PermissionGate> },
      { path: 'welfare', element: <PermissionGate permission='officialsPortal.welfareClaims.view'><WelfarePage /></PermissionGate> },
      { path: 'meetings', element: <PermissionGate permission='officialsPortal.meetings.view'><MeetingsPage /></PermissionGate> },
      { path: 'approvals', element: <PermissionGate permission='officialsPortal.approvals.view'><ApprovalsPage /></PermissionGate> },
      { path: 'reports', element: <PermissionGate permission='officialsPortal.reports.view'><ReportsPage /></PermissionGate> },
      { path: 'notifications', element: <NotificationsPage /> }
    ]}]},
    { path: '/officials', element: <RequireOfficial />, children: [{ element: <OfficialsLayout />, children: [
      { index: true, element: <PortalDashboardPage portal='officials' /> },
      { path: 'members', element: <PermissionGate permission='officialsPortal.members.view'><MembersPage /></PermissionGate> },
      { path: 'ledger', element: <PermissionGate permission='ledger.journal.view'><JournalsPage /></PermissionGate> },
      { path: 'ledger/journals', element: <PermissionGate permission='ledger.journal.view'><JournalsPage /></PermissionGate> },
      { path: 'ledger/accounts', element: <PermissionGate permission='ledger.accounts.view'><ChartOfAccountsPage /></PermissionGate> },
      { path: 'ledger/financial-years', element: <PermissionGate permission='financialYears.view'><FinancialYearsPage /></PermissionGate> },
      { path: 'contributions', element: <PermissionGate permission='officialsPortal.contributions.view'><ContributionsPage /></PermissionGate> },
      { path: 'loans', element: <PermissionGate permission='officialsPortal.loans.view'><LoansPage /></PermissionGate> },
      { path: 'welfare', element: <PermissionGate permission='officialsPortal.welfareClaims.view'><WelfarePage /></PermissionGate> },
      { path: 'meetings', element: <PermissionGate permission='officialsPortal.meetings.view'><MeetingsPage /></PermissionGate> },
      { path: 'approvals', element: <PermissionGate permission='officialsPortal.approvals.view'><ApprovalsPage /></PermissionGate> },
      { path: 'reports', element: <PermissionGate permission='officialsPortal.reports.view'><ReportsPage /></PermissionGate> },
      { path: 'notifications', element: <NotificationsPage /> }
    ]}]},
    { path: '/member', element: <RequireMember />, children: [{ element: <MemberLayout />, children: [
      { path: 'constitution', element: <MemberConstitutionPage /> },
      { index: true, element: <MemberDashboardPage /> },
      { path: 'profile', element: <MemberProfilePage /> },
      { path: 'contributions', element: <MemberContributionsPage /> },
      { path: 'loans', element: <MemberLoansPage /> },
      { path: 'meetings', element: <MemberMeetingsPage /> },
      { path: 'welfare', element: <MemberWelfareClaimsPage /> },
      { path: 'statements', element: <MemberStatementsPage /> },
      { path: 'notifications', element: <NotificationsPage /> }
    ]}]}
  ]}
]);
