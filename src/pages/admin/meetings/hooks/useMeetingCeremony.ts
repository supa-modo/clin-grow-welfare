import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/services/api';
import { loanApi } from '@/services/loanApi';
import { useUiStore } from '@/store/uiStore';
import { getApiError } from '@/pages/admin/shared/adminFormatters';
import { mapDisburseError } from '@/components/loans/LoanDisbursementPanel';
import { useLoad } from '@/pages/admin/shared/adminUi';
import type { LoanPool, MeetingRecord, MeetingRoster, MeetingStep, LoanReservation, RolloverCandidate } from '../types';
import { clampCeremonyStep, collectionTotalsFromMeeting, periodDateToIso, resolveAttendanceStatus } from '../utils';

const CEREMONY_STORAGE_KEY = 'clingrow.ceremony.v1';
const meetingSteps: MeetingStep[] = ['attendance', 'fines', 'collections', 'repayments', 'summary', 'loans', 'close'];

const ADMIN_REOPEN_TARGET_STEP: Record<
  'ATTENDANCE_RECORDING' | 'COLLECTIONS_OPEN' | 'LOAN_WINDOW_OPEN' | 'CLOSING_REVIEW',
  MeetingStep
> = {
  ATTENDANCE_RECORDING: 'attendance',
  COLLECTIONS_OPEN: 'collections',
  LOAN_WINDOW_OPEN: 'loans',
  CLOSING_REVIEW: 'close',
};

export type MemberCollectionExpectations = {
  memberId: string;
  paidThisWeek: number;
  welfarePaidThisMonth: number;
  welfareDueThisMonth: number;
  sharePaidToDate: number;
  weeklyPaymentsByWeek?: Record<string, number>;
};

export type PendingCeremonyAction = {
  key: string;
  title: string;
  message: string;
  type?: 'confirm' | 'delete';
  confirmText?: string;
  run: () => Promise<void>;
};

function readStoredStep(meetingId: string): MeetingStep | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CEREMONY_STORAGE_KEY) ?? '{}');
    return parsed.meetingId === meetingId && meetingSteps.includes(parsed.step) ? parsed.step : null;
  } catch {
    return null;
  }
}

