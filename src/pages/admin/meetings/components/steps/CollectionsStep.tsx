import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { money } from '@/pages/admin/shared/adminFormatters';
import { TableShell } from '@/pages/admin/shared/adminUi';
import type { MeetingRecord, MeetingRoster } from '../../types';
import { addWeeksIso, monthStartIso, weekStartIso } from '../../utils';

type CollectionDraft = Record<string, { type: string; amount: string; reference: string; loanId?: string; fineId?: string; periodDate?: string }>;

type Props = {
  meeting: MeetingRecord;
  roster: MeetingRoster | null;
  busy: string;
  collectionDraft: CollectionDraft;
  setCollectionDraft: React.Dispatch<React.SetStateAction<CollectionDraft>>;
  onPost: (memberId: string, type: string, amount: number, periodDate?: string) => void;
};

export function CollectionsStep({ meeting, roster, busy, collectionDraft, setCollectionDraft, onPost }: Props) {
  const meetingDate = new Date(meeting.meetingDate);
  const blocked = !!busy || meeting.status === 'CLOSED';
  const monthly = roster?.settings?.monthlyWelfareContribution ?? 250;

  const setDraft = (key: string, type: string, patch: Partial<CollectionDraft[string]>, fallbackAmount: string) => {
    setCollectionDraft((state) => ({
      ...state,
      [key]: { ...(state[key] ?? { type, reference: '', amount: fallbackAmount }), ...patch },
    }));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-600">
        Edge-case contributions: <Link className="font-semibold text-brand-700 underline" to="/officials/contributions">official contributions desk</Link>
      </p>
      <TableShell>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-500">
            <tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Weekly savings</th><th className="px-4 py-3">Share capital</th><th className="px-4 py-3">Welfare kitty</th></tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {(roster?.members ?? []).map((row) => {
              const weekly = row.expectations.weeklySavings;
              const share = row.expectations.shareCapital;
              const welfare = row.expectations.welfareKitty;
              return (
                <tr key={row.member.id}>
                  <td className="px-4 py-3 font-semibold">{row.member.membershipNumber} - {row.member.name}</td>
                  {([
                    { type: 'WEEKLY_SAVINGS' as const, suggested: weekly.remainingToMax, kind: 'week' as const, label: `${money(weekly.paidThisWeek)} / ${money(weekly.max)} this week` },
                    { type: 'SHARE_CAPITAL' as const, suggested: share.remaining, kind: 'share' as const, label: `${money(share.paidToDate)} / ${money(share.max)} share` },
                    { type: 'WELFARE_KITTY' as const, suggested: welfare.dueThisMonth || monthly, kind: 'welfare' as const, label: `${money(welfare.paidThisMonth)} paid this month` },
                  ]).map(({ type, suggested, kind, label }) => {
                    const draftKey = `${meeting.id}-${row.member.id}-${type}`;
                    const draft = collectionDraft[draftKey] ?? { type, amount: String(suggested), reference: '', periodDate: '' };
                    const shareDisabled = kind === 'share' && share.remaining <= 0;
                    return (
                      <td key={type} className="px-4 py-3">
                        <p className="mb-1 text-xs font-semibold text-ink-500">{label}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            className="w-24 rounded-lg border border-ink-200 px-2 py-1 text-sm disabled:bg-ink-50"
                            value={draft.amount}
                            disabled={shareDisabled}
                            onChange={(e) => setDraft(draftKey, type, { amount: e.target.value }, String(suggested))}
                          />
                          {kind === 'week' ? (
                            <>
                              <input className="w-36 rounded-lg border border-ink-200 px-2 py-1 text-xs" type="date" title="Target saving week" value={draft.periodDate ?? weekStartIso(meetingDate)} onChange={(e) => setDraft(draftKey, type, { periodDate: e.target.value }, draft.amount)} />
                              <Button size="xs" variant="secondary" onClick={() => setDraft(draftKey, type, { periodDate: weekStartIso(meetingDate), amount: String(weekly.min) }, draft.amount)}>This week</Button>
                              <Button size="xs" variant="secondary" onClick={() => setDraft(draftKey, type, { periodDate: addWeeksIso(weekStartIso(meetingDate), 1), amount: String(weekly.min) }, draft.amount)}>Next week</Button>
                            </>
                          ) : null}
                          {kind === 'welfare' ? (
                            <>
                              <input className="w-36 rounded-lg border border-ink-200 px-2 py-1 text-xs" type="month" title="Target welfare month" value={(draft.periodDate ?? monthStartIso(meetingDate)).slice(0, 7)} onChange={(e) => setDraft(draftKey, type, { periodDate: `${e.target.value}-01` }, draft.amount)} />
                              {[1, 2, 3].map((n) => (
                                <Button key={n} size="xs" variant="secondary" onClick={() => setDraft(draftKey, type, { amount: String(monthly * n), periodDate: monthStartIso(meetingDate) }, draft.amount)}>Pay {n} mo</Button>
                              ))}
                            </>
                          ) : null}
                          <Button size="xs" disabled={blocked || shareDisabled || Number(draft.amount) <= 0} onClick={() => onPost(row.member.id, type, Number(draft.amount), draft.periodDate)}>Post</Button>
                        </div>
                        {kind === 'welfare' ? <p className="mt-1 text-xs text-ink-500">Multiples of {money(monthly)} for advance months.</p> : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
