import { createBrowserRouter } from 'react-router-dom';
import { PermissionGate, ProtectedRoute, RequireAdmin, RequireOfficial, RequireMember } from '@/components/ProtectedRoute';
import { HomeRedirect } from '@/components/HomeRedirect';
import { AdminLayout, OfficialsLayout, MemberLayout } from '@/layouts';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { MemberRegistrationPage } from '@/pages/auth/MemberRegistrationPage';
import { Placeholder } from '@/pages/auth/Placeholder';
import { LedgerPage, ContributionsPage } from '@/pages/admin/pages';
import { MembersPage } from '@/pages/admin/members';
import { MemberBeneficiaryPage, MemberDashboardPage, MemberPlaceholderPage, MemberProfilePage } from '@/pages/member/dashboard';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { LoansPage, WelfarePage, MeetingsPage, ApprovalsPage, ReportsPage } from '@/pages/admin/phase5to9';
import { RouteErrorPage } from '@/pages/RouteErrorPage';

export const router = createBrowserRouter([
  { path: '/', element: <HomeRedirect />, errorElement: <RouteErrorPage /> },
  { path: '/forbidden', element: <ForbiddenPage />, errorElement: <RouteErrorPage /> },
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
  { path: '/register', element: <MemberRegistrationPage />, errorElement: <RouteErrorPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage />, errorElement: <RouteErrorPage /> },
  { path: '/reset-password', element: <ResetPasswordPage />, errorElement: <RouteErrorPage /> },
  { element: <ProtectedRoute />, errorElement: <RouteErrorPage />, children: [
    { path: '/dashboard', element: <RequireAdmin />, children: [{ element: <AdminLayout />, children: [
      { index: true, element: <Placeholder title='Admin Dashboard' /> },
      { path: 'members', element: <PermissionGate permission='officialsPortal.members.view'><MembersPage /></PermissionGate> },
      { path: 'ledger', element: <PermissionGate permission='ledger.journal.view'><LedgerPage /></PermissionGate> },
      { path: 'contributions', element: <PermissionGate permission='contributions.view'><ContributionsPage /></PermissionGate> },
      { path: 'loans', element: <PermissionGate permission='officialsPortal.loans.view'><LoansPage /></PermissionGate> },
      { path: 'welfare', element: <PermissionGate permission='officialsPortal.welfareClaims.view'><WelfarePage /></PermissionGate> },
      { path: 'meetings', element: <PermissionGate permission='officialsPortal.meetings.view'><MeetingsPage /></PermissionGate> },
      { path: 'approvals', element: <PermissionGate permission='officialsPortal.approvals.view'><ApprovalsPage /></PermissionGate> },
      { path: 'reports', element: <PermissionGate permission='officialsPortal.reports.view'><ReportsPage /></PermissionGate> }
    ]}]},
    { path: '/officials', element: <RequireOfficial />, children: [{ element: <OfficialsLayout />, children: [
      { index: true, element: <Placeholder title='Officials Dashboard' /> },
      { path: 'members', element: <PermissionGate permission='officialsPortal.members.view'><MembersPage /></PermissionGate> },
      { path: 'contributions', element: <PermissionGate permission='contributions.view'><ContributionsPage /></PermissionGate> },
      { path: 'loans', element: <PermissionGate permission='officialsPortal.loans.view'><LoansPage /></PermissionGate> },
      { path: 'welfare', element: <PermissionGate permission='officialsPortal.welfareClaims.view'><WelfarePage /></PermissionGate> },
      { path: 'meetings', element: <PermissionGate permission='officialsPortal.meetings.view'><MeetingsPage /></PermissionGate> },
      { path: 'approvals', element: <PermissionGate permission='officialsPortal.approvals.view'><ApprovalsPage /></PermissionGate> },
      { path: 'reports', element: <PermissionGate permission='officialsPortal.reports.view'><ReportsPage /></PermissionGate> }
    ]}]},
    { path: '/member', element: <RequireMember />, children: [{ element: <MemberLayout />, children: [
      { index: true, element: <MemberDashboardPage /> },
      { path: 'profile', element: <MemberProfilePage /> },
      { path: 'beneficiary', element: <MemberBeneficiaryPage /> },
      { path: 'contributions', element: <MemberPlaceholderPage title='My Contributions' description='Contribution history, receipts, and payment summaries will connect here during the contributions phase.' /> },
      { path: 'loans', element: <MemberPlaceholderPage title='My Loans' description='Loan eligibility, active balances, and repayment activity will connect here during the loans phase.' /> },
      { path: 'statements', element: <MemberPlaceholderPage title='Statements' description='Member statements will provide downloadable welfare account summaries once ledger reporting is available.' /> }
    ]}]}
  ]}
]);
