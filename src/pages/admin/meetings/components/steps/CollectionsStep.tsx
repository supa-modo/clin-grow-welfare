import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { Modal } from '@/components/ui/Modal';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
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

type CollectionTab = 'weekly' | 'share' | 'welfare';

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

const TAB_CONFIG: Record<CollectionTab, { label: string; type: 'WEEKLY_SAVINGS' | 'SHARE_CAPITAL' | 'WELFARE_KITTY'; kind: 'week' | 'share' | 'welfare' }> = {
  weekly: { label: 'Weekly savings', type: 'WEEKLY_SAVINGS', kind: 'week' },
  share: { label: 'Share capital', type: 'SHARE_CAPITAL', kind: 'share' },
  welfare: { label: 'Welfare kitty', type: 'WELFARE_KITTY', kind: 'welfare' },
};

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
  const [search, setSearch] = useState('');
  const [collectionTab, setCollectionTab] = useState<CollectionTab>('weekly');
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
  const defaultWelfareMonthDate = monthStartIso(new Date(meeting.meetingDate));
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

  const tabCounts = useMemo(() => {
    const members = roster?.members ?? [];
    return {
      weekly: members.filter((row) => row.expectations.weeklySavings.remainingToMax > 0).length,
      share: members.filter((row) =>
        row.expectations.shareCapital.remaining > 0
        && row.expectations.shareCapital.windowOpen !== false,
      ).length,
      welfare: readiness?.rows.filter((row) => !row.welfareOk && !row.welfareWaived).length ?? 0,
    };
  }, [roster, readiness]);

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
    const welfareRemaining = welfare.remainingThisMonth ?? welfare.dueThisMonth ?? monthly;
    const suggested = kind === 'week'
      ? weekly.remainingToMax
      : kind === 'share'
        ? share.remaining
        : welfareRemaining;

    const draftKey = `${meeting.id}-${row.memberId}-${type}`;
    const draft = collectionDraft[draftKey] ?? { type, amount: String(suggested), reference: '', paymentMethod: 'CASH', periodDate: '' };
    const shareWindowClosed = kind === 'share' && share.windowOpen === false;
    const shareDisabled = kind === 'share' && (share.remaining <= 0 || shareWindowClosed);
    const periodDate = kind === 'week'
      ? (draft.periodDate || defaultWeekDate)
      : kind === 'welfare'
        ? (draft.periodDate || defaultWelfareMonthDate)
        : draft.periodDate;
    const selectedWeekKey = kind === 'week' ? weekStartIso(new Date(`${periodDate}T00:00:00`)) : '';
    const selectedWeekPaid = kind === 'week' ? Number(weekly.paymentsByWeek?.[selectedWeekKey] ?? 0) : 0;
    const selectedWeekRemaining = kind === 'week' ? Math.max(0, weekly.max - selectedWeekPaid) : suggested;
    const selectedMonthKey = kind === 'welfare' ? periodDate.slice(0, 7) : '';
    const selectedMonthPaid = kind === 'welfare'
      ? Number(welfare.paymentsByMonth?.[selectedMonthKey] ?? 0)
      : 0;
    const selectedMonthRemaining = kind === 'welfare'
      ? Math.max(0, (welfare.monthlyDue ?? monthly) - selectedMonthPaid)
      : suggested;
    const welfareAmount = Number(draft.amount || 0);
    const welfareOverpay = kind === 'welfare' && welfareAmount > selectedMonthRemaining + 0.01;
    const welfareFullyPaid = kind === 'welfare' && selectedMonthRemaining <= 0;
    const welfareBlocked = kind === 'welfare' && (welfareOverpay || welfareFullyPaid);
    const weeklyBlocked = kind === 'week' && selectedWeekRemaining <= 0;

    return (
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
          {kind === 'week' ? (
            <span>{money(selectedWeekPaid)} / {money(weekly.max)} · week</span>
          ) : null}
          {kind === 'share' ? (
            <span>{money(share.paidToDate)} / {money(share.max)} share</span>
          ) : null}
          {kind === 'welfare' ? (
            <span>{money(selectedMonthPaid)} / {money(welfare.monthlyDue ?? monthly)} · month</span>
          ) : null}
          {shareWindowClosed && share.windowClosesAt ? (
            <span className="font-semibold text-amber-700">
              Window closed {new Date(share.windowClosesAt).toLocaleDateString('en-KE')}
            </span>
          ) : null}
          {welfareOverpay ? (
            <span className="font-semibold text-red-700">Exceeds remaining welfare due</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-24 rounded-lg border border-ink-200 px-2.5 py-2 text-sm disabled:bg-ink-50"
            value={draft.amount}
            disabled={shareDisabled || weeklyBlocked}
            placeholder="Amount"
            onChange={(e) => setDraft(draftKey, type, { amount: e.target.value }, String(selectedWeekRemaining))}
          />
          {kind === 'week' ? (
            <input
              className="w-36 rounded-lg border border-ink-200 px-2.5 py-2 text-xs"
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
              className="w-36 rounded-lg border border-ink-200 px-2.5 py-2 text-xs"
              type="month"
              title="Target welfare month"
              value={periodDate.slice(0, 7)}
              onChange={(e) => {
                const nextMonthKey = e.target.value;
                const nextPaid = Number(welfare.paymentsByMonth?.[nextMonthKey] ?? 0);
                const nextRemaining = Math.max(0, (welfare.monthlyDue ?? monthly) - nextPaid);
                setDraft(draftKey, type, { periodDate: `${nextMonthKey}-01`, amount: String(nextRemaining) }, String(nextRemaining));
              }}
            />
          ) : null}
          <select
            className="rounded-lg border border-ink-200 px-2 py-2 text-xs"
            value={draft.paymentMethod ?? 'CASH'}
            title="Payment mode"
            onChange={(e) => setDraft(draftKey, type, { paymentMethod: e.target.value }, draft.amount)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            className="min-w-24 flex-1 rounded-lg border border-ink-200 px-2.5 py-2 text-xs"
            placeholder="Receipt ref"
            value={draft.reference}
            onChange={(e) => setDraft(draftKey, type, { reference: e.target.value }, draft.amount)}
          />
          <Button
            size="sm"
            disabled={blocked || shareDisabled || weeklyBlocked || welfareBlocked || Number(draft.amount) <= 0}
            onClick={() => onPost(row.memberId, type, Number(draft.amount), periodDate)}
          >
            Post
          </Button>
        </div>
        {kind === 'week' ? (
          <p className={`mt-2 text-xs ${weeklyBlocked ? 'font-semibold text-emerald-700' : 'text-ink-500'}`}>
            {weeklyBlocked ? 'Week complete.' : `${money(selectedWeekRemaining)} remaining for selected week.`}
          </p>
        ) : null}
        {kind === 'welfare' ? (
          <p className={`mt-2 text-xs ${welfareBlocked ? 'font-semibold text-red-700' : 'text-ink-500'}`}>
            {welfareFullyPaid
              ? 'Selected month complete.'
              : welfareOverpay
                ? `Max ${money(selectedMonthRemaining)} remaining for selected month.`
                : `${money(selectedMonthRemaining)} remaining for selected month.`}
          </p>
        ) : null}
      </div>
    );
  };

  const activeConfig = TAB_CONFIG[collectionTab];
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
      key: 'collection',
      header: activeConfig.label,
      render: (row) => renderContributionCell(row, activeConfig.type, activeConfig.kind),
    },
  ];

  const contributionTypes = ['REGISTRATION', 'SHARE_CAPITAL', 'WEEKLY_SAVINGS', 'WELFARE_KITTY', 'EMERGENCY_CONTRIBUTION', 'FINE_PAYMENT', 'OTHER'];

  return (
    <div className="space-y-4">
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
            <p className="font-bold text-ink-900">Collections readiness</p>
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
        Edge-case contributions:{' '}
        <Link className="font-semibold text-brand-700 underline" to={contributionsDeskPath}>
          official contributions desk
        </Link>{' '}
        for non-meeting corrections, imports, or exceptional receipts.
      </p>

      <SegmentedTabs<CollectionTab>
        tabs={[
          { value: 'weekly', label: 'Weekly savings', count: tabCounts.weekly },
          { value: 'share', label: 'Share capital', count: tabCounts.share },
          { value: 'welfare', label: 'Welfare kitty', count: tabCounts.welfare },
        ]}
        value={collectionTab}
        onChange={setCollectionTab}
        variant="line"
        compact
        aria-label="Collection types"
      />

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
