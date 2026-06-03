import { StatCard } from '@/components/ui/Card';
import { money } from '@/pages/admin/shared/adminFormatters';
import type { LoanPool } from '../../types';

type Props = {
  collectionTotals: Record<string, number>;
  pool: LoanPool | null;
};

export function SummaryStep({ collectionTotals, pool }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {Object.entries(collectionTotals).map(([key, value]) => <StatCard key={key} label={key.replace(/_/g, ' ')} value={money(value)} />)}
      <StatCard label="Loanable for this meeting" value={money(pool?.totalLoanablePool ?? 0)} detail={`${money(pool?.reservedAmount ?? 0)} reserved · ${money(pool?.remainingAmount ?? 0)} available`} />
    </div>
  );
}
