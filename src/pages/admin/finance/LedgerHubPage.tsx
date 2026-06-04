import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { JournalsPage } from '@/pages/admin/finance/JournalsPage';
import { ChartOfAccountsPage } from '@/pages/admin/finance/ChartOfAccountsPage';

type LedgerTab = 'journals' | 'accounts';

export function LedgerHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: LedgerTab = searchParams.get('tab') === 'accounts' ? 'accounts' : 'journals';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger"
        subtitle="Journal entries and chart of accounts"
      />
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
    </div>
  );
}
