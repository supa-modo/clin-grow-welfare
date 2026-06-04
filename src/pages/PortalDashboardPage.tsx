import { useCallback } from 'react';
import { TbCalendarTime, TbCashBanknote, TbRefresh, TbShieldHalfFilled, TbUsers } from 'react-icons/tb';
import {
  ContributionsTrendChart,
  FundBalancesChart,
  LoanAgingBucketsChart,
  MemberGrowthChart,
  MemberStatusChart,
  PortalDashboardTables,
} from '@/components/dashboard/PortalDashboardCharts';
import {
  adminQuickLinks,
  officialQuickLinks,
  PortalQuickLinks,
} from '@/components/dashboard/PortalQuickLinks';
import { firstNameFromDisplayName, getGreeting } from '@/components/dashboard/portalDashboardUtils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { money } from '@/pages/admin/shared/adminFormatters';
import { StateBlock, useLoad } from '@/pages/admin/shared/adminUi';
import { reportApi } from '@/services/reportApi';
import { useAuthStore } from '@/store/auth';

type PortalDashboardPageProps = {
  portal: 'admin' | 'officials';
};

function hasPermission(permissions: string[], name: string) {
  return permissions.includes(name);
}

export function PortalDashboardPage({ portal }: PortalDashboardPageProps) {
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions ?? [];
  const canViewReports = hasPermission(
    permissions,
    'officialsPortal.reports.view',
  );
  const canViewApprovals = hasPermission(
    permissions,
    'officialsPortal.approvals.view',
  );

  const quickLinks = portal === 'admin' ? adminQuickLinks : officialQuickLinks;
  const approvalsHref =
    portal === 'admin' ? '/dashboard/approvals' : '/officials/approvals';
  const loansHref =
    portal === 'admin' ? '/dashboard/loans' : '/officials/loans';

  const subtitle =
    portal === 'admin'
      ? 'Executive overview of members, funds, loans, and welfare operations for Clin-Grow.'
      : 'Role-scoped welfare overview: registry health, funds, loans, and pending actions.';

  const loader = useCallback(
    () =>
      reportApi.loadPortalDashboard({
        canViewReports,
        canViewApprovals,
      }),
    [canViewReports, canViewApprovals],
  );

  const { data, loading, error, reload } = useLoad(loader, [
    canViewReports,
    canViewApprovals,
  ]);

  const executive = data?.executive;
  const displayName = user?.name ?? 'Authenticated user';

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Good ${getGreeting()}, ${firstNameFromDisplayName(displayName)}`}
        subtitle={subtitle}
        action={
          <Button
            size="sm"
            variant="secondary"
            icon={<TbRefresh />}
            onClick={() => void reload()}
          >
            Refresh
          </Button>
        }
      />

      {!canViewReports ? (
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink-700">
            Report metrics are not available for your role. Use the quick links
            below to open permitted workspace areas.
          </p>
        </Card>
      ) : (
        <>
          <StateBlock loading={loading} error={error} />
          {executive && !loading && !error ? (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={<TbUsers className="h-9 w-9" />}
                  iconColor="#2563eb"
                  label="Members"
                  value={executive.totalMembers.toLocaleString('en-KE')}
                  sub={`${executive.activeMembers} active · ${executive.nonCompliantMembers} need attention`}
                />
                <StatCard
                  icon={<TbShieldHalfFilled className="h-8 w-8" />}
                  iconColor="#0f766e"
                  label="Welfare kitty"
                  value={money(executive.welfareFundBalance)}
                  sub={`${money(executive.totalFunds)} across all funds`}
                />
                <StatCard
                  icon={<TbCashBanknote className="h-8 w-8" />}
                  iconColor="#7c3aed"
                  label="Loan book"
                  value={money(executive.totalLoanOutstanding)}
                  sub={`${executive.activeLoans.toLocaleString('en-KE')} active loans · ${executive.defaulters} in default or recovery`}
                />
                <StatCard
                  icon={<TbCalendarTime className="h-8 w-8" />}
                  iconColor="#be123c"
                  label="Action queue"
                  value={(
                    executive.pendingApprovals + executive.pendingClaims
                  ).toLocaleString('en-KE')}
                  sub={`${executive.pendingApprovals} approvals · ${executive.pendingClaims} welfare claims`}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <MemberStatusChart charts={executive.charts} />
                <FundBalancesChart funds={data?.funds ?? []} />
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                
                <ContributionsTrendChart charts={executive.charts} />
                <LoanAgingBucketsChart aging={data?.aging ?? []} />
              </div>

              <PortalDashboardTables
                approvals={data?.approvals ?? []}
                aging={data?.aging ?? []}
                loading={loading}
                approvalsHref={approvalsHref}
                loansHref={loansHref}
                showApprovals={canViewApprovals}
              />
            </>
          ) : null}
        </>
      )}

      <div>
        <h2 className="mb-3 text-sm font-extrabold text-ink-900">
          Quick actions
        </h2>
        <PortalQuickLinks cards={quickLinks} />
      </div>
    </div>
  );
}
