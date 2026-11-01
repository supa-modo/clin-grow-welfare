import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ChevronDown, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useMemberDistribution } from '@/hooks/useMemberDistribution';
import { useAuthStore } from '@/store/auth';
import { memberDate, memberDistributionApi, memberMoney } from '@/services/memberDistribution';
import type { DistributionView } from '@/services/memberDistribution';

function CapitalHistorySection() {
  const userId = useAuthStore(state => state.user?.id);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const history = useQuery({ queryKey: ['member-capital-history', userId, page], queryFn: () => memberDistributionApi.history(page), enabled: open, gcTime: 0, retry: 1 });
  return <section className="border-t border-slate-200 py-6">
    <button type="button" aria-expanded={open} aria-controls="capital-history" onClick={() => setOpen(!open)} className="flex min-h-12 w-full items-center justify-between gap-4 text-left"><span><span className="block text-base font-bold text-primary-950">Your contribution history</span><span className="mt-1 block text-xs leading-5 text-slate-500">Shares and savings by meeting or account entry, including corrections.</span></span><ChevronDown className={`h-5 w-5 shrink-0 text-primary-700 transition-transform ${open ? 'rotate-180' : ''}`} /></button>
    {open && <div id="capital-history" className="mt-5">
      {history.isPending ? <p role="status" className="py-5 text-sm text-slate-500">Loading your history…</p> : history.isError ? <div role="alert" className="text-sm text-red-700">History could not be loaded. <button className="underline" onClick={() => void history.refetch()}>Try again</button></div> : history.data && <>
        <p className="mb-4 text-xs leading-5 text-slate-500">All recorded capital movements are included so opening balances and reversals can be traced. Negative amounts reduce capital. For an approved allocation, the calculation uses the saved balances before payout.</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[540px] text-left text-sm"><caption className="sr-only">Your shares and savings history</caption><thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-500"><tr>{['Date / reference', 'Meeting', 'Share capital', 'Savings'].map(label => <th key={label} scope="col" className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{history.data.rows.map(row => <tr key={row.reference}><td className="px-3 py-3"><span className="block">{memberDate(row.date)}</span><span className="text-xs text-slate-500">{row.reference}</span></td><td className="px-3 py-3 text-slate-600">{row.meeting || 'Account entry'}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{memberMoney(row.shareCapital)}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{memberMoney(row.savings)}</td></tr>)}</tbody></table></div>
        {!history.data.rows.length && <p className="py-6 text-sm text-slate-500">No posted capital movements yet.</p>}
        {history.data.total > history.data.pageSize && <nav aria-label="Contribution history pages" className="mt-4 flex items-center justify-between gap-3"><Button variant="secondary" disabled={page === 1 || history.isFetching} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-xs text-slate-500">Page {page} of {Math.ceil(history.data.total / history.data.pageSize)}</span><Button variant="secondary" disabled={page * history.data.pageSize >= history.data.total || history.isFetching} onClick={() => setPage(page + 1)}>Next</Button></nav>}
      </>}
    </div>}
  </section>;
}

function NumberRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <div className={`flex items-start justify-between gap-4 border-b border-slate-100 py-3 text-sm ${strong ? 'font-bold text-primary-950' : 'text-slate-600'}`}><span>{label}</span><span className="shrink-0 tabular-nums">{memberMoney(value)}</span></div>;
}

function DistributionNumbers({ data }: { data: DistributionView }) {
  const b = data.group.breakdown;
  return <>
    <section className="mt-6 grid gap-6 border-y border-slate-200 py-6 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{data.status === 'APPROVED' ? 'Approved income share' : 'Projected year-end income share'}</p><p className="mt-3 break-words text-3xl font-bold tracking-tight text-primary-900 tabular-nums sm:text-4xl">{memberMoney(data.allocation.projectedShare)}</p><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">{data.status === 'APPROVED' ? 'Your saved AGM-approved income allocation.' : 'A recorded-amounts estimate for the end of the financial year. Future income and contributions are not assumed.'}</p><p className="mt-3 text-xs text-slate-500">{data.member.name} · Member {data.member.membershipNumber}</p></div>
      <div><NumberRow label="Your share capital" value={data.member.shareCapital} /><NumberRow label="Your savings" value={data.member.savings} /><NumberRow label="Your total capital" value={data.member.capital} strong /><NumberRow label="Capital plus income share" value={data.allocation.totalWithCapital} strong /><p className="mt-2 text-xs leading-5 text-slate-500">Capital plus income is not an amount currently available to withdraw. Final payouts require reconciliation, settled loans, cash availability and AGM approval.</p></div>
    </section>
    <section className="py-7"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold text-primary-950">How your share is calculated</h2><span className="text-xs font-medium text-primary-700">Default capital-based formula</span></div>
      <p className="mt-3 text-sm leading-6 text-slate-600">Every shilling in share capital and savings has the same weight. Contribution timing does not change this weighting. The welfare kitty is held separately and is not part of the calculation.</p>
      <div className="my-5 border-l-2 border-primary-600 bg-primary-50/60 px-4 py-4"><p className="text-sm font-semibold leading-7 text-primary-950">Your income share = (your capital ÷ total group capital) × net shareable pool</p>{data.group.capital > 0 ? <p className="mt-2 break-words text-sm leading-7 text-primary-800 tabular-nums">({memberMoney(data.member.capital)} ÷ {memberMoney(data.group.capital)}) × {memberMoney(data.group.shareablePool)} = <strong>{memberMoney(data.allocation.currentShare)}</strong></p> : <p className="mt-2 text-sm leading-6 text-primary-800">No capital has been recorded, so no income share can be allocated yet.</p>}</div>
      <div className="grid gap-x-10 sm:grid-cols-2"><NumberRow label={`Group capital · ${data.group.memberCount} capital accounts`} value={data.group.capital} /><div className="flex items-center justify-between border-b border-slate-100 py-3 text-sm"><span className="text-slate-600">Your percentage of group capital</span><strong className="tabular-nums text-primary-900">{data.allocation.percentage.toLocaleString('en-KE', { maximumFractionDigits: 6 })}%</strong></div></div>
      <p className="mt-3 text-xs leading-5 text-slate-500">Use the full capital values above when calculating, rather than the rounded percentage. The final one-cent rounding is reconciled across the group.</p>
    </section>
    <section className="border-t border-slate-200 py-7"><h2 className="text-base font-bold text-primary-950">What makes up the shareable pool?</h2>{b ? <div className="mt-4 grid gap-x-12 lg:grid-cols-2"><div><NumberRow label="Recorded loan interest, net of reversals" value={b.interest} /><NumberRow label="Recorded fine income" value={b.fines} /><NumberRow label="Other recorded income" value={b.otherIncome} /><NumberRow label="Total recorded income" value={b.income} strong /></div><div><NumberRow label="Less recorded expenses" value={b.expenses} /><NumberRow label="Less distribution adjustments" value={b.adjustments} /><NumberRow label="Net shareable pool" value={data.group.shareablePool} strong /><p className="mt-3 text-xs leading-5 text-slate-500">Net pool = recorded income − expenses − distribution adjustments. These group totals reveal no other member’s balance or allocation.</p></div></div> : <p className="mt-3 text-sm text-slate-600">Approved shareable pool: {memberMoney(data.group.shareablePool)}. The historical income breakdown was not saved with this approved allocation; current post-payout income is not substituted for it.</p>}</section>
    <section className="border-t border-slate-200 py-7"><h2 className="text-base font-bold text-primary-950">Current and year-end view</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[360px] text-left text-sm"><caption className="sr-only">Recorded and projected distribution values</caption><thead className="border-b text-xs text-slate-500"><tr><th className="py-3">Basis</th><th className="px-3 py-3 text-right">Recorded</th><th className="py-3 text-right">Year-end estimate</th></tr></thead><tbody className="divide-y divide-slate-100">{[['Your capital', data.member.capital], ['Group capital', data.group.capital], ['Net shareable pool', data.group.shareablePool], ['Your income share', data.allocation.projectedShare]].map(([label, value]) => <tr key={label}><th className="py-3 font-medium text-slate-600">{label}</th><td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{memberMoney(Number(value))}</td><td className="whitespace-nowrap py-3 text-right tabular-nums">{memberMoney(Number(value))}</td></tr>)}</tbody></table></div><p className="mt-3 text-xs leading-5 text-slate-500">The columns match because this estimate assumes no new, unrecorded transactions before {memberDate(data.financialYear.endDate)}. It does not invent future loans, fines, savings or investment returns.</p></section>
    <CapitalHistorySection />
    <details className="border-t border-slate-200 py-5"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Calculation notes and assumptions</summary><ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-slate-600">{data.assumptions.map(note => <li key={note}>{note}</li>)}</ul></details>
  </>;
}

export function MemberDistributionPage() {
  const query = useMemberDistribution();
  if (query.isPending) return <p role="status" className="py-12 text-center text-sm text-slate-500">Loading your distribution…</p>;
  if (query.isError) return <div role="alert" className="py-10 text-sm text-slate-600">Your distribution could not be loaded. <button onClick={() => void query.refetch()} className="font-semibold text-primary-700 underline">Try again</button></div>;
  if (!query.data?.enabled) return <Navigate to="/member" replace />;
  const data = query.data;
  return <div className="bg-white px-0 py-4 sm:rounded-xl sm:px-6 sm:py-6">
    <Link to="/member" className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary-700"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary-700">{data.financialYear.name}</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-primary-950">Your distribution, explained</h1></div><span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" />Only your individual share is shown</span></div>
    {data.status === 'UNAVAILABLE' ? <p className="py-8 text-sm leading-6 text-slate-600">{data.message}</p> : <><p className="mt-3 text-xs text-slate-500">Calculated {memberDate(data.calculatedAt)} · Year ends {memberDate(data.financialYear.endDate)}</p><DistributionNumbers data={data} /></>}
    <Link to="/member/statements" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary-700">Open your account statements<ArrowUpRight className="h-4 w-4" /></Link>
  </div>;
}
