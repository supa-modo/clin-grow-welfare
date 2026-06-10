import { describe, expect, it } from 'vitest';
import { canGoToStep, clampCeremonyStep, isCollectionsFinalized, isEarlyCeremonyLocked, resolveAttendanceStatus } from './utils';
import type { MeetingRecord, MeetingRoster } from './types';

const rosterStub = {
  members: [{
    member: { id: 'member-1', name: 'Test Member', membershipNumber: 'CG20260001' },
    expectations: {
      weeklySavings: { paidThisWeek: 250, min: 250, max: 1000, remainingToMax: 750 },
      shareCapital: { paidToDate: 500, max: 5000, remaining: 4500 },
      welfareKitty: { paidThisMonth: 250, dueThisMonth: 0 },
      fines: { pendingTotal: 0, rows: [] },
      loans: { active: [], outstandingTotal: 0 },
    },
  }],
} as MeetingRoster;

describe('clampCeremonyStep', () => {
  it('uses server step when local storage is ahead of server progress', () => {
    expect(clampCeremonyStep('loans', 'attendance')).toBe('attendance');
  });

  it('keeps stored step when it is behind or equal to server progress', () => {
    expect(clampCeremonyStep('fines', 'collections')).toBe('fines');
    expect(clampCeremonyStep('collections', 'collections')).toBe('collections');
  });

  it('falls back to attendance when no steps are known', () => {
    expect(clampCeremonyStep(null, null)).toBe('attendance');
  });
});

describe('resolveAttendanceStatus', () => {
  it('defaults submitted apologies to absent with apology', () => {
    expect(resolveAttendanceStatus({
      apology: { id: 'a1', status: 'SUBMITTED', reason: 'Travel' },
    })).toBe('ABSENT_WITH_APOLOGY');
  });

  it('defaults rejected apologies to absent without apology', () => {
    expect(resolveAttendanceStatus({
      apology: { id: 'a1', status: 'REJECTED', reason: 'Late notice' },
    })).toBe('ABSENT_WITHOUT_APOLOGY');
  });

  it('prefers an explicit draft over apology defaults', () => {
    expect(resolveAttendanceStatus({
      apology: { id: 'a1', status: 'SUBMITTED', reason: 'Travel' },
    }, 'PRESENT_ON_TIME')).toBe('PRESENT_ON_TIME');
  });
});

describe('isCollectionsFinalized', () => {
  it('detects finalized collections', () => {
    expect(isCollectionsFinalized({ collectionsFinalizedAt: '2026-06-02' } as MeetingRecord)).toBe(true);
    expect(isCollectionsFinalized({ collectionsFinalizedAt: null } as MeetingRecord)).toBe(false);
  });
});

describe('collections finalize gating', () => {
  const openCollectionsMeeting = {
    status: 'COLLECTIONS_OPEN',
    attendanceFinalizedAt: '2026-06-01',
    collectionsFinalizedAt: null,
  } as MeetingRecord;

  it('blocks repayments until collections are finalized', () => {
    expect(canGoToStep('repayments', openCollectionsMeeting, rosterStub)).toBe(false);
  });

  it('allows repayments after collections are finalized', () => {
    expect(canGoToStep('repayments', {
      ...openCollectionsMeeting,
      collectionsFinalizedAt: '2026-06-02',
    }, rosterStub)).toBe(true);
  });
});

describe('isEarlyCeremonyLocked', () => {
  it('locks early ceremony only after the loan window is actually open', () => {
    const attendanceMeeting = { status: 'ATTENDANCE_RECORDING' } as MeetingRecord;
    const loanWindowMeeting = { status: 'LOAN_WINDOW_OPEN', loanStageReachedAt: '2026-06-01' } as MeetingRecord;

    expect(isEarlyCeremonyLocked(attendanceMeeting)).toBe(false);
    expect(isEarlyCeremonyLocked(loanWindowMeeting)).toBe(true);
  });
});
