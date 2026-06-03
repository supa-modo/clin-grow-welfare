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

export function canAdvanceStep(
  step: MeetingStep,
  meeting?: MeetingRecord | null,
  roster?: MeetingRoster | null,
  pool?: LoanPool | null,
): boolean {
  if (!meeting || meeting.status === 'CLOSED') return false;
  switch (step) {
    case 'attendance':
      return !['SCHEDULED', 'NOTICE_SENT'].includes(meeting.status);
    case 'fines':
      return (roster?.members?.length ?? 0) > 0 && meeting.status !== 'SCHEDULED';
    case 'collections':
      return meeting.status === 'COLLECTIONS_OPEN' || !['SCHEDULED', 'NOTICE_SENT', 'ATTENDANCE_RECORDING'].includes(meeting.status);
    case 'repayments':
      return !['SCHEDULED', 'NOTICE_SENT', 'ATTENDANCE_RECORDING'].includes(meeting.status);
    case 'summary':
      return !['SCHEDULED', 'NOTICE_SENT'].includes(meeting.status);
    case 'loans':
      return (pool?.totalLoanablePool ?? 0) > 0 && (meeting.loanWindows?.length ?? 0) > 0 && !hasOpenLoanWindow(meeting);
    case 'close':
      return true;
    default:
      return false;
  }
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
  if (target === 'close') return canGoToStep('loans', meeting, roster, pool) && canAdvanceStep('loans', meeting, roster, pool);
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

export function weekStartIso(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function addWeeksIso(isoDate: string, weeks: number) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

export function monthStartIso(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}
