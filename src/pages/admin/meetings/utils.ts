import type { LoanPool, MeetingRecord, MeetingRoster, MeetingStep } from './types';

const STEP_ORDER: MeetingStep[] = ['attendance', 'fines', 'collections', 'repayments', 'summary', 'loans', 'close'];

export function finePreview(status: string, settings?: MeetingRoster['settings']) {
  if (status === 'PRESENT_LATE' || status === 'LATE' || status === 'LEFT_EARLY') return Number(settings?.lateFine ?? 100);
  if (status === 'ABSENT_WITH_APOLOGY') return Number(settings?.absentWithApologyFine ?? 150);
  if (status === 'ABSENT_WITHOUT_APOLOGY') return Number(settings?.absentWithoutApologyFine ?? 200);
  return 0;
}

export function stepIndex(step: MeetingStep) {
  return STEP_ORDER.indexOf(step);
}

export function nextStep(step: MeetingStep): MeetingStep | null {
  const idx = stepIndex(step);
  return idx >= 0 && idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;
}

export function prevStep(step: MeetingStep): MeetingStep | null {
  const idx = stepIndex(step);
  return idx > 0 ? STEP_ORDER[idx - 1] : null;
}

export function hasOpenLoanWindow(meeting?: MeetingRecord | null) {
  return Boolean(meeting?.loanWindows?.some((w) => w.status === 'OPEN'));
}

/** Meeting has left SCHEDULED/NOTICE_SENT — attendance, fines, collections may run. */
export const startedMeetingStatuses = new Set([
  'ATTENDANCE_RECORDING',
  'COLLECTIONS_OPEN',
  'LOAN_WINDOW_OPEN',
  'RESOLUTIONS_OPEN',
  'CLOSING_REVIEW',
  'ONGOING',
]);

export function isMeetingStarted(meeting?: MeetingRecord | null) {
  return Boolean(meeting && startedMeetingStatuses.has(meeting.status));
}

/** True when officials may leave the loans step or close the meeting (no open loan window). */
export function canLeaveLoansStep(meeting?: MeetingRecord | null) {
  return !hasOpenLoanWindow(meeting);
}

export function canCloseMeeting(meeting?: MeetingRecord | null, roster?: MeetingRoster | null, pool?: LoanPool | null) {
  if (!meeting || meeting.status === 'CLOSED') return false;
  return canGoToStep('close', meeting, roster, pool) && canLeaveLoansStep(meeting);
}

export function advanceBlockReason(
  step: MeetingStep,
  meeting?: MeetingRecord | null,
  roster?: MeetingRoster | null,
  pool?: LoanPool | null,
  collectionsReady?: boolean,
): string | null {
  if (!meeting || meeting.status === 'CLOSED') return 'Meeting is closed.';
  switch (step) {
    case 'attendance':
      if (['SCHEDULED', 'NOTICE_SENT'].includes(meeting.status)) return 'Start the meeting before continuing.';
      return null;
    case 'fines':
      if (!meeting.attendanceFinalizedAt) return 'Finalize attendance first.';
      if (!(roster?.members?.length ?? 0)) return 'No members on the roster.';
      if (meeting.status === 'SCHEDULED') return 'Start the meeting before fines.';
      return null;
    case 'collections':
      if (!meeting.attendanceFinalizedAt) return 'Finalize attendance first.';
      if (!['COLLECTIONS_OPEN', 'LOAN_WINDOW_OPEN', 'RESOLUTIONS_OPEN', 'CLOSING_REVIEW', 'ONGOING'].includes(meeting.status)
        && ['SCHEDULED', 'NOTICE_SENT', 'ATTENDANCE_RECORDING'].includes(meeting.status)) {
        return 'Complete attendance and open collections.';
      }
      return null;
    case 'repayments':
      if (['SCHEDULED', 'NOTICE_SENT', 'ATTENDANCE_RECORDING'].includes(meeting.status)) return 'Complete earlier ceremony steps first.';
      return null;
    case 'summary':
      if (['SCHEDULED', 'NOTICE_SENT'].includes(meeting.status)) return 'Start the meeting before summary.';
      return null;
    case 'loans':
      if (hasOpenLoanWindow(meeting)) return 'Close the loan window before leaving the loans step.';
      return null;
    case 'close':
      if (hasOpenLoanWindow(meeting)) return 'Close the loan window before closing the meeting.';
      return null;
    default:
      return 'This step cannot be advanced yet.';
  }
}

export function canAdvanceStep(
  step: MeetingStep,
  meeting?: MeetingRecord | null,
  roster?: MeetingRoster | null,
  pool?: LoanPool | null,
): boolean {
  return advanceBlockReason(step, meeting, roster, pool) === null;
}

export function canGoToStep(
  target: MeetingStep,
  meeting?: MeetingRecord | null,
  roster?: MeetingRoster | null,
  pool?: LoanPool | null,
): boolean {
  if (!meeting || meeting.status === 'CLOSED') return target === 'close';
  if (target === 'attendance') return true;
  if (target === 'fines') return canAdvanceStep('attendance', meeting, roster, pool);
  if (target === 'collections') return canAdvanceStep('attendance', meeting, roster, pool) && canAdvanceStep('fines', meeting, roster, pool);
  if (target === 'repayments') return canGoToStep('collections', meeting, roster, pool) && canAdvanceStep('collections', meeting, roster, pool);
  if (target === 'summary') return canGoToStep('repayments', meeting, roster, pool) && canAdvanceStep('repayments', meeting, roster, pool);
  if (target === 'loans') return canGoToStep('summary', meeting, roster, pool) && canAdvanceStep('summary', meeting, roster, pool);
  if (target === 'close') return canGoToStep('loans', meeting, roster, pool) && canLeaveLoansStep(meeting);
  return false;
}

export function collectionTotalsFromMeeting(meeting?: MeetingRecord | null) {
  const items = meeting?.collectionItems
    ?? meeting?.collectionSessions?.flatMap((session) => (session.items as Array<{ collectionType: string; amount: number; status: string }>) ?? [])
    ?? [];
  return items
    .filter((item) => item.status === 'POSTED')
    .reduce<Record<string, number>>((acc, item) => {
      acc[item.collectionType] = (acc[item.collectionType] ?? 0) + Number(item.amount);
      return acc;
    }, {});
}

function localDateIso(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayIso() {
  return localDateIso(new Date());
}

export function weekStartIso(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return localDateIso(d);
}

export function addWeeksIso(isoDate: string, weeks: number) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + weeks * 7);
  return localDateIso(d);
}

export function monthStartIso(date: Date) {
  return localDateIso(new Date(date.getFullYear(), date.getMonth(), 1));
}
