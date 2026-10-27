import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';

const money = (value: number) => `KES ${Number(value).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
type ComparisonRow = {
  memberId: string; memberName: string; membershipNumber: string; dateJoined: string;
  capital: number; currentSurplus: number; proposedSurplus: number | null;
  difference: number | null; proposedTotal: number | null;
};
type Comparison = {
  defaultMethod: 'CLOSING_CAPITAL'; previewOnly: true; status: 'COMPLETE' | 'INCOMPLETE';
  startDate: string; asOf: string; surplus: number; recordedSurplus: number;
  allocatedSurplus: number; unallocatedSurplus: number;
  issues: string[]; assumptions: string[]; members: ComparisonRow[];
  periods: Array<{ period: string; surplus: number; allocated: number; unallocated: number;
    members: Array<{ memberId: string; amount: number }> }>;
};

function downloadComparison(data: Comparison) {
  const rows: Array<Array<string | number>> = [
    ['Distribution comparison — preview only. Closing capital remains the default.'],
    ['From', data.startDate, 'Through', data.asOf, 'Status', data.status],
    ...data.assumptions.map(assumption => ['Assumption', assumption]),
    ...data.issues.map(issue => ['Review required', issue]),
    ['Member', 'Membership number', 'Joined', 'Capital', 'Current surplus', 'Proposed surplus', 'Difference', 'Proposed capital plus surplus'],
    ...data.members.map(row => [row.memberName, row.membershipNumber, row.dateJoined, row.capital, row.currentSurplus,
      row.proposedSurplus ?? 'Unavailable', row.difference ?? 'Unavailable', row.proposedTotal ?? 'Unavailable']),
    [],
    ['Month', 'Recorded surplus', 'Allocated in preview', 'Unallocated'],
    ...data.periods.map(period => [period.period, period.surplus, period.allocated, period.unallocated]),
    [], ['Monthly member breakdown', ...(data.status === 'INCOMPLETE' ? ['Incomplete diagnostic only — not a proposed distribution'] : [])],
    ['Month', 'Membership number', 'Member', 'Surplus allocation'],
    ...data.periods.flatMap(period => period.members.map(member => {
      const row = data.members.find(item => item.memberId === member.memberId)!;
      return [period.period, row.membershipNumber, row.memberName, member.amount];
    })),
  ];
  // Spreadsheet applications must treat user-supplied names as text, never as formulas.
  const cell = (value: string | number) => `"${String(typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  const url = URL.createObjectURL(new Blob(['\uFEFF', rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `distribution-comparison-${data.asOf}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function DistributionComparison({ financialYearId, refreshKey }: { financialYearId: string; refreshKey: unknown }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [selectedMember, setSelectedMember] = useState('');
  useEffect(() => {
    if (!open) return;
    let active = true;
    const controller = new AbortController();
    setData(null);
    setError('');
    setLoading(true);
    api.get(`/audit-year-end/year-end/${financialYearId}/comparison`, { signal: controller.signal })
      .then(response => {
        if (!active) return;
        const comparison = response.data.data as Comparison;
        setData(comparison);
        setSelectedMember(comparison.members[0]?.memberId ?? '');
      })
      .catch((reason: any) => {
        if (active) setError(reason.response?.data?.error ?? 'Unable to load the comparison. The current distribution register is still available.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [open, financialYearId, refreshKey, retry]);
  return (
    <section className="rounded-xl border bg-white p-5 space-y-4" aria-label="Distribution comparison">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Compare distribution methods</h2>
          <p className="text-sm text-ink-600">Current method: closing shares and savings · Default for approval and payouts</p>
        </div>
        <Button variant="secondary" aria-expanded={open} onClick={() => setOpen(value => !value)}>
          {open ? 'Hide comparison' : 'Compare joining-date method'}
        </Button>
      </div>
      {open && <>
        <p className="text-sm text-ink-600">Explore surplus earned after each member joined, weighted by their shares and savings at the time. These figures are for review only; all AGM actions continue to use the current register below.</p>
        {loading && <p role="status">Calculating comparison…</p>}
        {error && <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">
          <p>{error}</p><Button variant="secondary" onClick={() => setRetry(value => value + 1)}>Retry comparison</Button>
        </div>}
        {data && <>
          <div className={`rounded-lg p-4 text-sm ${data.status === 'COMPLETE' ? 'bg-green-50 text-green-900' : 'bg-amber-50 text-amber-900'}`}>
            <p className="font-semibold">{data.status === 'COMPLETE' ? 'Comparison reconciled' : 'Comparison incomplete — review required'}</p>
            <p>{data.startDate} to {data.asOf} · Same recorded surplus: {money(data.surplus)}. Includes recorded unpaid interest; payout checks still apply.</p>
            {data.status === 'INCOMPLETE' && <p>Proposed member amounts are withheld until the issues below are resolved. Dated source surplus: {money(data.recordedSurplus)}. Unallocated dated surplus: {money(data.unallocatedSurplus)}.</p>}
          </div>
          {data.issues.length > 0 && <details open>
            <summary className="cursor-pointer font-semibold text-sm">Review required ({data.issues.length})</summary>
            <ul className="mt-2 list-disc pl-5 text-sm max-h-64 overflow-y-auto">{data.issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>
          </details>}
          <details>
            <summary className="cursor-pointer text-sm font-semibold">Calculation assumptions</summary>
            <ul className="mt-2 list-disc pl-5 text-sm text-ink-600">{data.assumptions.map(assumption => <li key={assumption}>{assumption}</li>)}</ul>
          </details>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-600">Difference = proposed surplus less current surplus. Your own capital is returned separately.</p>
            <Button variant="secondary" onClick={() => downloadComparison(data)}>Export comparison CSV</Button>
          </div>
          <DataTable rows={data.members} getRowKey={row => row.memberId} columns={[
            { key: 'member', header: 'Member', render: row => <div><strong>{row.memberName}</strong><p className="text-xs text-ink-500">{row.membershipNumber}</p></div> },
            { key: 'joined', header: 'Joined', render: row => row.dateJoined },
            { key: 'capital', header: 'Capital', render: row => money(row.capital) },
            { key: 'current', header: 'Current surplus (default)', render: row => money(row.currentSurplus) },
            { key: 'proposed', header: 'Joining-date surplus', render: row => row.proposedSurplus === null ? 'Unavailable' : money(row.proposedSurplus) },
            { key: 'difference', header: 'Difference', render: row => row.difference === null ? 'Unavailable' : <span className={row.difference < 0 ? 'text-red-700' : row.difference > 0 ? 'text-green-700' : ''}>{row.difference > 0 ? '+' : ''}{money(row.difference)}</span> },
            { key: 'total', header: 'Proposed capital + surplus', render: row => row.proposedTotal === null ? 'Unavailable' : money(row.proposedTotal) },
          ]} />
          <details>
            <summary className="cursor-pointer font-semibold text-sm">Monthly breakdown</summary>
            {data.status === 'INCOMPLETE' && <p className="my-2 text-sm text-amber-800">Partial diagnostic figures only. These are not a proposed member distribution.</p>}
            <label className="block my-3 text-sm font-semibold">Member breakdown
              <select aria-label="Member breakdown" className="ml-2 rounded-lg border p-2" value={selectedMember} onChange={event => setSelectedMember(event.target.value)}>
                {data.members.map(row => <option key={row.memberId} value={row.memberId}>{row.memberName} ({row.membershipNumber})</option>)}
              </select>
            </label>
            <DataTable rows={data.periods} getRowKey={row => row.period} columns={[
              { key: 'period', header: 'Month', render: row => row.period },
              { key: 'surplus', header: 'Recorded net surplus', render: row => money(row.surplus) },
              { key: 'allocated', header: 'Allocated in preview', render: row => money(row.allocated) },
              { key: 'unallocated', header: 'Unallocated', render: row => money(row.unallocated) },
              { key: 'member', header: 'Selected member surplus', render: row => money(row.members.find(member => member.memberId === selectedMember)?.amount ?? 0) },
            ]} />
          </details>
        </>}
      </>}
    </section>
  );
}
