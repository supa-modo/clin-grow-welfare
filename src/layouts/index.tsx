import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { FiChevronDown, FiCreditCard, FiFileText, FiLogOut, FiUser } from 'react-icons/fi';
import { TbLayoutDashboard } from 'react-icons/tb';

import { useAuthStore } from '@/store/auth';
import { availableWorkspaces, workspaceLabels, workspaceRoutes, type WorkspaceKey } from '@/lib/workspaces';

type NavItem = { label: string; to: string; permission?: string };

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Members', to: '/dashboard/members', permission: 'officialsPortal.members.view' },
  { label: 'Ledger', to: '/dashboard/ledger', permission: 'ledger.journal.view' },
  { label: 'Contributions', to: '/dashboard/contributions', permission: 'contributions.view' },
  { label: 'Loans', to: '/dashboard/loans', permission: 'officialsPortal.loans.view' },
  { label: 'Welfare Claims', to: '/dashboard/welfare', permission: 'officialsPortal.welfareClaims.view' },
  { label: 'Meetings', to: '/dashboard/meetings', permission: 'officialsPortal.meetings.view' },
  { label: 'Approvals', to: '/dashboard/approvals', permission: 'officialsPortal.approvals.view' },
  { label: 'Reports', to: '/dashboard/reports', permission: 'officialsPortal.reports.view' },
];

const officialsNavItems: NavItem[] = [
  { label: 'Dashboard', to: '/officials', permission: 'officialsPortal.dashboard.view' },
  { label: 'Members', to: '/officials/members', permission: 'officialsPortal.members.view' },
  { label: 'Contributions', to: '/officials/contributions', permission: 'contributions.view' },
  { label: 'Loans', to: '/officials/loans', permission: 'officialsPortal.loans.view' },
  { label: 'Welfare Claims', to: '/officials/welfare', permission: 'officialsPortal.welfareClaims.view' },
  { label: 'Meetings', to: '/officials/meetings', permission: 'officialsPortal.meetings.view' },
  { label: 'Approvals', to: '/officials/approvals', permission: 'officialsPortal.approvals.view' },
  { label: 'Reports', to: '/officials/reports', permission: 'officialsPortal.reports.view' },
];

function SidebarNav({ items }: { items: NavItem[] }) {
  const user = useAuthStore((s) => s.user);
  const visibleItems = items.filter((item) => !item.permission || user?.permissions.includes(item.permission));

  return (
    <nav className="flex flex-col gap-1 text-sm">
      {visibleItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="rounded-lg px-3 py-2 font-semibold text-ink-700 hover:bg-brand-50 hover:text-brand-800"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function getInitials(name?: string) {
  if (!name) return 'CG';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function Header() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const workspaces = availableWorkspaces(user);
  const currentWorkspace: WorkspaceKey = location.pathname.startsWith('/member')
    ? 'member'
    : location.pathname.startsWith('/officials')
      ? 'officials'
      : 'admin';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setProfileOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchWorkspace = (workspace: WorkspaceKey) => {
    setProfileOpen(false);
    if (workspace !== currentWorkspace) navigate(workspaceRoutes[workspace]);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="h-14 border-b border-ink-100 bg-white px-4">
      <div className="flex h-full items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-ink-900">{workspaceLabels[currentWorkspace]}</p>
          <p className="text-xs text-ink-500">Clin-Grow Welfare Group</p>
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-2.5 py-1.5 text-left transition hover:bg-ink-50"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-extrabold text-brand-800">
              {getInitials(user?.name)}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-40 truncate text-xs font-bold text-ink-900">{user?.name ?? 'User'}</span>
              <span className="block max-w-40 truncate text-[0.68rem] font-medium text-ink-500">
                {user?.email ?? user?.phone ?? 'Authenticated session'}
              </span>
            </span>
            <FiChevronDown className="h-4 w-4 text-ink-500" />
          </button>

          {profileOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.14)]"
            >
              <div className="border-b border-ink-100 px-4 py-3">
                <p className="text-sm font-extrabold text-ink-900">{user?.name ?? 'User'}</p>
                <p className="mt-0.5 truncate text-xs text-ink-500">
                  {user?.email ?? user?.phone ?? 'Authenticated session'}
                </p>
              </div>

              <div className="px-2 py-2">
                <p className="px-2 pb-1 pt-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-ink-400">
                  Portal
                </p>
                {workspaces.map((workspace) => {
                  const active = workspace === currentWorkspace;
                  return (
                    <button
                      key={workspace}
                      type="button"
                      role="menuitem"
                      onClick={() => switchWorkspace(workspace)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        active ? 'bg-brand-50 text-brand-800' : 'text-ink-700 hover:bg-ink-50'
                      }`}
                    >
                      <TbLayoutDashboard className="h-4 w-4 shrink-0" />
                      <span className="flex-1 font-semibold">{workspaceLabels[workspace]}</span>
                      {active ? <span className="text-[0.65rem] font-extrabold uppercase">Active</span> : null}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-ink-100 p-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
                >
                  <FiLogOut className="h-4 w-4 shrink-0" />
                  Logout
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed bottom-0 left-0 top-0 w-64 border-r border-ink-100 bg-white p-4">
        <h1 className="mb-4 font-bold text-ink-900">Clin-Grow Admin</h1>
        <SidebarNav items={adminNavItems} />
      </aside>
      <div className="pl-64">
        <Header />
        <main className="p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function OfficialsLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed bottom-0 left-0 top-0 w-64 border-r border-ink-100 bg-white p-4">
        <h1 className="mb-4 font-bold text-ink-900">Officials</h1>
        <SidebarNav items={officialsNavItems} />
      </aside>
      <div className="pl-64">
        <Header />
        <main className="p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function MemberLayout() {
  const location = useLocation();
  const memberNavItems = [
    { label: 'Dashboard', to: '/member', icon: TbLayoutDashboard },
    { label: 'My Profile', to: '/member/profile', icon: FiUser },
    { label: 'Beneficiaries', to: '/member/beneficiary', icon: FiUser },
    { label: 'Contributions', to: '/member/contributions', icon: FiCreditCard },
    { label: 'Loans', to: '/member/loans', icon: FiFileText },
    { label: 'Statements', to: '/member/statements', icon: FiFileText },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-6xl p-4">
        <nav className="mb-4 flex gap-2 overflow-x-auto rounded-2xl border border-ink-100 bg-white p-2 text-sm shadow-sm">
          {memberNavItems.map((item) => {
            const active = item.to === '/member' ? location.pathname === '/member' : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 font-bold transition ${
                  active ? 'bg-brand-700 text-white shadow-sm' : 'text-ink-700 hover:bg-brand-50 hover:text-brand-800'
                }`}
                to={item.to}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Outlet />
      </main>
    </div>
  );
}
