import { useSearchParams } from 'react-router-dom';
import { TbBook2, TbBuildingBank, TbCashBanknote, TbListDetails } from 'react-icons/tb';
import { AdminPageLayout, AdminPageStatsGrid } from '@/layouts/AdminPageLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import StatCard from '@/components/ui/StatCard';
import { JournalsPage } from '@/pages/admin/finance/JournalsPage';
import { ChartOfAccountsPage } from '@/pages/admin/finance/ChartOfAccountsPage';
import { ledgerApi } from '@/services/ledgerApi';
import { money } from '@/pages/admin/shared/adminFormatters';
import { useLoad } from '@/pages/admin/shared/adminUi';

type LedgerTab = 'journals' | 'accounts';

export function LedgerHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: LedgerTab = searchParams.get('tab') === 'accounts' ? 'accounts' : 'journals';
  const { data: stats } = useLoad(async () => {
    const [journals, accounts, funds] = await Promise.all([
      ledgerApi.listJournals({ page: 1, pageSize: 25 }),
      ledgerApi.listAccounts(),
      ledgerApi.listFunds(),
    ]);
    const postedValue = journals.data.reduce((sum, entry) => (
      sum + (entry.lines?.reduce((lineSum, line) => lineSum + Number(line.debitAmount), 0) ?? 0)
    ), 0);
    return {
      journalTotal: journals.meta?.total ?? journals.data.length,
      postedValue,
      accountTotal: accounts.length,
      fundTotal: funds.length,
    };
  }, []);

  return (
    <AdminPageLayout>
      <PageHeader
        title="Ledger"
        subtitle="Journal entries and chart of accounts"
      />
      <AdminPageStatsGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TbBook2} iconColor="#1f7a76" label="Journal entries" value={stats?.journalTotal ?? '...'} subtitle="Posted ledger activity" />
        <StatCard icon={TbCashBanknote} iconColor="#16a34a" label="Journal value" value={stats ? money(stats.postedValue) : '...'} subtitle="Loaded debit total" />
        <StatCard icon={TbListDetails} iconColor="#334155" label="Accounts" value={stats?.accountTotal ?? '...'} subtitle="Chart of accounts" />
        <StatCard icon={TbBuildingBank} iconColor="#d97706" label="Funds" value={stats?.fundTotal ?? '...'} subtitle="Restricted and member funds" />
      </AdminPageStatsGrid>
      <SegmentedTabs
        tabs={[
          { value: 'journals' as const, label: 'Journal Entries' },
          { value: 'accounts' as const, label: 'Chart of Accounts' },
        ]}
        value={tab}
        onChange={(next) => setSearchParams({ tab: next })}
        aria-label="Ledger sections"
      />
      {tab === 'journals' ? <JournalsPage embedded /> : <ChartOfAccountsPage embedded />}
    </AdminPageLayout>
  );
}
