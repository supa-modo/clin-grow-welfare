import { Link } from 'react-router-dom';
import { FiActivity, FiCheckCircle, FiCreditCard, FiFileText, FiShield, FiUsers } from 'react-icons/fi';
import { useAuthStore } from '@/store/auth';

type PortalDashboardPageProps = {
  portal: 'admin' | 'officials';
};

const adminCards = [
  { label: 'Member registry', value: 'Admissions and lifecycle', href: '/dashboard/members', icon: FiUsers },
  { label: 'Ledger controls', value: 'Journals and accounts', href: '/dashboard/ledger/journals', icon: FiFileText },
  { label: 'Contribution desk', value: 'Receipts and reversals', href: '/dashboard/contributions', icon: FiCreditCard },
  { label: 'Loan portfolio', value: 'Approvals and repayments', href: '/dashboard/loans', icon: FiActivity },
];

const officialCards = [
  { label: 'Member operations', value: 'Approve, activate, review', href: '/officials/members', icon: FiUsers },
  { label: 'Contribution posting', value: 'Single and bulk workflows', href: '/officials/contributions', icon: FiCreditCard },
  { label: 'Loan workflows', value: 'Verify, approve, disburse', href: '/officials/loans', icon: FiActivity },
  { label: 'Audit trail', value: 'Ledger-ready evidence', href: '/officials/reports', icon: FiShield },
];

export function PortalDashboardPage({ portal }: PortalDashboardPageProps) {
  const user = useAuthStore((state) => state.user);
  const cards = portal === 'admin' ? adminCards : officialCards;
  const title = portal === 'admin' ? 'Admin Dashboard' : 'Officials Dashboard';
  const subtitle = portal === 'admin'
    ? 'Technical governance, user access, and finance setup for Clin-Grow.'
    : 'Role-scoped operations for member, contribution, ledger, and loan workflows.';

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-700">
              Clin-Grow Welfare Management
            </p>
            <h1 className="mt-2 text-2xl font-extrabold text-ink-950">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">{subtitle}</p>
          </div>
          <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm">
            <p className="font-bold text-ink-900">{user?.name ?? 'Authenticated user'}</p>
            <p className="mt-1 text-xs font-semibold text-ink-500">
              {user?.roles.join(' / ') || 'Role-scoped session'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              to={card.href}
              className="group rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-800">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-extrabold text-ink-950">{card.label}</p>
              <p className="mt-1 text-sm text-ink-500">{card.value}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft lg:col-span-2">
          <div className="flex items-center gap-3">
            <FiCheckCircle className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-extrabold text-ink-950">Phase 0-5 control checklist</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {['Backend RBAC enforced', 'Ledger-first balances', 'Admission prerequisites', 'Loan agreement gate', 'Document authorization', 'Fresh seed scenarios'].map((item) => (
              <div key={item} className="rounded-xl border border-ink-100 bg-ink-50 px-3 py-2 text-sm font-semibold text-ink-700">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <h2 className="text-base font-extrabold text-ink-950">Recommended next action</h2>
          <p className="mt-3 text-sm leading-6 text-ink-600">
            Start with members, then post prerequisite share capital, approve activation, and continue into contributions and loans.
          </p>
        </div>
      </section>
    </div>
  );
}
