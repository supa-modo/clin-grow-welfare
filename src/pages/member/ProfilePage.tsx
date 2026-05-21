import { useEffect, useState } from 'react';
import { FiCreditCard, FiPhone, FiShield, FiUser } from 'react-icons/fi';
import { memberPortalApi } from '@/services/memberApi';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import type { Member } from '@/types/member';

function StatusPill({ status }: { status: string }) {
  return <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-black text-brand-800">{status.replace('_', ' ')}</span>;
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400">{label}</p>
      <div className="mt-1 text-sm font-bold text-ink-800">{value || '-'}</div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>
        <h2 className="text-base font-black text-ink-900">{title}</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function MemberProfilePage() {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    memberPortalApi.profile()
      .then(setMember)
      .catch(() => setError('We could not load your profile details.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-72 place-items-center rounded-3xl border border-ink-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 text-sm font-bold text-ink-600"><Spinner /> Loading profile...</div>
      </div>
    );
  }

  if (error || !member) return <EmptyState title="Profile unavailable" message={error || 'Your account is not linked to a member profile.'} />;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-ink-100 bg-gradient-to-r from-white via-brand-50/70 to-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">My Profile</p>
            <h1 className="mt-1 text-2xl font-black text-ink-950 md:text-3xl">{member.name}</h1>
            <p className="mt-2 text-sm font-semibold text-ink-500">{member.membershipNumber}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill status={member.status} />
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${member.registrationFeePaid ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              Registration {member.registrationFeePaid ? 'Paid' : 'Pending'}
            </span>
          </div>
        </div>
      </section>

      <Section title="Personal information" icon={<FiUser />}>
        <Field label="Full name" value={member.name} />
        <Field label="ID / Passport" value={member.idNumber} />
        <Field label="Member number" value={member.membershipNumber} />
        <Field label="Join date" value={new Date(member.dateJoined).toLocaleDateString()} />
      </Section>

      <Section title="Contact information" icon={<FiPhone />}>
        <Field label="Phone" value={member.phone} />
        <Field label="Email" value={member.email} />
      </Section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Section title="Primary beneficiary" icon={<FiShield />}>
          <Field label="Name" value={member.beneficiaryName} />
          <Field label="Relationship" value={member.beneficiaryRelationship} />
          <Field label="Phone" value={member.beneficiaryPhone} />
          <Field label="Allocation" value="100% primary allocation" />
        </Section>

        <Section title="Administrative status" icon={<FiCreditCard />}>
          <Field label="Approval" value={member.approvedAt ? 'Approved' : 'Pending approval'} />
          <Field label="Approved date" value={member.approvedAt ? new Date(member.approvedAt).toLocaleDateString() : '-'} />
          <Field label="Registration fee" value={member.registrationFeePaid ? 'Paid' : 'Pending'} />
          <Field label="Notes" value={member.nonComplianceReasons} />
        </Section>
      </section>
    </div>
  );
}

export default MemberProfilePage;
