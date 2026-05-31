import { Badge } from '@/components/ui/Badge';
import type { FinancialYearStatus } from '@/types/ledger';

export function FinancialYearStatusBadge({ status }: { status: FinancialYearStatus }) {
  const tone = status === 'OPEN' ? 'success' : status === 'CLOSING' ? 'warning' : status === 'CLOSED' ? 'danger' : 'neutral';
  return <Badge tone={tone}>{status}</Badge>;
}
