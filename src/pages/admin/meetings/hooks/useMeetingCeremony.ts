import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMeetingRealtime } from '@/hooks/useMeetingRealtime';
import { api } from '@/services/api';
import { loanApi } from '@/services/loanApi';
import { useUiStore } from '@/store/uiStore';
import { getApiError } from '@/pages/admin/shared/adminFormatters';
import { mapDisburseError } from '@/components/loans/LoanDisbursementPanel';
import { useLoad } from '@/pages/admin/shared/adminUi';
import type { LoanPool, MeetingRecord, MeetingRoster, MeetingStep } from '../types';
import { clampCeremonyStep, collectionTotalsFromMeeting, resolveAttendanceStatus } from '../utils';

const CEREMONY_STORAGE_KEY = 'clingrow.ceremony.v1';
const meetingSteps: MeetingStep[] = ['attendance', 'fines', 'collections', 'repayments', 'summary', 'loans', 'close'];

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
  const { data, loading, error, reload } = useLoad(async () => {
    const res = await api.get('/meetings', { params: { page: 1, pageSize: 20 } });
    return (res.data.data ?? []) as MeetingRecord[];
  }, []);

  const [busy, setBusy] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [step, setStep] = useState<MeetingStep>('attendance');
  const [selectedId, setSelectedId] = useState('');
  const [roster, setRoster] = useState<MeetingRoster | null>(null);
  const [pool, setPool] = useState<LoanPool | null>(null);
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
    if (selectedMeeting?.status === 'CLOSED') return;
    await api.patch(`/meetings/${meetingId}/ceremony-step`, { step: next });
  }, [selectedMeeting?.status]);

  const setCeremonyStepWithSync = useCallback((next: MeetingStep) => {
    setStep(next);
    if (selectedMeeting?.id) {
      void syncCeremonyStepToServer(selectedMeeting.id, next).catch(() => undefined);
    }
  }, [selectedMeeting?.id, syncCeremonyStepToServer]);

  const loadPool = useCallback(async (meetingId: string) => {
    try {
      const poolRes = await api.get(`/meetings/${meetingId}/loan-window/pool`);
      setPool(poolRes.data.pool ?? null);
    } catch {
      setPool(null);
    }
  }, []);

  const loadRoster = useCallback(async (meetingId = selectedMeeting?.id) => {
    if (!meetingId) return;
    const rosterRes = await api.get(`/meetings/${meetingId}/roster`);
    setRoster(rosterRes.data as MeetingRoster);
    await loadPool(meetingId);
  }, [loadPool, selectedMeeting?.id]);

  useEffect(() => {
    if (selectedMeeting?.id) void loadRoster(selectedMeeting.id).catch(() => setRoster(null));
  }, [selectedMeeting?.id, loadRoster]);

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

  useEffect(() => {
    if (step === 'collections' && selectedMeeting?.id) void loadCollectionsReadiness(selectedMeeting.id);
  }, [step, selectedMeeting?.id, loadCollectionsReadiness, roster, collectionsOverride]);

  const refreshPool = useCallback(() => {
    if (selectedMeeting?.id) void loadPool(selectedMeeting.id);
  }, [loadPool, selectedMeeting?.id]);

  const refreshRoster = useCallback(() => {
    if (selectedMeeting?.id) void loadRoster(selectedMeeting.id);
  }, [loadRoster, selectedMeeting?.id]);

  const { connected: realtimeConnected } = useMeetingRealtime(selectedMeeting?.id, {
    onPool: refreshPool,
    onRoster: refreshRoster,
    onMeeting: () => void reload(),
    onLoan: () => {
      refreshPool();
      void reload();
    },
  });

  useEffect(() => {
    if (!selectedMeeting?.id || selectedMeeting.status === 'CLOSED') return;
    if (step !== 'collections' && step !== 'repayments') return;
    if (selectedMeeting.status === 'COLLECTIONS_OPEN') return;
    if (step === 'repayments' && !selectedMeeting.collectionsFinalizedAt) return;
    void api.post(`/meetings/${selectedMeeting.id}/collections/open`).then(() => reload()).catch(() => undefined);
  }, [step, selectedMeeting?.collectionsFinalizedAt, selectedMeeting?.id, selectedMeeting?.status]);

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
      await reload();
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
      await api.post(`/meetings/${meetingId}/${endpoint}`, body ?? {});
      await reload();
      await loadRoster(meetingId);
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

  const closeLoanWindow = (loanWindowId: string) => {
    confirmAction({
      key: 'close-loan-window',
      title: 'Close loan window?',
      message: 'No new loan reservations or applications can be made in this meeting after closing.',
      confirmText: 'Close window',
      run: async () => {
        setBusy('close-loan-window');
        try {
          await api.post(`/meetings/loan-window/${loanWindowId}/close`);
          await reload();
          await loadRoster();
          toastSuccess('Loan window closed', 'No new meeting loan applications can be reserved.');
        } catch (err) {
          toastError('Could not close loan window', getApiError(err));
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
    setBusy(`attendance-${memberId}`);
    try {
      await api.post(`/meetings/${meetingId}/attendance`, { memberId, attendanceStatus });
      setSavedAttendanceIds((s) => ({ ...s, [memberId]: true }));
      await reload();
      await loadRoster(meetingId);
      toastSuccess('Attendance saved', 'Member attendance was recorded.');
    } catch (err) {
      toastError('Attendance failed', getApiError(err));
    } finally {
      setBusy('');
    }
  };

  const saveAllAttendance = async (meetingId: string) => {
    if (!roster?.members.length) return;
    setBusy('attendance-bulk');
    try {
      for (const row of roster.members) {
        const attendanceStatus = resolveAttendanceStatus(row, attendanceDraft[row.member.id]);
        await api.post(`/meetings/${meetingId}/attendance`, { memberId: row.member.id, attendanceStatus });
        setSavedAttendanceIds((s) => ({ ...s, [row.member.id]: true }));
      }
      await reload();
      await loadRoster(meetingId);
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
          await api.post(`/meetings/${meetingId}/attendance/finalize`);
          setShowAttendanceFinalize(false);
          await reload();
          await loadRoster(meetingId);
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
          await api.post(`/meetings/${meetingId}/collections/finalize`, {
            override: collectionsOverride,
          });
          await reload();
          await loadRoster(meetingId);
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
      await reload();
      await loadCollectionsReadiness(meetingId);
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
      message: 'This fine will be deferred and carried forward to the next meeting.',
      confirmText: 'Defer fine',
      run: async () => {
        setBusy(`fine-defer-${fineId}`);
        try {
          await api.post(`/meetings/fines/${fineId}/defer`);
          await loadRoster();
          toastSuccess('Fine deferred', 'This fine will carry forward to the next meeting.');
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
      await api.post(`/meetings/apologies/${apologyId}/review`, { decision });
      await reload();
      await loadRoster();
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
    setBusy(`collect-${meeting.id}`);
    try {
      const session = meeting.collectionSessions?.find((row) => row.status === 'OPEN')
        ?? (await api.post(`/meetings/${meeting.id}/collections/open`)).data.session;
      await api.post(`/meetings/${meeting.id}/collections/${session.id}/items`, {
        memberId,
        collectionType: input.type,
        amount: Number(input.amount || 0),
        paymentMethod: input.paymentMethod ?? 'CASH',
        paymentReference: input.reference || `MTG-${meeting.meetingNumber}-${Date.now()}`,
        loanId: input.loanId ?? defaults?.loanId,
        fineId: input.fineId ?? defaults?.fineId,
        periodDate: input.periodDate ? new Date(input.periodDate).toISOString() : undefined,
      });
      await reload();
      await loadRoster(meeting.id);
      toastSuccess('Collection posted', `${input.type.replace(/_/g, ' ')} receipt was recorded.`);
    } catch (err) {
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
      await api.patch(`/meetings/loan-reservations/${reservation.id}`, { amount });
      await reload();
      await loadRoster();
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
          await api.post(`/meetings/loan-reservations/${reservation.id}/release`, { reason: 'Released during meeting loan review' });
          await reload();
          await loadRoster();
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
          await api.post(`/meetings/loan-window/${activeLoanWindow!.id}/official-reservations`, {
            memberId: reserveForm.memberId,
            requestedAmount: amount,
            purpose: reserveForm.purpose || undefined,
          });
          setShowReserveModal(false);
          setReserveForm({ memberId: '', amount: '', purpose: '' });
          await reload();
          await loadRoster();
          toastSuccess('Loan reserved', 'Official reservation recorded in the meeting pool.');
        } catch (err) {
          toastError('Reservation failed', getApiError(err));
        } finally {
          setBusy('');
        }
      },
    });
  };

  const runLoanAction = async (loan: { id: string; loanNumber?: string }, label: string, runner: () => Promise<unknown>) => {
    setBusy(`loan-${label}-${loan.id}`);
    try {
      await runner();
      await reload();
      await loadRoster();
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

  const saveMinutes = async (meeting: MeetingRecord) => {
    const minutes = (minutesDraft[meeting.id] ?? meeting.minutes ?? '').trim();
    if (minutes.length < 5) {
      toastError('Minutes required', 'Enter meeting minutes before saving.');
      return;
    }
    setBusy(`minutes-${meeting.id}`);
    try {
      await api.post(`/meetings/${meeting.id}/minutes`, { minutes });
      await reload();
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
      await reload();
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
          await reload();
          toastSuccess('Minutes published', 'Meeting minutes are now published to members.');
        } catch (err) {
          toastError('Publish failed', getApiError(err));
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
          await reload();
          toastSuccess('Meeting deleted', `${meeting.meetingNumber} was removed.`);
        } catch (err) {
          toastError('Meeting delete blocked', getApiError(err));
        } finally {
          setBusy('');
        }
      },
    });
  };

  return {
    data,
    loading,
    error,
    reload,
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
    selectedMeeting,
    activeLoanWindow,
    collectionTotals,
    create,
    action,
    openLoanWindow,
    sendNotice,
    generateFines,
    closeLoanWindow,
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
    reviewApology,
    notifyFine,
    collect,
    updateReservation,
    releaseReservation,
    officialReserve,
    runLoanAction,
    saveMinutes,
    publishMinutes,
    closeMeeting,
    deleteMeeting,
    uploadMinutesDocument,
    loadPool,
    loadRoster,
    pendingAction,
    confirmAction,
    clearPendingAction,
    runPendingAction,
  };
}
