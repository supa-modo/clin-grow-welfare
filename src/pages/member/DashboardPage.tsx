import { useEffect, useState } from 'react';
import { FiBell, FiCalendar, FiCreditCard, FiFileText, FiShield } from 'react-icons/fi';
import { TbPigMoney, TbWallet } from 'react-icons/tb';
import { memberPortalApi } from '@/services/memberApi';
import { EmptyState, Spinner } from '@/components/ui/Feedback';

function StatusPill({ status }: { status: string }) {
  const active = status === 'ACTIVE';
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function money(value: number) {
  return `KES ${Number(value ?? 0).toLocaleString()}`;
}

function MetricCard({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-ink-900">{value}</p>
          <p className="mt-1 text-xs font-medium text-ink-500">{note}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>
      </div>
    </div>
  );
}

export function MemberDashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    memberPortalApi.dashboard()
      .then(setSummary)
      .catch(() => setError('We could not load your member dashboard. Please try again later.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-72 place-items-center rounded-3xl border border-ink-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 text-sm font-bold text-ink-600"><Spinner /> Loading member dashboard...</div>
      </div>
    );
  }

  if (error || !summary) return <EmptyState title="No member profile linked yet" message={error || 'Your user account is not linked to a member record.'} />;

  const financial = summary.financialSummary ?? {};

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-brand-50 via-white to-emerald-50 px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">Member Portal</p>
              <h1 className="mt-1 text-2xl font-black text-ink-950 md:text-3xl">Welcome, {summary.firstName}</h1>
              <p className="mt-2 text-sm font-semibold text-ink-500">{summary.membershipNumber}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill status={summary.status} />
              <span className={`rounded-full border px-3 py-1 text-xs font-black ${summary.registrationFeePaid ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                Registration {summary.registrationFeePaid ? 'Paid' : 'Pending'}
              </span>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400">Member since</p>
              <p className="mt-2 text-lg font-black text-ink-900">{new Date(summary.dateJoined).toLocaleDateString()}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400">Membership age</p>
              <p className="mt-2 text-lg font-black text-ink-900">{summary.membershipDuration?.months ?? 0} months</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400">Account standing</p>
              <p className="mt-2 text-lg font-black text-ink-900">{summary.status === 'ACTIVE' && summary.registrationFeePaid ? 'In good standing' : 'Action required'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Share Capital" value={money(financial.shareCapital)} note="Cumulative share capital balance" icon={<TbWallet />} />
        <MetricCard label="Welfare Kitty" value={money(financial.welfareKitty)} note="Your welfare kitty contributions" icon={<TbPigMoney />} />
        <MetricCard label="Weekly Savings" value={money(financial.weeklySavings)} note="Cumulative savings balance" icon={<FiCreditCard />} />
        <MetricCard label="Active Loan Balance" value={money(financial.activeLoanBalance)} note={financial.activeLoanBalance > 0 ? 'Outstanding loan(s)' : 'No active loans'} icon={<FiShield />} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-ink-900">Loan Eligibility</h2>
            <FiFileText className="text-ink-400" />
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-brand-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 mb-1">Maximum Eligible Amount</p>
              <p className="text-2xl font-black text-brand-900">{money(financial.loanEligibilityBase * 3)}</p>
              <p className="text-xs text-brand-600 mt-1">Based on share capital + savings × 3 multiplier (welfare excluded)</p>
            </div>
            {financial.finesBalance > 0 && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                <FiBell className="inline mr-1" size={13} />
                You have outstanding fines of {money(financial.finesBalance)}. Please clear to maintain good standing.
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><FiCalendar /></span>
              <div>
                <h2 className="text-base font-black text-ink-900">Portfolio Breakdown</h2>
                <p className="text-sm font-semibold text-ink-500 mt-1">{money((financial.shareCapital ?? 0) + (financial.weeklySavings ?? 0) + (financial.welfareKitty ?? 0))} total balance</p>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {[['Share Capital', financial.shareCapital, 'bg-brand-500'], ['Weekly Savings', financial.weeklySavings, 'bg-emerald-500'], ['Welfare Kitty', financial.welfareKitty, 'bg-amber-500']].map(([lbl, val, color]) => {
                const total = (financial.shareCapital ?? 0) + (financial.weeklySavings ?? 0) + (financial.welfareKitty ?? 0);
                const pct = total > 0 ? Math.round((Number(val) / total) * 100) : 0;
                return (
                  <div key={String(lbl)}>
                    <div className="flex items-center justify-between text-ink-500"><span>{String(lbl)}</span><span className="font-semibold text-ink-700">{money(Number(val))}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-ink-100"><div className={`h-full rounded-full ${String(color)}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><FiBell /></span>
              <div>
                <h2 className="text-base font-black text-ink-900">Quick Links</h2>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <a href="/member/contributions" className="text-sm font-semibold text-brand-700 hover:underline">View contributions →</a>
              <a href="/member/loans" className="text-sm font-semibold text-brand-700 hover:underline">View / apply for loans →</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default MemberDashboardPage;
