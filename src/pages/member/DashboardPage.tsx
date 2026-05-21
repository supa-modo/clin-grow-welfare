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
        <MetricCard label="Shares balance" value={money(financial.shareCapital)} note="Ledger connection in Phase 3" icon={<TbWallet />} />
        <MetricCard label="Kitty contributions" value={money(financial.welfareKitty)} note="Contribution history in Phase 4" icon={<TbPigMoney />} />
        <MetricCard label="Monthly contributions" value={money(financial.weeklySavings)} note="Recurring contributions in Phase 4" icon={<FiCreditCard />} />
        <MetricCard label="Loan balance" value={money(financial.activeLoanBalance)} note="Loan module in Phase 5" icon={<FiShield />} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-ink-900">Recent contributions</h2>
            <FiFileText className="text-ink-400" />
          </div>
          <div className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-5 text-sm text-ink-500">
            Contribution receipts will appear here once Phase 4 posting is connected.
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><FiCalendar /></span>
              <div>
                <h2 className="text-base font-black text-ink-900">Upcoming reminder</h2>
                <p className="text-sm text-ink-500">Expected payment reminders will be shown here.</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><FiBell /></span>
              <div>
                <h2 className="text-base font-black text-ink-900">Notices</h2>
                <p className="text-sm text-ink-500">Official announcements and welfare notices will appear here.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default MemberDashboardPage;
