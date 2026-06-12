import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { Modal } from '@/components/ui/Modal';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { money } from '@/pages/admin/shared/adminFormatters';
import type { MeetingRecord, MeetingRoster } from '../../types';
import { isCorrectionMode, monthStartIso, todayIso, weekStartIso } from '../../utils';
import { PostedItemsCorrectionPanel } from '../PostedItemsCorrectionPanel';

type CollectionDraft = Record<string, {
  type: string;
  amount: string;
  reference: string;
  paymentMethod?: string;
  loanId?: string;
  fineId?: string;
  periodDate?: string;
}>;

type MemberRow = {
  memberId: string;
  membershipNumber: string;
  name: string;
};

type Readiness = {
  ready: boolean;
  lastMeetingOfMonth: boolean;
  rows: Array<{
    memberId: string;
    name: string;
    membershipNumber: string;
    weeklyOk: boolean;
    welfareOk: boolean;
    weeklyWaived?: boolean;
    welfareWaived?: boolean;
    ready: boolean;
  }>;
};

type Props = {
  meeting: MeetingRecord;
  roster: MeetingRoster | null;
  busy: string;
  collectionDraft: CollectionDraft;
  setCollectionDraft: React.Dispatch<React.SetStateAction<CollectionDraft>>;
  readiness: Readiness | null;
  constitutionalOverride: boolean;
  onOverrideChange: (value: boolean) => void;
  onRefreshReadiness: () => void;
  onWaiver: (memberId: string, patch: { weeklyWaived?: boolean; welfareWaived?: boolean }) => void;
  onPost: (memberId: string, type: string, amount: number, periodDate?: string) => void;
  onFinalize: () => void;
  onReverseItem?: (itemId: string, reason: string) => void;
  onAdjustItem?: (itemId: string, amount: number, reason: string) => void;
};

const PAYMENT_METHODS = ['CASH', 'BANK', 'MPESA', 'TRANSFER', 'OTHER'] as const;