export function useMeetingCeremony() {
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const { data, loading, error, reload, patchData } = useLoad(async () => {
    const res = await api.get('/meetings', { params: { page: 1, pageSize: 20, view: 'summary' } });
    return (res.data.data ?? []) as MeetingRecord[];
  }, []);

  const [busy, setBusy] = useState('');
  const [workspaceSyncing, setWorkspaceSyncing] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [step, setStep] = useState<MeetingStep>('attendance');
  const [selectedId, setSelectedId] = useState('');
  const [roster, setRoster] = useState<MeetingRoster | null>(null);
  const [pool, setPool] = useState<LoanPool | null>(null);
  const [rolloverCandidates, setRolloverCandidates] = useState<RolloverCandidate[]>([]);
  const [unclaimedCarryover, setUnclaimedCarryover] = useState(0);
  const [meetingReport, setMeetingReport] = useState<Record<string, unknown> | null>(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveForm, setReserveForm] = useState({ memberId: '', amount: '', purpose: '' });
  const [scheduleForm, setScheduleForm] = useState({
    meetingType: 'ORDINARY',
    meetingDate: '',
    venue: 'CREATES Meeting Room',
    agenda: 'Attendance, collections, loan window, welfare claims, resolutions',
    notifyMembersByEmail: true,
  });
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, string>>({});
  const [collectionDraft, setCollectionDraft] = useState<Record<string, { type: string; amount: string; reference: string; paymentMethod?: string; loanId?: string; fineId?: string; periodDate?: string }>>({});
  const [reservationDraft, setReservationDraft] = useState<Record<string, string>>({});
  const [minutesDraft, setMinutesDraft] = useState<Record<string, string>>({});
  const [mattersArisingDraft, setMattersArisingDraft] = useState<Record<string, string>>({});
  const [aobDraft, setAobDraft] = useState<Record<string, string>>({});
  const [showAttendanceFinalize, setShowAttendanceFinalize] = useState(false);
  const [savedAttendanceIds, setSavedAttendanceIds] = useState<Record<string, boolean>>({});
  const [collectionsReadiness, setCollectionsReadiness] = useState<{
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
  } | null>(null);
  const [collectionsOverride, setCollectionsOverride] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingCeremonyAction | null>(null);
  const readinessDebounceRef = useRef<number | null>(null);

  const mergeMeetingIntoList = useCallback((meeting: MeetingRecord) => {
    patchData((prev) => {
      if (!prev?.length) return [meeting];
      const idx = prev.findIndex((row) => row.id === meeting.id);
      if (idx === -1) return [meeting, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], ...meeting };
      return next;
    });
  }, [patchData]);

  const refreshSelectedMeeting = useCallback(async (meetingId: string, view: 'ceremony' | 'full' = 'ceremony') => {
    const res = await api.get(`/meetings/${meetingId}`, { params: { view } });
    const meeting = res.data.meeting as MeetingRecord;
    mergeMeetingIntoList(meeting);
    return meeting;
  }, [mergeMeetingIntoList]);

  const confirmAction = useCallback((action: PendingCeremonyAction) => {
    setPendingAction(action);
  }, []);

  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  const runPendingAction = useCallback(async () => {
    const action = pendingAction;
    if (!action) return;
    setPendingAction(null);
    await action.run();
  }, [pendingAction]);

  const selectedMeeting = useMemo(
    () => data?.find((meeting) => meeting.id === selectedId) ?? data?.[0],
    [data, selectedId],
  );
  const activeLoanWindow = selectedMeeting?.loanWindows?.find((w) => w.status === 'OPEN') ?? selectedMeeting?.loanWindows?.[0];
  const collectionTotals = useMemo(() => collectionTotalsFromMeeting(selectedMeeting), [selectedMeeting]);

  useEffect(() => {
    if (!selectedId && data?.[0]?.id) setSelectedId(data[0].id);
  }, [data, selectedId]);

  useEffect(() => {
    if (!selectedMeeting?.id) return;
    const serverStep = meetingSteps.includes(selectedMeeting.ceremonyStep as MeetingStep)
      ? selectedMeeting.ceremonyStep as MeetingStep
      : null;
    const storedStep = readStoredStep(selectedMeeting.id);
    setStep(clampCeremonyStep(storedStep, serverStep));
  }, [selectedMeeting?.ceremonyStep, selectedMeeting?.id]);

  useEffect(() => {
    if (!selectedMeeting?.id) return;
    window.localStorage.setItem(CEREMONY_STORAGE_KEY, JSON.stringify({ meetingId: selectedMeeting.id, step }));
    const container = document.querySelector<HTMLElement>('[data-meeting-step-scroll]');
    container?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [selectedMeeting?.id, step]);

  const syncCeremonyStepToServer = useCallback(async (meetingId: string, next: MeetingStep) => {
    if (selectedMeeting?.status === 'CLOSED' && !selectedMeeting?.correctionModeAt) return;
    await api.patch(`/meetings/${meetingId}/ceremony-step`, { step: next });
  }, [selectedMeeting?.status, selectedMeeting?.correctionModeAt]);

  const setCeremonyStepWithSync = useCallback((next: MeetingStep) => {
    setStep(next);
    if (selectedMeeting?.id) {
      void syncCeremonyStepToServer(selectedMeeting.id, next).catch(() => undefined);
    }
  }, [selectedMeeting?.id, syncCeremonyStepToServer]);

  const loadPool = useCallback(async (meetingId: string) => {
    try {
      const [poolRes, carryRes] = await Promise.all([
        api.get(`/meetings/${meetingId}/loan-window/pool`),
        api.get(`/meetings/${meetingId}/unclaimed-carryover`).catch(() => ({ data: { amount: 0 } })),
      ]);
      setPool(poolRes.data.pool ?? null);
      setUnclaimedCarryover(Number(carryRes.data.amount ?? 0));
    } catch {
      setPool(null);
      setUnclaimedCarryover(0);
    }
  }, []);

  const loadRolloverCandidates = useCallback(async (meetingId: string) => {
    try {
      const res = await api.get(`/meetings/${meetingId}/rollover-candidates`);
      setRolloverCandidates(res.data.candidates ?? []);
    } catch {
      setRolloverCandidates([]);
    }
  }, []);

  const loadRoster = useCallback(async (meetingId = selectedMeeting?.id) => {
    if (!meetingId) return;
    const rosterRes = await api.get(`/meetings/${meetingId}/roster`);
    setRoster(rosterRes.data as MeetingRoster);
    await loadPool(meetingId);
  }, [loadPool, selectedMeeting?.id]);

  useEffect(() => {
    if (!selectedId) return;
    void refreshSelectedMeeting(selectedId).catch(() => undefined);
    void loadRoster(selectedId).catch(() => setRoster(null));
  }, [selectedId, refreshSelectedMeeting, loadRoster]);

  const loadCollectionsReadiness = useCallback(async (meetingId = selectedMeeting?.id, overrideValue = collectionsOverride) => {
    if (!meetingId) return;
    try {
      const res = await api.get(`/meetings/${meetingId}/collections/readiness`, {
        params: { override: overrideValue ? 'true' : 'false' },
      });
      setCollectionsReadiness(res.data.readiness ?? null);
    } catch {
      setCollectionsReadiness(null);
    }
  }, [collectionsOverride, selectedMeeting?.id]);

  const syncAfterMutation = useCallback(async (
    meetingId: string,
    options?: {
      roster?: boolean;
      pool?: boolean;
      readiness?: boolean;
      list?: boolean;
      ceremony?: boolean;
      awaitSync?: boolean;
    },
  ) => {
    const run = async () => {
      const tasks: Promise<unknown>[] = [];
      if (options?.ceremony !== false) tasks.push(refreshSelectedMeeting(meetingId));
      if (options?.list) tasks.push(reload({ silent: true }));
      if (options?.roster) tasks.push(loadRoster(meetingId));
      else if (options?.pool) tasks.push(loadPool(meetingId));
      if (tasks.length) {
        setWorkspaceSyncing(true);
        try {
          await Promise.all(tasks);
        } finally {
          setWorkspaceSyncing(false);
        }
      }
      if (options?.readiness && step === 'collections') {
        if (readinessDebounceRef.current) window.clearTimeout(readinessDebounceRef.current);
        readinessDebounceRef.current = window.setTimeout(() => {
          void loadCollectionsReadiness(meetingId);
        }, 300);
      }
    };
    if (options?.awaitSync) await run();
    else void run();
  }, [refreshSelectedMeeting, reload, loadRoster, loadPool, step, loadCollectionsReadiness]);

  const patchAttendanceRow = useCallback((memberId: string, attendanceStatus: string) => {
    setRoster((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        members: prev.members.map((row) => (
          row.member.id === memberId
            ? { ...row, attendance: { attendanceStatus } }
            : row
        )),
      };
    });
  }, []);

  const patchAttendanceRows = useCallback((rows: Array<{ memberId: string; attendanceStatus: string }>) => {
    const byMember = new Map(rows.map((row) => [row.memberId, row.attendanceStatus]));
    setRoster((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        members: prev.members.map((row) => {
          const status = byMember.get(row.member.id);
          return status ? { ...row, attendance: { attendanceStatus: status } } : row;
        }),
      };
    });
  }, []);

  const mergeMeetingFromResponse = useCallback((meeting: MeetingRecord) => {
    mergeMeetingIntoList(meeting);
  }, [mergeMeetingIntoList]);

  const patchLoanWindow = useCallback((
    loanWindow: NonNullable<MeetingRecord['loanWindows']>[number],
    meetingId: string,
  ) => {
    patchData((prev) => {
      if (!prev?.length) return prev;
      return prev.map((meeting) => {
        if (meeting.id !== meetingId) return meeting;
        const windows = meeting.loanWindows ?? [];
        const idx = windows.findIndex((w) => w.id === loanWindow.id);
        const nextWindows = idx === -1
          ? [loanWindow, ...windows]
          : windows.map((w) => (w.id === loanWindow.id ? { ...w, ...loanWindow } : w));
        return { ...meeting, loanWindows: nextWindows };
      });
    });
  }, [patchData]);

  const patchFineInRoster = useCallback((
    fine: { id: string; memberId: string; fineType: string; amount: number; status: string },
    mode: 'add' | 'update',
  ) => {
    setRoster((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        members: prev.members.map((row) => {
          if (row.member.id !== fine.memberId) return row;
          const fineRow = {
            id: fine.id,
            fineType: fine.fineType,
            amount: Number(fine.amount),
            status: fine.status,
          };
          const nextRows = mode === 'add'
            ? [...row.expectations.fines.rows.filter((item) => item.id !== fine.id), fineRow]
            : row.expectations.fines.rows.map((item) => (item.id === fine.id ? { ...item, status: fine.status } : item));
          const pendingTotal = nextRows
            .filter((item) => item.status === 'PENDING')
            .reduce((sum, item) => sum + item.amount, 0);
          return {
            ...row,
            expectations: {
              ...row.expectations,
              fines: { pendingTotal, rows: nextRows },
            },
          };
        }),
      };
    });
  }, []);

  const patchApologyInRoster = useCallback((apology: { id: string; memberId: string; status: string; reason?: string }) => {
    setRoster((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        members: prev.members.map((row) => (
          row.member.id === apology.memberId
            ? { ...row, apology: { id: apology.id, status: apology.status, reason: apology.reason ?? row.apology?.reason ?? '' } }
            : row
        )),
      };
    });
  }, []);

  const patchLoanSnapshotInRoster = useCallback((
    memberId: string,
    loanId: string,
    snapshot: { outstandingPrincipal: number; totalOutstanding: number },
  ) => {
    setRoster((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        members: prev.members.map((row) => {
          if (row.member.id !== memberId) return row;
          const active = row.expectations.loans.active.map((loan) => (
            loan.id === loanId
              ? { ...loan, outstandingPrincipal: snapshot.outstandingPrincipal, totalOutstanding: snapshot.totalOutstanding }
              : loan
          ));
          const outstandingTotal = active.reduce((sum, loan) => sum + Number(loan.totalOutstanding ?? 0), 0);
          return {
            ...row,
            expectations: {
              ...row.expectations,
              loans: { active, outstandingTotal },
            },
          };
        }),
      };
    });
  }, []);

  const patchCollectionItemInMeeting = useCallback((
    meetingId: string,
    itemId: string,
    patch: Partial<{ status: string; amount: number }>,
  ) => {
    patchData((prev) => {
      if (!prev?.length) return prev;
      return prev.map((meeting) => {
        if (meeting.id !== meetingId) return meeting;
        const collectionItems = (meeting.collectionItems ?? []).map((item) => (
          item.id === itemId ? { ...item, ...patch } : item
        ));
        return { ...meeting, collectionItems };
      });
    });
  }, [patchData]);

  const mergeCollectionPostResult = useCallback((
    meeting: MeetingRecord,
    sessionId: string,
    posted: NonNullable<MeetingRecord['collectionItems']>[number],
    optimisticItemId?: string,
  ) => {
    mergeMeetingIntoList({
      ...meeting,
      collectionItems: [
        posted,
        ...(meeting.collectionItems ?? []).filter((item) => item.id !== optimisticItemId),
      ],
      collectionSessions: meeting.collectionSessions?.map((row) => (
        row.id === sessionId
          ? {
              ...row,
              items: [
                posted,
                ...(row.items ?? []).filter((item) => (item as { id?: string }).id !== optimisticItemId),
              ],
            }
          : row
      )),
    });
  }, [mergeMeetingIntoList]);

  const mergeReservationIntoMeeting = useCallback((
    meetingId: string,
    windowId: string,
    reservation: Partial<LoanReservation> & { id: string; memberId: string },
  ) => {
    patchData((prev) => {
      if (!prev?.length) return prev;
      return prev.map((meeting) => {
        if (meeting.id !== meetingId) return meeting;
        const loanWindows = (meeting.loanWindows ?? []).map((window) => {
          if (window.id !== windowId) return window;
          const reservations = [...(window.reservations ?? [])];
          const member = roster?.members.find((row) => row.member.id === reservation.memberId)?.member;
          const idx = reservations.findIndex((row) => row.id === reservation.id);
          const entry = {
            ...reservations[idx],
            ...reservation,
            member: member ?? reservations[idx]?.member,
            loan: reservation.loan ?? reservations[idx]?.loan,
          };
          if (idx === -1) reservations.unshift(entry);
          else reservations[idx] = entry;
          return { ...window, reservations };
        });
        return { ...meeting, loanWindows };
      });
    });
  }, [patchData, roster]);

  const appendResolution = useCallback((
    meetingId: string,
    resolution: NonNullable<MeetingRecord['resolutions']>[number],
  ) => {
    patchData((prev) => {
      if (!prev?.length) return prev;
      return prev.map((meeting) => (
        meeting.id === meetingId
          ? { ...meeting, resolutions: [resolution, ...(meeting.resolutions ?? [])] }
          : meeting
      ));
    });
  }, [patchData]);

  const applyMemberExpectations = useCallback((expectations: MemberCollectionExpectations) => {
    setRoster((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        members: prev.members.map((row) => {
          if (row.member.id !== expectations.memberId) return row;
          const maxWeekly = row.expectations.weeklySavings.max;
          const maxShare = row.expectations.shareCapital.max;
          return {
            ...row,
            expectations: {
              ...row.expectations,
              weeklySavings: {
                ...row.expectations.weeklySavings,
                paidThisWeek: expectations.paidThisWeek,
                remainingToMax: Math.max(0, maxWeekly - expectations.paidThisWeek),
                paymentsByWeek: expectations.weeklyPaymentsByWeek ?? row.expectations.weeklySavings.paymentsByWeek,
              },
              shareCapital: {
                ...row.expectations.shareCapital,
                paidToDate: expectations.sharePaidToDate,
                remaining: Math.max(0, maxShare - expectations.sharePaidToDate),
              },
              welfareKitty: {
                ...row.expectations.welfareKitty,
                paidThisMonth: expectations.welfarePaidThisMonth,
                dueThisMonth: expectations.welfareDueThisMonth,
                remainingThisMonth: expectations.welfareDueThisMonth,
              },
            },
          };
        }),
      };
    });
  }, []);

  useEffect(() => {
    if (step === 'collections' && selectedMeeting?.id) void loadCollectionsReadiness(selectedMeeting.id);
  }, [step, selectedMeeting?.id, loadCollectionsReadiness, collectionsOverride]);

  useEffect(() => {
    if (step === 'repayments' && selectedMeeting?.id) {
      void loadRolloverCandidates(selectedMeeting.id);
    }
  }, [step, selectedMeeting?.id, loadRolloverCandidates]);

  useEffect(() => {
    if (!selectedMeeting?.id || selectedMeeting.status === 'CLOSED') return;
    if (step !== 'collections' && step !== 'repayments') return;
    if (selectedMeeting.status === 'COLLECTIONS_OPEN') return;
    if (step === 'repayments' && !selectedMeeting.collectionsFinalizedAt) return;
    void api.post(`/meetings/${selectedMeeting.id}/collections/open`)
      .then(() => refreshSelectedMeeting(selectedMeeting.id))
      .catch(() => undefined);
  }, [step, selectedMeeting?.collectionsFinalizedAt, selectedMeeting?.id, selectedMeeting?.status, refreshSelectedMeeting]);

  useEffect(() => {
    if (step !== 'close' || !selectedMeeting?.id) return;
    void api.get(`/meetings/${selectedMeeting.id}/report`)
      .then((res) => setMeetingReport(res.data.report?.summary ?? null))
      .catch(() => setMeetingReport(selectedMeeting.report?.summary ?? null));
  }, [step, selectedMeeting?.id, selectedMeeting?.report?.summary]);

  const create = async () => {
    if (!scheduleForm.meetingDate) {
      toastError('Meeting date required', 'Choose the meeting date and time.');
      return;
    }
    setBusy('create');
    try {
      await api.post('/meetings', {
        meetingType: scheduleForm.meetingType,
        meetingDate: new Date(scheduleForm.meetingDate).toISOString(),
        venue: scheduleForm.venue,
        agenda: scheduleForm.agenda,
        notifyMembersByEmail: scheduleForm.notifyMembersByEmail,
      });
      setShowSchedule(false);
      await reload({ silent: true });
      toastSuccess(
        'Meeting scheduled',
        scheduleForm.notifyMembersByEmail
          ? 'Members have been notified in-app. Email delivery follows the current system settings.'
          : 'Members have been notified in the portal only.',
      );
    } catch (err) {
      toastError('Could not schedule meeting', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const action = async (meetingId: string, endpoint: string, body?: Record<string, unknown>) => {
    setBusy(endpoint);
    try {
      const res = await api.post(`/meetings/${meetingId}/${endpoint}`, body ?? {});
      if (res.data.meeting) mergeMeetingFromResponse(res.data.meeting as MeetingRecord);
      if (res.data.loanWindow) {
        patchLoanWindow(res.data.loanWindow, meetingId);
        if (endpoint === 'loan-window/open') void loadPool(meetingId);
      }
      if (res.data.fines) {
        const fines = res.data.fines as Array<{ id: string; memberId: string; fineType: string; amount: number; status: string }>;
        for (const fine of fines) patchFineInRoster(fine, 'add');
        mergeMeetingIntoList({
          ...(selectedMeeting ?? { id: meetingId } as MeetingRecord),
          finesGeneratedAt: new Date().toISOString(),
          ceremonyStep: 'fines',
        });
        await loadRoster(meetingId);
      }
      toastSuccess('Meeting updated', 'The workflow state has been refreshed.');
    } catch (err) {
      toastError('Meeting action failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const openLoanWindow = (meetingId: string) => action(meetingId, 'loan-window/open');
  const sendNotice = (meetingId: string) => action(meetingId, 'notices', { channel: 'EMAIL' });
  const generateFines = (meetingId: string) => {
    confirmAction({
      key: 'fines-generate',
      title: 'Generate attendance fines?',
      message: 'This creates fines for all members based on recorded attendance. You cannot undo generation for this meeting.',
      confirmText: 'Generate fines',
      run: () => action(meetingId, 'fines/generate'),
    });
  };

  const countInFlightLoans = (meeting?: MeetingRecord | null) => {
    const inFlightStatuses = new Set([
      'SUBMITTED',
      'PENDING_MEETING_APPROVAL',
      'UNDER_REVIEW',
      'AGREEMENT_PENDING',
      'READY_FOR_DISBURSEMENT',
    ]);
    return (meeting?.loanWindows ?? []).flatMap((window) => window.reservations ?? []).filter(
      (reservation) => reservation.status === 'RESERVED' && reservation.loan && inFlightStatuses.has(reservation.loan.status),
    ).length;
  };

  const executeCloseLoanWindow = async (
    loanWindowId: string,
    options?: { carryOverRemaining?: boolean },
  ) => {
    setBusy('close-loan-window');
    try {
      const res = await api.post(`/meetings/loan-window/${loanWindowId}/close`, {
        carryOverRemaining: Boolean(options?.carryOverRemaining),
      });
      if (res.data.loanWindow && selectedMeeting?.id) {
        patchLoanWindow(res.data.loanWindow, selectedMeeting.id);
      }
      toastSuccess(
        'Loan window closed',
        options?.carryOverRemaining
          ? 'Remaining pool will be added to the next meeting loan window.'
          : 'No new meeting loan applications can be reserved.',
      );
    } catch (err) {
      toastError('Could not close loan window', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const closeLoanWindow = (
    loanWindowId: string,
    meeting?: MeetingRecord | null,
    options?: { carryOverRemaining?: boolean; skipConfirm?: boolean },
  ) => {
    if (options?.skipConfirm) {
      void executeCloseLoanWindow(loanWindowId, options);
      return;
    }
    const inFlight = countInFlightLoans(meeting);
    confirmAction({
      key: 'close-loan-window',
      type: 'delete',
      title: 'Close loan window?',
      message: inFlight > 0
        ? `${inFlight} loan application(s) are still in progress. Closing stops new reservations; existing applications can still be completed. Use admin override if you must force-close with blockers.`
        : 'No new loan reservations or applications can be made in this meeting after closing.',
      confirmText: 'Close window',
      run: () => executeCloseLoanWindow(loanWindowId, options),
    });
  };

  const reopenLoanWindow = (loanWindowId: string) => {
    confirmAction({
      key: `reopen-loan-window-${loanWindowId}`,
      title: 'Reopen loan window?',
      message: 'Members and officials can reserve new loans again in this meeting. Document the reason in the audit trail.',
      confirmText: 'Reopen window',
      run: async () => {
        setBusy('reopen-loan-window');
        try {
          const res = await api.post(`/meetings/loan-window/${loanWindowId}/reopen`, {
            reason: 'Official admin override to reopen loan window',
          });
          if (res.data.loanWindow && selectedMeeting?.id) {
            patchLoanWindow(res.data.loanWindow, selectedMeeting.id);
          }
          toastSuccess('Loan window reopened', 'New reservations are allowed again.');
        } catch (err) {
          toastError('Could not reopen loan window', getApiError(err));
        } finally {
          setBusy('');
        }
      },
    });
  };

  const adminReopenMeeting = (
    meetingId: string,
    input: {
      targetStatus: 'ATTENDANCE_RECORDING' | 'COLLECTIONS_OPEN' | 'LOAN_WINDOW_OPEN' | 'CLOSING_REVIEW';
      unfinalizeAttendance?: boolean;
      unfinalizeCollections?: boolean;
      reason: string;
    },
  ) => {
    confirmAction({
      key: `admin-reopen-${meetingId}`,
      type: 'delete',
      title: 'Reopen closed meeting?',
      message: 'This unlocks the meeting for corrections. The close report is kept for audit; re-close to regenerate the summary.',
      confirmText: 'Reopen meeting',
      run: async () => {
        setBusy('admin-reopen-meeting');
        try {
          const res = await api.post(`/meetings/${meetingId}/admin-reopen`, input);
          if (res.data.meeting) mergeMeetingFromResponse(res.data.meeting as MeetingRecord);
          const nextStep = ADMIN_REOPEN_TARGET_STEP[input.targetStatus] ?? 'attendance';
          setCeremonyStepWithSync(nextStep);
          toastSuccess('Meeting reopened', 'Correction mode is active. Changes post with the meeting date.');
        } catch (err) {
          toastError('Could not reopen meeting', getApiError(err));
        } finally {
          setBusy('');
        }
      },
    });
  };

  const markAttendance = async (meetingId: string, memberId: string) => {
    const rosterRow = roster?.members.find((row) => row.member.id === memberId);
    const attendanceStatus = rosterRow
      ? resolveAttendanceStatus(rosterRow, attendanceDraft[memberId])
      : attendanceDraft[memberId] || 'PRESENT_ON_TIME';
    const correctionOverride = Boolean(selectedMeeting?.correctionModeAt);
    setBusy(`attendance-${memberId}`);
    try {
      const res = await api.post(`/meetings/${meetingId}/attendance`, {
        memberId,
        attendanceStatus,
        ...(correctionOverride ? { override: true } : {}),
      });
      setSavedAttendanceIds((s) => ({ ...s, [memberId]: true }));
      patchAttendanceRow(memberId, res.data.attendance.attendanceStatus);
      toastSuccess('Attendance saved', 'Member attendance was recorded.');
    } catch (err) {
      toastError('Attendance failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const saveAllAttendance = async (meetingId: string) => {
    if (!roster?.members.length) return;
    const correctionOverride = Boolean(selectedMeeting?.correctionModeAt);
    setBusy('attendance-bulk');
    try {
      const rows = roster.members.map((row) => ({
        memberId: row.member.id,
        attendanceStatus: resolveAttendanceStatus(row, attendanceDraft[row.member.id]),
      }));
      const res = await api.post(`/meetings/${meetingId}/attendance/bulk`, {
        rows,
        ...(correctionOverride ? { override: true } : {}),
      });
      const attendanceRows = (res.data.attendance ?? []) as Array<{ memberId: string; attendanceStatus: string }>;
      patchAttendanceRows(attendanceRows);
      setSavedAttendanceIds((s) => {
        const next = { ...s };
        for (const row of attendanceRows) next[row.memberId] = true;
        return next;
      });
      setShowAttendanceFinalize(true);
    } catch (err) {
      toastError('Bulk attendance failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const finalizeAttendance = (meetingId: string) => {
    confirmAction({
      key: 'attendance-finalize',
      title: 'Finalize attendance?',
      message: 'Attendance will be locked. Fines and collections steps will unlock after finalization.',
      confirmText: 'Finalize',
      run: async () => {
        setBusy('attendance-finalize');
        try {
          const res = await api.post(`/meetings/${meetingId}/attendance/finalize`);
          setShowAttendanceFinalize(false);
          mergeMeetingFromResponse(res.data.meeting as MeetingRecord);
          toastSuccess('Attendance finalized', 'Attendance is locked. Continue to fines when ready.');
        } catch (err) {
          toastError('Finalize failed', getApiError(err));
        } finally {
          setBusy('');
        }
      },
    });
  };

  const finalizeCollections = (meetingId: string) => {
    confirmAction({
      key: 'collections-finalize',
      title: 'Finalize collections?',
      message: 'Contribution collections will be locked. Repayments and the loan window unlock after finalization.',
      confirmText: 'Finalize collections',
      run: async () => {
        setBusy('collections-finalize');
        try {
          const res = await api.post(`/meetings/${meetingId}/collections/finalize`, {
            override: collectionsOverride,
          });
          mergeMeetingFromResponse(res.data.meeting as MeetingRecord);
          setCeremonyStepWithSync('repayments');
          toastSuccess('Collections finalized', 'Continue with loan repayments on the next step.');
        } catch (err) {
          toastError('Finalize collections failed', getApiError(err));
        } finally {
          setBusy('');
        }
      },
    });
  };

  const reverseCollectionItem = async (meetingId: string, itemId: string, reason: string) => {
    setBusy(`reverse-item-${itemId}`);
    try {
      const res = await api.post(`/meetings/${meetingId}/collection-items/${itemId}/reverse`, { reason });
      if (res.data.item) patchCollectionItemInMeeting(meetingId, itemId, { status: 'REVERSED' });
      toastSuccess('Item reversed', 'The journal entry was reversed.');
    } catch (err) {
      toastError('Reverse failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const adjustCollectionItem = async (meetingId: string, itemId: string, amount: number, reason: string) => {
    setBusy(`adjust-item-${itemId}`);
    try {
      const res = await api.post(`/meetings/${meetingId}/collection-items/${itemId}/adjust`, { amount, reason });
      const result = res.data as {
        item?: NonNullable<MeetingRecord['collectionItems']>[number];
        pool?: LoanPool;
        memberExpectations?: MemberCollectionExpectations;
        loanSnapshot?: { loanId: string; outstandingPrincipal: number; totalOutstanding: number };
      };
      patchCollectionItemInMeeting(meetingId, itemId, { status: 'REVERSED' });
      if (result.item && selectedMeeting) {
        mergeMeetingIntoList({
          ...selectedMeeting,
          collectionItems: [result.item, ...(selectedMeeting.collectionItems ?? []).filter((row) => row.id !== itemId)],
        });
      }
      if (result.memberExpectations) applyMemberExpectations(result.memberExpectations);
      if (result.pool) setPool(result.pool);
      if (result.loanSnapshot && result.item?.memberId) {
        patchLoanSnapshotInRoster(result.item.memberId, result.loanSnapshot.loanId, result.loanSnapshot);
      }
      toastSuccess('Item adjusted', 'The corrected amount was reposted.');
    } catch (err) {
      toastError('Adjust failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const updateCollectionWaiver = async (
    meetingId: string,
    memberId: string,
    patch: { weeklyWaived?: boolean; welfareWaived?: boolean },
  ) => {
    setBusy('collection-waivers');
    try {
      const existing = (selectedMeeting?.collectionWaivers ?? {}) as Record<string, { weeklyWaived?: boolean; welfareWaived?: boolean }>;
      const waivers = {
        ...existing,
        [memberId]: { ...existing[memberId], ...patch },
      };
      await api.patch(`/meetings/${meetingId}/collection-waivers`, { waivers });
      if (selectedMeeting) {
        mergeMeetingIntoList({ ...selectedMeeting, collectionWaivers: waivers });
      }
      void loadCollectionsReadiness(meetingId);
      toastSuccess('Waiver updated', 'Constitutional readiness has been recalculated.');
    } catch (err) {
      toastError('Waiver update failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const deferFine = (fineId: string) => {
    confirmAction({
      key: `fine-defer-${fineId}`,
      type: 'delete',
      title: 'Mark fine not paid?',
      message: 'This fine will remain deferred as the same record until it is paid or waived.',
      confirmText: 'Defer fine',
      run: async () => {
        setBusy(`fine-defer-${fineId}`);
        try {
          const res = await api.post(`/meetings/fines/${fineId}/defer`);
          if (res.data.fine) patchFineInRoster(res.data.fine, 'update');
          toastSuccess('Fine deferred', 'The same fine will remain deferred until it is resolved.');
        } catch (err) {
          toastError('Defer failed', getApiError(err));
        } finally {
          setBusy('');
        }
      },
    });
  };

  const reviewApology = async (apologyId: string, decision: 'ACCEPTED' | 'REJECTED') => {
    setBusy(`apology-${apologyId}-${decision}`);
    try {
      const res = await api.post(`/meetings/apologies/${apologyId}/review`, { decision });
      if (res.data.apology) patchApologyInRoster(res.data.apology);
      toastSuccess('Apology reviewed', `The apology was ${decision.toLowerCase()}.`);
    } catch (err) {
      toastError('Apology review failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const notifyFine = async (fineId: string) => {
    setBusy(`fine-notify-${fineId}`);
    try {
      await api.post(`/meetings/fines/${fineId}/notify`);
      toastSuccess('Fine reminder sent', 'The member has been notified by email and in-app notification.');
    } catch (err) {
      toastError('Fine notification failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const createManualFine = async (
    meetingId: string,
    input: { memberId: string; amount: number; reason: string; fineType?: string },
  ) => {
    setBusy('manual-fine');
    try {
      const res = await api.post(`/meetings/${meetingId}/fines`, input);
      if (res.data.fine) patchFineInRoster(res.data.fine, 'add');
      toastSuccess('Manual fine added', 'The fine is now on the meeting roster.');
    } catch (err) {
      toastError('Could not add fine', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const confirmLoanRollover = async (
    meetingId: string,
    loanId: string,
    input: { periodNumber: number },
  ) => {
    setBusy(`rollover-confirm-${loanId}`);
    try {
      await api.post(`/meetings/${meetingId}/loans/${loanId}/rollover/confirm`, input);
      await Promise.all([loadRolloverCandidates(meetingId), loadRoster(meetingId)]);
      toastSuccess('Rollover confirmed', 'Interest has been applied for this loan period.');
    } catch (err) {
      toastError('Could not confirm rollover', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const waiveLoanRollover = async (
    meetingId: string,
    loanId: string,
    input: { periodNumber: number; reason: string },
  ) => {
    setBusy(`rollover-waive-${loanId}`);
    try {
      await api.post(`/meetings/${meetingId}/loans/${loanId}/rollover/waive`, input);
      await Promise.all([loadRolloverCandidates(meetingId), loadRoster(meetingId)]);
      toastSuccess('Rollover waived', 'No rollover interest will apply for this period.');
    } catch (err) {
      toastError('Could not waive rollover', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const collectImpl = async (
    meeting: MeetingRecord,
    memberId: string,
    defaults?: Partial<{ type: string; amount: number; loanId: string; fineId: string; periodDate?: string }>,
  ) => {
    const type = defaults?.type ?? 'WEEKLY_SAVINGS';
    const input = collectionDraft[`${meeting.id}-${memberId}-${type}`] ?? {
      type,
      amount: String(defaults?.amount ?? 250),
      reference: '',
      loanId: defaults?.loanId,
      fineId: defaults?.fineId,
      periodDate: defaults?.periodDate,
    };
    const amount = Number(input.amount || defaults?.amount || 0);
    const optimisticItem = {
      id: `optimistic-${meeting.id}-${memberId}-${type}-${Date.now()}`,
      collectionType: type,
      amount,
      status: 'POSTED',
      memberId,
      postedAt: new Date().toISOString(),
    };
    const previousMeeting = meeting;
    const previousRoster = roster;
    mergeMeetingIntoList({
      ...meeting,
      collectionItems: [optimisticItem, ...(meeting.collectionItems ?? [])],
    });
    if (roster) {
      const row = roster.members.find((memberRow) => memberRow.member.id === memberId);
      if (row) {
        const base = {
          memberId,
          paidThisWeek: row.expectations.weeklySavings.paidThisWeek,
          welfarePaidThisMonth: row.expectations.welfareKitty.paidThisMonth,
          welfareDueThisMonth: row.expectations.welfareKitty.dueThisMonth,
          sharePaidToDate: row.expectations.shareCapital.paidToDate,
        };
        if (type === 'WEEKLY_SAVINGS') {
          applyMemberExpectations({ ...base, paidThisWeek: base.paidThisWeek + amount });
        } else if (type === 'SHARE_CAPITAL') {
          applyMemberExpectations({ ...base, sharePaidToDate: base.sharePaidToDate + amount });
        } else if (type === 'WELFARE_KITTY') {
          const paid = base.welfarePaidThisMonth + amount;
          applyMemberExpectations({
            ...base,
            welfarePaidThisMonth: paid,
            welfareDueThisMonth: Math.max(0, base.welfareDueThisMonth - amount),
          });
        }
      }
    }
    toastSuccess('Collection posted', `${type.replace(/_/g, ' ')} receipt was recorded.`);
    setBusy(`collect-${meeting.id}`);
    try {
      const session = meeting.collectionSessions?.find((row) => row.status === 'OPEN')
        ?? (await api.post(`/meetings/${meeting.id}/collections/open`)).data.session;
      const res = await api.post(`/meetings/${meeting.id}/collections/${session.id}/items`, {
        memberId,
        collectionType: input.type,
        amount,
        paymentMethod: input.paymentMethod ?? 'CASH',
        paymentReference: input.reference || `MTG-${meeting.meetingNumber}-${Date.now()}`,
        loanId: input.loanId ?? defaults?.loanId,
        fineId: input.fineId ?? defaults?.fineId,
        periodDate: (input.periodDate || defaults?.periodDate)
          ? periodDateToIso(input.periodDate || defaults!.periodDate!)
          : undefined,
      });
      const posted = res.data.item;
      const memberExpectations = res.data.memberExpectations as MemberCollectionExpectations | null | undefined;
      const loanSnapshot = res.data.loanSnapshot as { loanId: string; outstandingPrincipal: number; totalOutstanding: number } | null | undefined;
      if (posted) {
        mergeCollectionPostResult(meeting, session.id, posted, optimisticItem.id);
      }
      if (memberExpectations) applyMemberExpectations(memberExpectations);
      if (loanSnapshot) patchLoanSnapshotInRoster(memberId, loanSnapshot.loanId, loanSnapshot);
      if (res.data.pool) setPool(res.data.pool as LoanPool);
      if (type === 'FINE_PAYMENT' && (defaults?.fineId || input.fineId)) {
        const fineId = defaults?.fineId ?? input.fineId!;
        const fineRow = roster?.members.find((row) => row.member.id === memberId)?.expectations.fines.rows.find((fine) => fine.id === fineId);
        if (fineRow) {
          patchFineInRoster({
            id: fineId,
            memberId,
            fineType: fineRow.fineType,
            amount: fineRow.amount,
            status: 'PAID',
          }, 'update');
        }
      }
      if (type === 'LOAN_REPAYMENT') {
        await loadRolloverCandidates(meeting.id);
      }
      void loadCollectionsReadiness(meeting.id);
    } catch (err) {
      if (previousMeeting) mergeMeetingIntoList(previousMeeting);
      if (previousRoster) setRoster(previousRoster);
      toastError('Collection failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const collect = (
    meeting: MeetingRecord,
    memberId: string,
    defaults?: Partial<{ type: string; amount: number; loanId: string; fineId: string; periodDate?: string }>,
  ) => {
    const type = defaults?.type ?? 'WEEKLY_SAVINGS';
    const input = collectionDraft[`${meeting.id}-${memberId}-${type}`] ?? {
      type,
      amount: String(defaults?.amount ?? 250),
      reference: '',
      paymentMethod: 'CASH',
      loanId: defaults?.loanId,
      fineId: defaults?.fineId,
      periodDate: defaults?.periodDate,
    };
    const amount = Number(defaults?.amount ?? input.amount ?? 0);
    const memberName = roster?.members.find((r) => r.member.id === memberId)?.member.name ?? 'member';
    confirmAction({
      key: `collect-${meeting.id}-${memberId}-${type}`,
      title: 'Post collection?',
      message: `Record ${type.replace(/_/g, ' ')} of ${amount} for ${memberName} as cash?`,
      confirmText: 'Post receipt',
      run: () => collectImpl(meeting, memberId, defaults),
    });
  };

  const updateReservation = async (reservation: { id: string; amount: number }) => {
    const amount = Number(reservationDraft[reservation.id] ?? reservation.amount);
    if (!amount || amount <= 0) {
      toastError('Amount required', 'Enter a valid reservation amount.');
      return;
    }
    setBusy(`reservation-${reservation.id}`);
    try {
      const res = await api.patch(`/meetings/loan-reservations/${reservation.id}`, { amount });
      if (res.data.reservation && selectedMeeting?.id && activeLoanWindow?.id) {
        mergeReservationIntoMeeting(selectedMeeting.id, activeLoanWindow.id, res.data.reservation);
      }
      if (selectedMeeting?.id) void loadPool(selectedMeeting.id);
      toastSuccess('Reservation updated', 'The loan pool balance has been recalculated.');
    } catch (err) {
      toastError('Reservation update failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const releaseReservation = (reservation: { id: string }) => {
    confirmAction({
      key: `reservation-release-${reservation.id}`,
      type: 'delete',
      title: 'Release reservation?',
      message: 'Reserved funds return to the meeting loan pool and the member may re-apply.',
      confirmText: 'Release',
      run: async () => {
        setBusy(`reservation-release-${reservation.id}`);
        try {
          const res = await api.post(`/meetings/loan-reservations/${reservation.id}/release`, { reason: 'Released during meeting loan review' });
          if (res.data.reservation && selectedMeeting?.id && activeLoanWindow?.id) {
            mergeReservationIntoMeeting(selectedMeeting.id, activeLoanWindow.id, {
              ...res.data.reservation,
              status: 'RELEASED',
            });
          }
          if (selectedMeeting?.id) void loadPool(selectedMeeting.id);
          toastSuccess('Reservation released', 'The amount is available in the meeting loan pool again.');
        } catch (err) {
          toastError('Reservation release failed', getApiError(err));
        } finally {
          setBusy('');
        }
      },
    });
  };

  const officialReserve = () => {
    if (!activeLoanWindow?.id) {
      toastError('Loan window closed', 'Open the loan window before reserving.');
      return;
    }
    const amount = Number(reserveForm.amount);
    if (!reserveForm.memberId || !amount || amount <= 0) {
      toastError('Reservation incomplete', 'Select a member and enter a valid amount.');
      return;
    }
    const memberName = roster?.members.find((r) => r.member.id === reserveForm.memberId)?.member.name ?? 'member';
    confirmAction({
      key: 'official-reserve',
      title: 'Create official reservation?',
      message: `Reserve ${amount} from the pool for ${memberName}?`,
      confirmText: 'Reserve',
      run: async () => {
        setBusy('official-reserve');
        try {
          const res = await api.post(`/meetings/loan-window/${activeLoanWindow!.id}/official-reservations`, {
            memberId: reserveForm.memberId,
            requestedAmount: amount,
            purpose: reserveForm.purpose || undefined,
          });
          setShowReserveModal(false);
          setReserveForm({ memberId: '', amount: '', purpose: '' });
          if (res.data.reservation && selectedMeeting?.id) {
            mergeReservationIntoMeeting(selectedMeeting.id, activeLoanWindow!.id, {
              ...res.data.reservation,
              loan: res.data.loan,
            });
          }
          if (selectedMeeting?.id) void loadPool(selectedMeeting.id);
          toastSuccess('Loan reserved', 'Official reservation recorded in the meeting pool.');
        } catch (err) {
          toastError('Reservation failed', getApiError(err));
        } finally {
          setBusy('');
        }
      },
    });
  };

  const patchLoanOnReservation = useCallback((
    meetingId: string,
    windowId: string,
    loanId: string,
    loanPatch: Partial<NonNullable<LoanReservation['loan']>>,
  ) => {
    patchData((prev) => {
      if (!prev?.length) return prev;
      return prev.map((meeting) => {
        if (meeting.id !== meetingId) return meeting;
        const loanWindows = (meeting.loanWindows ?? []).map((window) => {
          if (window.id !== windowId) return window;
          const reservations = (window.reservations ?? []).map((row) => (
            row.loan?.id === loanId ? { ...row, loan: { ...row.loan!, ...loanPatch } } : row
          ));
          return { ...window, reservations };
        });
        return { ...meeting, loanWindows };
      });
    });
  }, [patchData]);

  const runLoanAction = async (loan: { id: string; loanNumber?: string; status?: string }, label: string, runner: () => Promise<unknown>) => {
    setBusy(`loan-${label}-${loan.id}`);
    try {
      const result = await runner();
      if (selectedMeeting?.id && activeLoanWindow?.id) {
        const updatedLoan = (result && typeof result === 'object' && 'loan' in result)
          ? (result as { loan?: { id: string; status?: string } }).loan
          : (result && typeof result === 'object' && 'id' in result && 'status' in result)
            ? result as { id: string; status?: string }
            : null;
        if (updatedLoan?.status) {
          patchLoanOnReservation(selectedMeeting.id, activeLoanWindow.id, loan.id, { status: updatedLoan.status });
        }
        void loadPool(selectedMeeting.id);
        void refreshSelectedMeeting(selectedMeeting.id);
      }
      toastSuccess('Loan updated', `${loan.loanNumber ?? 'Loan'} moved through ${label}.`);
    } catch (err) {
      const message = label === 'disbursement' ? mapDisburseError(err) : getApiError(err);
      if (label === 'disbursement') {
        toastError('Disbursement blocked', message);
      } else if (label === 'chair authorization') {
        toastError('Chair authorization required', message);
      } else {
        toastError('Loan action failed', message);
      }
    } finally {
      setBusy('');
    }
  };

  const saveMattersArising = async (meeting: MeetingRecord) => {
    const text = (mattersArisingDraft[meeting.id] ?? meeting.mattersArising ?? '').trim();
    setBusy('matters-arising');
    try {
      await api.post(`/meetings/${meeting.id}/matters-arising`, { text });
      mergeMeetingIntoList({ ...meeting, mattersArising: text });
      toastSuccess('Matters arising saved', 'The meeting record has been updated.');
    } catch (err) {
      toastError('Save failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const saveAob = async (meeting: MeetingRecord) => {
    const text = (aobDraft[meeting.id] ?? meeting.anyOtherBusiness ?? '').trim();
    setBusy('aob');
    try {
      await api.post(`/meetings/${meeting.id}/aob`, { text });
      mergeMeetingIntoList({ ...meeting, anyOtherBusiness: text });
      toastSuccess('AOB saved', 'Any other business has been recorded for this meeting.');
    } catch (err) {
      toastError('Save failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const saveMinutes = async (meeting: MeetingRecord) => {
    const minutes = (minutesDraft[meeting.id] ?? meeting.minutes ?? '').trim();
    if (minutes.length < 5) {
      toastError('Minutes required', 'Enter meeting minutes before saving.');
      return;
    }
    setBusy(`minutes-${meeting.id}`);
    try {
      await api.post(`/meetings/${meeting.id}/minutes`, { minutes });
      mergeMeetingIntoList({ ...meeting, minutes });
      toastSuccess('Minutes saved', 'The meeting record now includes the latest minutes.');
    } catch (err) {
      toastError('Minutes save failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const uploadMinutesDocument = async (meetingId: string, file: File) => {
    setBusy(`minutes-upload-${meetingId}`);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/meetings/${meetingId}/minutes/document`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      void syncAfterMutation(meetingId, { ceremony: true });
      toastSuccess('Minutes uploaded', `${file.name} is stored for this meeting.`);
    } catch (err) {
      toastError('Upload failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const publishMinutes = (meetingId: string) => {
    confirmAction({
      key: 'publish-minutes',
      title: 'Publish minutes to members?',
      message: 'Members will receive notification that meeting minutes are available.',
      confirmText: 'Publish',
      run: async () => {
        setBusy('publish');
        try {
          await api.post(`/meetings/${meetingId}/publish`);
          void syncAfterMutation(meetingId, { ceremony: true });
      toastSuccess('Minutes published', 'Meeting minutes are now published to members.');
        } catch (err) {
          toastError('Publish failed', getApiError(err));
        } finally {
          setBusy('');
        }
      },
    });
  };

  const sendSummaryToMembers = (meetingId: string) => {
    confirmAction({
      key: 'send-summary',
      title: 'Send meeting summary to all active members?',
      message: 'The official meeting summary PDF will be emailed to every active member with an email address on file.',
      confirmText: 'Send summary',
      run: async () => {
        setBusy('send-summary');
        try {
          const res = await api.post(`/meetings/${meetingId}/send-summary`);
          void syncAfterMutation(meetingId, { ceremony: true });
          const sent = Number(res.data.sentCount ?? 0);
          if (sent <= 0) {
            toastError('No emails sent', 'No members with a valid email address were found. Check portal user emails and try again.');
            return;
          }
          toastSuccess('Summary sent', `Meeting summary emailed to ${sent} member(s).`);
        } catch (err) {
          toastError('Send failed', getApiError(err));
        } finally {
          setBusy('');
        }
      },
    });
  };

  const closeMeeting = (meetingId: string) => {
    confirmAction({
      key: 'close-meeting',
      type: 'delete',
      title: 'Close this meeting?',
      message: 'Closing is permanent. Collections, fines, and loan window edits will be locked.',
      confirmText: 'Close meeting',
      run: () => action(meetingId, 'close'),
    });
  };

  const deleteMeeting = (meeting: MeetingRecord) => {
    confirmAction({
      key: `delete-meeting-${meeting.id}`,
      type: 'delete',
      title: 'Delete this meeting?',
      message: 'Only meetings without posted collections, loan records, resolutions, welfare claims, or close reports can be deleted.',
      confirmText: 'Delete meeting',
      run: async () => {
        setBusy(`delete-meeting-${meeting.id}`);
        try {
          await api.delete(`/meetings/${meeting.id}`);
          if (selectedId === meeting.id) setSelectedId('');
          setRoster(null);
          setPool(null);
          await reload({ silent: true });
          toastSuccess('Meeting deleted', `${meeting.meetingNumber} was removed.`);
        } catch (err) {
          toastError('Meeting delete blocked', getApiError(err));
        } finally {
          setBusy('');
        }
      },
    });
  };

  const refreshWorkspace = useCallback(async () => {
    setWorkspaceSyncing(true);
    try {
      await reload({ silent: true });
      if (selectedId) {
        const detailView = step === 'summary' || step === 'close' ? 'full' : 'ceremony';
        await Promise.all([
          refreshSelectedMeeting(selectedId, detailView),
          loadRoster(selectedId),
          step === 'collections' ? loadCollectionsReadiness(selectedId) : Promise.resolve(),
          step === 'close'
            ? api.get(`/meetings/${selectedId}/report`)
              .then((res) => setMeetingReport(res.data.report?.summary ?? null))
              .catch(() => undefined)
            : Promise.resolve(),
        ]);
      }
    } finally {
      setWorkspaceSyncing(false);
    }
  }, [reload, selectedId, refreshSelectedMeeting, loadRoster, step, loadCollectionsReadiness]);

  return {
    data,
    loading,
    error,
    reload,
    refreshWorkspace,
    workspaceSyncing,
    busy,
    showSchedule,
    setShowSchedule,
    step,
    setStep,
    setCeremonyStepWithSync,
    selectedId,
    setSelectedId,
    roster,
    pool,
    meetingReport,
    showReserveModal,
    setShowReserveModal,
    reserveForm,
    setReserveForm,
    scheduleForm,
    setScheduleForm,
    attendanceDraft,
    setAttendanceDraft,
    collectionDraft,
    setCollectionDraft,
    reservationDraft,
    setReservationDraft,
    minutesDraft,
    setMinutesDraft,
    mattersArisingDraft,
    setMattersArisingDraft,
    aobDraft,
    setAobDraft,
    selectedMeeting,
    activeLoanWindow,
    collectionTotals,
    create,
    action,
    openLoanWindow,
    sendNotice,
    generateFines,
    createManualFine,
    closeLoanWindow,
    reopenLoanWindow,
    adminReopenMeeting,
    markAttendance,
    saveAllAttendance,
    finalizeAttendance,
    showAttendanceFinalize,
    setShowAttendanceFinalize,
    savedAttendanceIds,
    deferFine,
    collectionsReadiness,
    collectionsOverride,
    setCollectionsOverride,
    loadCollectionsReadiness,
    finalizeCollections,
    updateCollectionWaiver,
    reverseCollectionItem,
    adjustCollectionItem,
    reviewApology,
    notifyFine,
    collect,
    updateReservation,
    releaseReservation,
    officialReserve,
    runLoanAction,
    saveMinutes,
    saveMattersArising,
    saveAob,
    publishMinutes,
    sendSummaryToMembers,
    closeMeeting,
    deleteMeeting,
    uploadMinutesDocument,
    loadPool,
    loadRoster,
    loadRolloverCandidates,
    rolloverCandidates,
    unclaimedCarryover,
    confirmLoanRollover,
    waiveLoanRollover,
    appendResolution,
    pendingAction,
    confirmAction,
    clearPendingAction,
    runPendingAction,
  };
}
