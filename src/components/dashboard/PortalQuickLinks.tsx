import { Link } from 'react-router-dom';
import {
  FiActivity,
  FiCreditCard,
  FiFileText,
  FiShield,
  FiUsers,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';

export type QuickLinkCard = {
  label: string;
  value: string;
  href: string;
  icon: IconType;
};

export const adminQuickLinks: QuickLinkCard[] = [
  {
    label: 'Member registry',
    value: 'Admissions and lifecycle',
    href: '/dashboard/members',
    icon: FiUsers,
  },
  {
    label: 'Ledger controls',
    value: 'Journals and accounts',
    href: '/dashboard/ledger?tab=journals',
    icon: FiFileText,
  },
  {
    label: 'Contribution desk',
    value: 'Receipts and reversals',
    href: '/dashboard/contributions',
    icon: FiCreditCard,
  },
  {
    label: 'Loan portfolio',
    value: 'Approvals and repayments',
    href: '/dashboard/loans',
    icon: FiActivity,
  },
];

export const officialQuickLinks: QuickLinkCard[] = [
  {
    label: 'Member operations',
    value: 'Approve, activate, review',
    href: '/officials/members',
    icon: FiUsers,
  },
  {
    label: 'Contribution posting',
    value: 'Single and bulk workflows',
    href: '/officials/contributions',
    icon: FiCreditCard,
  },
  {
    label: 'Loan workflows',
    value: 'Verify, approve, disburse',
    href: '/officials/loans',
    icon: FiActivity,
  },
  {
    label: 'Audit trail',
    value: 'Ledger-ready evidence',
    href: '/officials/reports',
    icon: FiShield,
  },
];

export function PortalQuickLinks({ cards }: { cards: QuickLinkCard[] }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.href}
            to={card.href}
            className="group rounded-2xl border border-ink-100 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-800">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-extrabold text-ink-950">{card.label}</p>
            <p className="mt-1 text-xs text-ink-500">{card.value}</p>
          </Link>
        );
      })}
    </section>
  );
}
