import { useEffect, useState } from 'react';
import { FiClock, FiFileText, FiShield } from 'react-icons/fi';
import { memberPortalApi } from '@/services/memberApi';
import { EmptyState, Spinner } from '@/components/ui/Feedback';

export { MemberDashboardPage } from './DashboardPage';
export { MemberProfilePage } from './ProfilePage';

export function MemberBeneficiaryPage() {
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    memberPortalApi.beneficiaries()
      .then(setBeneficiaries)
      .catch(() => setBeneficiaries([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-72 place-items-center rounded-3xl border border-ink-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 text-sm font-bold text-ink-600"><Spinner /> Loading beneficiaries...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-ink-100 bg-gradient-to-r from-white via-brand-50/70 to-white p-5 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">Beneficiaries</p>
        <h1 className="mt-1 text-2xl font-black text-ink-950 md:text-3xl">My Beneficiaries</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
          Beneficiary details are read-only in the member portal for Phase 2. Updates are routed through official review.
        </p>
      </section>

      {beneficiaries.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {beneficiaries.map((beneficiary) => (
            <div key={beneficiary.id} className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-ink-900">{beneficiary.name}</p>
                  <p className="mt-1 text-sm font-semibold text-ink-500">{beneficiary.relationship}</p>
                </div>
                {beneficiary.isPrimary ? <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">Primary</span> : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-ink-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400">Phone</p>
                  <p className="mt-1 text-sm font-bold text-ink-800">{beneficiary.phone ?? '-'}</p>
                </div>
                <div className="rounded-2xl bg-ink-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400">Allocation</p>
                  <p className="mt-1 text-sm font-bold text-ink-800">{beneficiary.allocationPercentage}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No beneficiaries captured" message="Your primary beneficiary will appear here once officials complete the record." />
      )}
    </div>
  );
}

export function MemberPlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-ink-100 bg-gradient-to-r from-white via-brand-50/70 to-white p-5 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">Member Portal</p>
        <h1 className="mt-1 text-2xl font-black text-ink-950 md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">{description}</p>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
          <FiClock className="h-5 w-5 text-brand-700" />
          <h2 className="mt-3 font-black text-ink-900">Coming soon</h2>
          <p className="mt-1 text-sm text-ink-500">This workspace is staged for a later phase and has no broken actions.</p>
        </div>
        <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
          <FiShield className="h-5 w-5 text-emerald-700" />
          <h2 className="mt-3 font-black text-ink-900">Readiness</h2>
          <p className="mt-1 text-sm text-ink-500">The layout is ready for secure member-scoped data when backend endpoints land.</p>
        </div>
        <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
          <FiFileText className="h-5 w-5 text-amber-700" />
          <h2 className="mt-3 font-black text-ink-900">Records</h2>
          <p className="mt-1 text-sm text-ink-500">Future activity will appear here as structured cards and statements.</p>
        </div>
      </div>
    </div>
  );
}
