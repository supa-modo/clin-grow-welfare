import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, Landmark, ShieldCheck } from "lucide-react";
import { api } from "@/services/api";
import { contributionApi } from "@/services/contributionApi";
import { loanApi } from "@/services/loanApi";
import { memberPortalApi } from "@/services/memberApi";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { MemberContributionsTrendChart } from "@/components/member/MemberContributionsTrendChart";
import { useMemberDistribution } from "@/hooks/useMemberDistribution";
import { memberDate, memberMoney } from "@/services/memberDistribution";
import type { MemberDashboardSummary } from "@/components/member/dashboard/MemberDashboardSections";

type Summary = MemberDashboardSummary & { financialYear?: { name: string; startDate: string; endDate: string } | null };
type MemberMeeting = { id: string; meetingNumber: string; meetingDate: string; venue?: string | null; virtualLink?: string | null; status: string };
const dateKey = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

export function MemberDashboardPage() {
  const userId = useAuthStore(state => state.user?.id);
  const common = { staleTime: 0, gcTime: 0, retry: 1 };
  const summary = useQuery({ ...common, queryKey: ['member-dashboard', userId], queryFn: async () => await memberPortalApi.dashboard() as Summary });
  const loans = useQuery({ ...common, queryKey: ['dashboard-loans', userId], queryFn: loanApi.myLoans });
  const meetings = useQuery({ ...common, queryKey: ['dashboard-meetings', userId], queryFn: async () => (await api.get<{ meetings: MemberMeeting[] }>('/member-portal/meetings')).data.meetings });
  const contributions = useQuery({ ...common, queryKey: ['dashboard-contributions', userId], queryFn: async () => {
    const result = await contributionApi.myContributions({ page: 1, pageSize: 5 });
    if (!Array.isArray(result.data)) throw new Error('Contribution history is unavailable');
    return result;
  } });
  const distribution = useMemberDistribution();
  if (summary.isPending) return <p role="status" className="py-14 text-center text-sm text-slate-600">Loading your account overview…</p>;
  if (summary.isError || !summary.data) return <div role="alert" className="py-12 text-sm text-slate-600"><p>Your account overview could not be loaded. No balances are being estimated.</p><Button className="mt-4" onClick={() => void summary.refetch()}>Try again</Button></div>;
  const member = summary.data;
  const balance = member.financialSummary;
  const capital = (Math.round(Number(balance.shareCapital) * 100) + Math.round(Number(balance.weeklySavings) * 100)) / 100;
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Nairobi' }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const preview = !distribution.isError && distribution.data?.enabled ? distribution.data : null;
  const activeLoans = (loans.data ?? []).filter(loan => loan.disbursedAt && !['CLOSED', 'WRITTEN_OFF', 'REJECTED'].includes(loan.status));
  const now = new Date();
  const nextMeeting = !meetings.isError ? (meetings.data ?? []).filter(meeting => {
    if (['CLOSED', 'COMPLETED', 'CANCELLED'].includes(meeting.status)) return false;
    const date = new Date(meeting.meetingDate);
    return date >= now || (dateKey(date) === dateKey(now) && !['SCHEDULED', 'NOTICE_SENT'].includes(meeting.status));
  }).sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime())[0] : undefined;

  return <div className="space-y-6 pb-3">
    <header className="flex flex-wrap items-start justify-between gap-3 pb-1 pt-4">
      <div><p className="mb-1.5 text-sm font-bold leading-6 text-emerald-900">Your member account</p><h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-[#102e26] sm:text-4xl">{greeting}, {member.firstName || 'member'}.</h1><p className="mt-2 text-sm text-slate-600">A clear view of your capital, activity and welfare membership.</p></div>
      <div className="flex flex-wrap gap-x-3 text-xs leading-6 text-slate-600 sm:block sm:rounded-xl sm:border sm:border-slate-200 sm:bg-white sm:px-4 sm:py-2 sm:text-right"><p className="font-semibold text-slate-700">Member {member.membershipNumber}</p><p>{member.financialYear?.name || 'Account overview'} · {memberDate(new Date().toISOString())}</p></div>
    </header>

    <div className={`grid min-w-0 gap-4 ${preview ? 'lg:grid-cols-[1.35fr_1fr]' : ''}`}>
      <section aria-label="Your capital" className="relative isolate min-w-0 overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#083c32_0%,#075e46_65%,#087f5b_100%)] p-5 text-white shadow-[0_12px_30px_-12px_rgba(6,78,59,0.5)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full border-[40px] border-white/[0.06]" /><div aria-hidden="true" className="pointer-events-none absolute -bottom-40 right-10 -z-10 h-80 w-80 rounded-full border border-emerald-200/20" /><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-emerald-50">Share capital + savings</p><Link to="/member/statements" className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20">Statement<ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
        <p className="mt-6 break-words text-[2rem] font-bold leading-tight tracking-tight tabular-nums sm:text-[2.75rem]">{memberMoney(capital)}</p>
        <p className="mt-3 max-w-sm text-sm leading-6 text-emerald-50">Your recorded capital. The welfare kitty is held separately.</p>
        <dl className="mt-7 grid grid-cols-2 gap-4 border-t border-white/25 pt-5"><div><dt className="text-sm text-emerald-50">Share capital</dt><dd className="mt-2 break-words text-base font-bold tabular-nums sm:text-xl">{memberMoney(balance.shareCapital)}</dd></div><div><dt className="text-sm text-emerald-50">Savings</dt><dd className="mt-2 break-words text-base font-bold tabular-nums sm:text-xl">{memberMoney(balance.weeklySavings)}</dd></div></dl>
      </section>
      {preview && <section aria-label="Distribution preview" className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-3xl border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#f7fee7_100%)] p-5 shadow-[0_8px_24px_-18px_rgba(6,78,59,0.3)] sm:p-7">
        <div><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold leading-6 text-emerald-900">{preview.status === 'APPROVED' ? 'Approved income share' : 'Projected year-end income share'}</p><span className="rounded-2xl bg-emerald-700 p-2.5 text-white shadow-sm"><ArrowUpRight className="h-5 w-5 shrink-0" /></span></div>
          {preview.status === 'UNAVAILABLE' ? <p className="mt-4 text-sm leading-6 text-slate-600">Your estimate will appear once the underlying balances are reconciled.</p> : <><p className="mt-4 break-words text-[2rem] font-bold leading-tight tracking-tight text-[#102e26] tabular-nums sm:text-4xl">{memberMoney(preview.allocation.projectedShare)}</p><p className="mt-3 text-sm leading-6 text-slate-700">{preview.status === 'APPROVED' ? 'Saved AGM-approved allocation.' : 'Based on recorded amounts, with no assumed future income. This is not an approved payout.'}</p></>}
        </div><Link to="/member/distribution" className="mt-5 inline-flex min-h-11 items-center gap-3 self-start rounded-xl bg-[#075e46] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#064e3b]">View more <ArrowRight className="h-4 w-4" /></Link>
      </section>}
    </div>
    {distribution.isError && <p className="text-xs text-slate-600">The distribution preview could not be loaded. <button className="font-semibold text-primary-700 underline" onClick={() => void distribution.refetch()}>Try again</button></p>}



    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_32px_-24px_rgba(15,23,42,0.3)]">
      <div className="grid lg:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0 border-b border-slate-200 lg:border-b-0 lg:border-r"><MemberContributionsTrendChart flat /></div>
        <section className="min-w-0 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold text-[#102e26]">Your loans & welfare</h2><Link to="/member/loans" className="text-sm font-bold text-emerald-800">View loans <span aria-hidden="true">↗</span></Link></div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200"><p className="text-sm text-slate-700">Recorded outstanding loan balance</p><p className="mt-1 text-2xl font-bold tabular-nums text-[#102e26]">{memberMoney(balance.activeLoanBalance)}</p></div>
          {loans.isPending ? <p role="status" className="mt-4 text-xs text-slate-600">Loading loan details…</p> : loans.isError ? <p className="mt-4 text-xs text-slate-600">Loan details could not be loaded. Open your loans page for statements.</p> : activeLoans.length ? <ul className="mt-3 divide-y divide-slate-100">{activeLoans.slice(0, 2).map(loan => <li key={loan.id} className="flex items-start justify-between gap-3 py-3 text-xs"><div><span className="font-semibold text-slate-700">{loan.loanNumber}</span><p className="mt-1 text-slate-600">{loan.status.replace(/_/g, ' ').toLowerCase()}</p></div><span className="text-right tabular-nums text-slate-700">{loan.totalOutstanding != null ? memberMoney(loan.totalOutstanding) : 'See statement'}</span></li>)}</ul> : <p className="mt-3 text-xs leading-5 text-slate-600">{Number(balance.activeLoanBalance) > 0 ? 'Open your loan statements for the recorded balance breakdown.' : 'No active disbursed loans in your account.'}</p>}
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-indigo-50 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" /><div><p className="text-xs text-slate-600">Restricted welfare kitty</p><p className="mt-1 font-semibold tabular-nums text-slate-800">{memberMoney(balance.welfareKitty)}</p><p className="mt-1 text-xs leading-5 text-slate-600">Separate from shareable capital and income.</p></div></div>
        </section>
      </div>
      <section className="border-t border-slate-200 p-4 sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-bold text-[#102e26]">Your recent contributions</h2><Link to="/member/contributions" className="text-sm font-bold text-emerald-800">View all <span aria-hidden="true">↗</span></Link></div>
        {contributions.isPending ? <p role="status" className="py-8 text-sm text-slate-600">Loading your contributions…</p> : contributions.isError ? <p role="alert" className="py-5 text-sm text-slate-600">Recent contributions could not be loaded. <button className="text-primary-700 underline" onClick={() => void contributions.refetch()}>Try again</button></p> : !contributions.data?.data.length ? <p className="py-6 text-sm text-slate-600">No contributions have been recorded yet.</p> : <ul className="divide-y divide-slate-100">{contributions.data.data.map(row => <li key={row.id} className="flex items-start gap-3 py-3"><span className="mt-0.5 rounded-xl bg-emerald-100 p-2.5 text-emerald-800"><ArrowDownLeft className="h-4 w-4 shrink-0" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold capitalize text-slate-900">{row.contributionType.replace(/_/g, ' ').toLowerCase()}</p><p className="mt-1 text-xs leading-5 text-slate-600">{memberDate(row.periodDate)}{row.meeting?.meetingNumber ? ` · ${row.meeting.meetingNumber}` : ''}</p></div><div className="text-right"><p className="text-sm font-bold tabular-nums text-slate-950">{memberMoney(row.amount)}</p><p className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${row.status === 'POSTED' ? 'bg-emerald-100 text-emerald-900' : row.status === 'REVERSED' ? 'bg-rose-100 text-rose-900' : 'bg-amber-100 text-amber-900'}`}>{row.status.toLowerCase()}</p></div></li>)}</ul>}
      </section>
    </div>
    <section className="flex flex-col gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="rounded-xl bg-sky-700 p-3 text-white"><CalendarDays className="h-5 w-5 shrink-0" /></span><div><h2 className="text-base font-bold text-[#102e26]">Next meeting</h2>{meetings.isPending ? <p role="status" className="mt-1 text-sm text-slate-600">Loading the meeting calendar…</p> : meetings.isError ? <p className="mt-1 text-sm text-slate-600">The meeting calendar could not be loaded.</p> : nextMeeting ? <><p className="mt-1 text-sm text-slate-700">{memberDate(nextMeeting.meetingDate)} · {new Intl.DateTimeFormat('en-KE', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Nairobi' }).format(new Date(nextMeeting.meetingDate))}</p><p className="mt-1 break-words text-xs text-slate-600">{nextMeeting.venue || (nextMeeting.virtualLink ? 'Online meeting' : 'Venue to be confirmed')}</p></> : <p className="mt-1 text-sm text-slate-600">No upcoming meeting is scheduled.</p>}</div></div><Link to={nextMeeting ? `/member/meetings/${nextMeeting.id}` : '/member/meetings'} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-white px-4 text-sm font-bold text-sky-900 transition hover:bg-sky-100">{nextMeeting ? 'Meeting details' : 'Open calendar'}<ArrowRight className="h-4 w-4" /></Link></section>
    <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-xs leading-5 text-slate-600"><Landmark className="h-3.5 w-3.5 shrink-0" />Your account information is visible only to you and authorised officials.</p>
  </div>;
}

export default MemberDashboardPage;
