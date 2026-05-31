import { Badge } from '@/components/ui/Badge';
import type { JournalStatus } from '@/types/ledger';

export function JournalStatusBadge({ status }: { status: JournalStatus }) {
  const tone = status === 'POSTED' ? 'success' : status === 'REVERSED' ? 'danger' : 'neutral';
  return <Badge tone={tone}>{status}</Badge>;
}
