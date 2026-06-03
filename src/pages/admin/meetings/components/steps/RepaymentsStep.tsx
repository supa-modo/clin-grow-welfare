import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { money } from '@/pages/admin/shared/adminFormatters';
import type { MeetingRecord, MeetingRoster } from '../../types';

type Props = {
  meeting: MeetingRecord;
  roster: MeetingRoster | null;
  busy: string;
  collectionDraft: Record<string, { type: string; amount: string; reference: string; loanId?: string }>;
  setCollectionDraft: React.Dispatch<React.SetStateAction<Record<string, { type: string; amount: string; reference: string; loanId?: string }>>>;
  onPost: (memberId: string, loanId: string, amount: number) => void;
};

export function RepaymentsStep({ meeting, roster, busy, collectionDraft, setCollectionDraft, onPost }: Props) {
  const blocked = !!busy || meeting.status === 'CLOSED';
  const rows = (roster?.members ?? []).flatMap((row) => row.expectations.loans.active.map((loan) => ({ row, loan })));

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map(({ row, loan }) => {
        const key = `${meeting.id}-${row.member.id}-LOAN_REPAYMENT`;
        const outstanding = Number(loan.outstandingPrincipal ?? 0);
        const draft = collectionDraft[key] ?? { type: 'LOAN_REPAYMENT', amount: String(outstanding), reference: '', loanId: loan.id };
        const amount = Number(draft.amount || 0);
        return (
          <Card key={loan.id} className="p-4">
            <p className="font-bold text-ink-900">{loan.loanNumber} - {row.member.name}</p>
            <p className="mt-1 text-sm text-ink-600">Outstanding principal: {money(outstanding)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                className="w-36 rounded-lg border border-ink-200 px-3 py-2 text-sm"
                value={draft.amount}
                onChange={(e) => setCollectionDraft((s) => ({ ...s, [key]: { ...(s[key] ?? { type: 'LOAN_REPAYMENT', reference: '', loanId: loan.id }), amount: e.target.value } }))}
              />
              <Button size="xs" variant="secondary" onClick={() => setCollectionDraft((s) => ({ ...s, [key]: { ...(s[key] ?? { type: 'LOAN_REPAYMENT', reference: '', loanId: loan.id }), amount: String(outstanding) } }))}>Full</Button>
              <Button size="xs" variant="secondary" onClick={() => setCollectionDraft((s) => ({ ...s, [key]: { ...(s[key] ?? { type: 'LOAN_REPAYMENT', reference: '', loanId: loan.id }), amount: String(Math.max(1, Math.round(outstanding / 2))) } }))}>Half</Button>
              <Button size="sm" disabled={blocked || amount <= 0} onClick={() => onPost(row.member.id, loan.id, amount)}>Post repayment</Button>
            </div>
          </Card>
        );
      })}
      {!rows.length ? <Card className="p-4 text-sm font-semibold text-ink-500">No active loans for repayment in this meeting roster.</Card> : null}
    </div>
  );
}