export function CollectionsStep({
  meeting,
  roster,
  busy,
  collectionDraft,
  setCollectionDraft,
  readiness,
  constitutionalOverride,
  onOverrideChange,
  onRefreshReadiness,
  onWaiver,
  onPost,
  onFinalize,
  onReverseItem,
  onAdjustItem,
}: Props) {
  const today = useMemo(() => new Date(), []);
  const [search, setSearch] = useState('');
  const [showWaivers, setShowWaivers] = useState(false);
  const [selectedWaiverMemberId, setSelectedWaiverMemberId] = useState('');
  const location = useLocation();
  const finalized = Boolean(meeting.collectionsFinalizedAt);
  const blocked = !!busy || meeting.status === 'CLOSED' || (finalized && !isCorrectionMode(meeting));
  const canFinalize = !finalized
    && meeting.status !== 'CLOSED'
    && Boolean(readiness?.ready || constitutionalOverride);
  const monthly = roster?.settings?.monthlyWelfareContribution ?? 250;
  const defaultWeekDate = todayIso();
  const defaultWelfareMonthDate = monthStartIso(today);
  const contributionsDeskPath = location.pathname.startsWith('/dashboard') ? '/dashboard/contributions' : '/officials/contributions';
  const waiverRows = readiness?.rows ?? [];
  const dueWaiverRows = waiverRows.filter((row) => !row.ready || row.weeklyWaived || row.welfareWaived);
  const selectedWaiverRow = waiverRows.find((row) => row.memberId === selectedWaiverMemberId) ?? dueWaiverRows[0];
  const waiverOptions = (dueWaiverRows.length ? dueWaiverRows : waiverRows).map((row) => ({
    value: row.memberId,
    label: `${row.membershipNumber} - ${row.name}`,
  }));

  const memberRows = useMemo<MemberRow[]>(() => {
    return (roster?.members ?? []).map((row) => ({
      memberId: row.member.id,
      membershipNumber: row.member.membershipNumber,
      name: row.member.name,
    }));
  }, [roster]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return memberRows;
    return memberRows.filter((m) =>
      [m.name, m.membershipNumber].some((v) => v.toLowerCase().includes(q)),
    );
  }, [memberRows, search]);

  const setDraft = (key: string, type: string, patch: Partial<CollectionDraft[string]>, fallbackAmount: string) => {
    setCollectionDraft((state) => ({
      ...state,
      [key]: {
        ...(state[key] ?? { type, reference: '', amount: fallbackAmount, paymentMethod: 'CASH' }),
        ...patch,
      },
    }));
  };

  const welfareCoveredMonths = (startDate: string, amount: number, paidMonths: string[] = []) => {
    const monthCount = monthly > 0 && amount > 0 && Math.abs(amount / monthly - Math.round(amount / monthly)) < 0.01
      ? Math.round(amount / monthly)
      : 0;
    if (!monthCount) return { covered: [] as string[], duplicate: [] as string[], validMultiple: false };
    const start = new Date(`${startDate.slice(0, 7)}-01T00:00:00`);
    const covered = Array.from({ length: monthCount }, (_, index) => {
      const d = new Date(start.getFullYear(), start.getMonth() + index, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    return { covered, duplicate: covered.filter((month) => paidMonths.includes(month)), validMultiple: true };
  };

  const renderContributionCell = (
    row: MemberRow,
    type: 'WEEKLY_SAVINGS' | 'SHARE_CAPITAL' | 'WELFARE_KITTY',
    kind: 'week' | 'share' | 'welfare',
  ) => {
    const rosterRow = roster?.members.find((m) => m.member.id === row.memberId);
    if (!rosterRow) return null;
    const weekly = rosterRow.expectations.weeklySavings;
    const share = rosterRow.expectations.shareCapital;
    const welfare = rosterRow.expectations.welfareKitty;
    const suggested = kind === 'week' ? weekly.remainingToMax : kind === 'share' ? share.remaining : welfare.dueThisMonth || monthly;
    const label = kind === 'share'
      ? `${money(share.paidToDate)} / ${money(share.max)} share`
      : kind === 'welfare'
        ? `${money(welfare.paidThisMonth)} paid this month`
        : '';

    const draftKey = `${meeting.id}-${row.memberId}-${type}`;
    const draft = collectionDraft[draftKey] ?? { type, amount: String(suggested), reference: '', paymentMethod: 'CASH', periodDate: '' };
    const shareDisabled = kind === 'share' && share.remaining <= 0;
    const periodDate = kind === 'week'
      ? (draft.periodDate || defaultWeekDate)
      : kind === 'welfare'
        ? (draft.periodDate || defaultWelfareMonthDate)
        : draft.periodDate;
    const selectedWeekKey = kind === 'week' ? weekStartIso(new Date(`${periodDate}T00:00:00`)) : '';
    const selectedWeekPaid = kind === 'week' ? Number(weekly.paymentsByWeek?.[selectedWeekKey] ?? 0) : 0;
    const selectedWeekRemaining = kind === 'week' ? Math.max(0, weekly.max - selectedWeekPaid) : suggested;
    const displayLabel = kind === 'week'
      ? `${money(selectedWeekPaid)} / ${money(weekly.max)} selected week`
      : label;
    const welfareStatus = kind === 'welfare'
      ? welfareCoveredMonths(periodDate, Number(draft.amount || 0), welfare.paidMonths ?? [])
      : { covered: [], duplicate: [] as string[], validMultiple: true };
    const welfareBlocked = kind === 'welfare' && (!welfareStatus.validMultiple || welfareStatus.duplicate.length > 0);
    const weeklyBlocked = kind === 'week' && selectedWeekRemaining <= 0;

    return (
      <div className="min-w-40">
        <p className="mb-1 text-xs font-semibold text-ink-500">{displayLabel}</p>
        <div className="flex flex-wrap items-center gap-1">
          <input
            className="w-20 rounded-lg border border-ink-200 px-2 py-1 text-sm disabled:bg-ink-50"
            value={draft.amount}
            disabled={shareDisabled || weeklyBlocked}
            onChange={(e) => setDraft(draftKey, type, { amount: e.target.value }, String(selectedWeekRemaining))}
          />
          {kind === 'week' ? (
            <input
              className="w-32 rounded-lg border border-ink-200 px-2 py-1 text-xs"
              type="date"
              title="Target saving week"
              value={periodDate}
              onChange={(e) => {
                const nextWeekKey = weekStartIso(new Date(`${e.target.value}T00:00:00`));
                const nextPaid = Number(weekly.paymentsByWeek?.[nextWeekKey] ?? 0);
                const nextRemaining = Math.max(0, weekly.max - nextPaid);
                setDraft(draftKey, type, { periodDate: e.target.value, amount: String(nextRemaining) }, String(nextRemaining));
              }}
            />
          ) : null}
          {kind === 'welfare' ? (
            <input
              className="w-32 rounded-lg border border-ink-200 px-2 py-1 text-xs"
              type="month"
              title="Target welfare month"
              value={periodDate.slice(0, 7)}
              onChange={(e) => setDraft(draftKey, type, { periodDate: `${e.target.value}-01` }, draft.amount)}
            />
          ) : null}
          <select
            className="rounded-lg border border-ink-200 px-1 py-1 text-xs"
            value={draft.paymentMethod ?? 'CASH'}
            title="Payment mode"
            onChange={(e) => setDraft(draftKey, type, { paymentMethod: e.target.value }, draft.amount)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            className="w-24 rounded-lg border border-ink-200 px-2 py-1 text-xs"
            placeholder="Ref"
            value={draft.reference}
            onChange={(e) => setDraft(draftKey, type, { reference: e.target.value }, draft.amount)}
          />
          <Button
            size="xs"
            disabled={blocked || shareDisabled || weeklyBlocked || welfareBlocked || Number(draft.amount) <= 0}
            onClick={() => onPost(row.memberId, type, Number(draft.amount), periodDate)}
          >
            Post
          </Button>
        </div>
        {kind === 'week' ? (
          <p className={`mt-1 text-xs ${weeklyBlocked ? 'font-semibold text-emerald-700' : 'text-ink-500'}`}>
            {weeklyBlocked
              ? 'Week complete.'
              : `${money(selectedWeekRemaining)} remaining.`}
          </p>
        ) : null}
        {kind === 'welfare' ? (
          <p className={`mt-1 text-xs ${welfareBlocked ? 'font-semibold text-red-700' : 'text-ink-500'}`}>
            {!welfareStatus.validMultiple
              ? `Use ${money(monthly)} or exact multiple.`
              : welfareStatus.duplicate.length
                ? `Paid: ${welfareStatus.duplicate.join(', ')}.`
                : `Covers ${welfareStatus.covered.join(', ') || 'month'}.`}
          </p>
        ) : null}
      </div>
    );
  };

  const columns: Column<MemberRow>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-900">{row.name}</p>
          <p className="text-xs text-ink-500">{row.membershipNumber}</p>
        </div>
      ),
    },
    {
      key: 'weekly',
      header: 'Weekly savings',
      render: (row) => renderContributionCell(row, 'WEEKLY_SAVINGS', 'week'),
    },
    {
      key: 'share',
      header: 'Share capital',
      render: (row) => renderContributionCell(row, 'SHARE_CAPITAL', 'share'),
    },
    {
      key: 'welfare',
      header: 'Welfare kitty',
      render: (row) => renderContributionCell(row, 'WELFARE_KITTY', 'welfare'),
    },
  ];

  const contributionTypes = ['REGISTRATION', 'SHARE_CAPITAL', 'WEEKLY_SAVINGS', 'WELFARE_KITTY', 'EMERGENCY_CONTRIBUTION', 'FINE_PAYMENT', 'OTHER'];

  return (
    <div className="space-y-3">
      {onReverseItem && onAdjustItem ? (
        <PostedItemsCorrectionPanel
          meeting={meeting}
          busy={busy}
          collectionTypes={contributionTypes}
          onReverse={onReverseItem}
          onAdjust={onAdjustItem}
        />
      ) : null}
      <div className="rounded-xl border border-ink-100 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-ink-900">Constitutional collections readiness</p>
            <p className="text-sm text-ink-600">
              {readiness?.ready || constitutionalOverride
                ? 'Collections are cleared for the next stage.'
                : `${dueWaiverRows.filter((row) => !row.ready).length} member(s) still need payment or waiver review.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={readiness?.ready || constitutionalOverride ? 'success' : 'warning'}>
              {readiness?.ready || constitutionalOverride ? 'Ready to proceed' : 'Action required'}
            </Badge>
            <Button size="sm" variant="secondary" disabled={!!busy} onClick={onRefreshReadiness}>Refresh</Button>
            <Button size="sm" variant="secondary" disabled={!!busy || !waiverOptions.length} onClick={() => setShowWaivers(true)}>Manage waivers</Button>
            {!finalized ? (
              <Button
                size="sm"
                variant="secondary2"
                disabled={!!busy || !canFinalize}
                isLoading={busy === 'collections-finalize'}
                loadingText="Finalizing..."
                onClick={onFinalize}
              >
                Finalize collections
              </Button>
            ) : null}
          </div>
        </div>
        {finalized ? (
          <p className="mt-3 text-xs font-semibold text-brand-700">
            Collections finalized {new Date(meeting.collectionsFinalizedAt!).toLocaleString()}. Post repayments on the Repayments step.
          </p>
        ) : null}
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink-700">
          <ToggleSwitch checked={constitutionalOverride} onChange={onOverrideChange} variant="warning" title="Official override" />
          Official override (documented exception)
        </label>
      </div>

      <p className="text-sm text-ink-600">
        Edge-case contributions: <Link className="font-semibold text-brand-700 underline" to={contributionsDeskPath}>official contributions desk</Link> for non-meeting corrections, imports, or exceptional receipts.
      </p>

      <DataTable
        columns={columns}
        rows={filteredMembers}
        getRowKey={(r) => r.memberId}
        search
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search member"
        emptyTitle="No members"
        emptyMessage="Roster has no members for this meeting."
        showAutoNumber
      />

      <Modal
        open={showWaivers}
        title="Collection waivers"
        subtitle="Search a member and mark the readiness exception approved by officials."
        onClose={() => setShowWaivers(false)}
        size="lg"
      >
        <div className="space-y-4">
          <SearchableDropdown
            label="Member"
            options={waiverOptions}
            value={selectedWaiverRow?.memberId ?? ''}
            onChange={setSelectedWaiverMemberId}
            placeholder="Search member"
          />
          {selectedWaiverRow ? (
            <div className="space-y-3 rounded-xl border border-ink-100 bg-ink-50 p-4">
              <div>
                <p className="font-bold text-ink-900">{selectedWaiverRow.name}</p>
                <p className="text-xs font-semibold text-ink-500">{selectedWaiverRow.membershipNumber}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={selectedWaiverRow.weeklyOk ? 'success' : 'warning'}>
                  Weekly {selectedWaiverRow.weeklyWaived ? 'waived' : selectedWaiverRow.weeklyOk ? 'OK' : 'due'}
                </Badge>
                <Badge tone={selectedWaiverRow.welfareOk ? 'success' : 'warning'}>
                  Welfare {selectedWaiverRow.welfareWaived ? 'waived' : selectedWaiverRow.welfareOk ? 'OK' : 'due'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => onWaiver(selectedWaiverRow.memberId, { weeklyWaived: !selectedWaiverRow.weeklyWaived })}>
                  {selectedWaiverRow.weeklyWaived ? 'Remove weekly waiver' : 'Waive weekly'}
                </Button>
                {readiness?.lastMeetingOfMonth ? (
                  <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => onWaiver(selectedWaiverRow.memberId, { welfareWaived: !selectedWaiverRow.welfareWaived })}>
                    {selectedWaiverRow.welfareWaived ? 'Remove welfare waiver' : 'Waive welfare'}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-ink-100 bg-ink-50 p-4 text-sm text-ink-600">No waiver candidates found.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
