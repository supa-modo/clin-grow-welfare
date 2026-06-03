import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import { loanApi } from '@/services/loanApi';
import { useUiStore } from '@/store/uiStore';
import { getApiError } from '@/pages/admin/shared/adminFormatters';
import { useLoad } from '@/pages/admin/shared/adminUi';
import type { LoanPool, MeetingRecord, MeetingRoster, MeetingStep } from '../types';
import { collectionTotalsFromMeeting } from '../utils';

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
  });
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, string>>({});
  const [collectionDraft, setCollectionDraft] = useState<Record<string, { type: string; amount: string; reference: string; loanId?: string; fineId?: string; periodDate?: string }>>({});
  const [reservationDraft, setReservationDraft] = useState<Record<string, string>>({});
  const [minutesDraft, setMinutesDraft] = useState<Record<string, string>>({});

  const selectedMeeting = useMemo(
    () => data?.find((meeting) => meeting.id === selectedId) ?? data?.[0],
    [data, selectedId],
  );
  const activeLoanWindow = selectedMeeting?.loanWindows?.find((w) => w.status === 'OPEN') ?? selectedMeeting?.loanWindows?.[0];
  const collectionTotals = useMemo(() => collectionTotalsFromMeeting(selectedMeeting), [selectedMeeting]);

  useEffect(() => {
    if (!selectedId && data?.[0]?.id) setSelectedId(data[0].id);
  }, [data, selectedId]);

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

  useEffect(() => {
    if (step !== 'loans' || activeLoanWindow?.status !== 'OPEN' || !selectedMeeting?.id) return undefined;
    const timer = window.setInterval(() => void loadPool(selectedMeeting.id), 15_000);
    return () => window.clearInterval(timer);
  }, [step, activeLoanWindow?.status, selectedMeeting?.id, loadPool]);

  useEffect(() => {
    if (step !== 'collections' || !selectedMeeting?.id || selectedMeeting.status === 'CLOSED') return;
    if (selectedMeeting.status === 'COLLECTIONS_OPEN') return;
    void api.post(`/meetings/${selectedMeeting.id}/collections/open`).then(() => reload()).catch(() => undefined);
  }, [step, selectedMeeting?.id, selectedMeeting?.status]);

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
      });
      setShowSchedule(false);
      await reload();
      toastSuccess('Meeting scheduled', 'Members have been notified by email and in-app notification.');
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
  const generateFines = (meetingId: string) => action(meetingId, 'fines/generate');
  const closeLoanWindow = async (loanWindowId: string) => {
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
  };

  const markAttendance = async (meetingId: string, memberId: string) => {
    const attendanceStatus = attendanceDraft[memberId] || 'PRESENT_ON_TIME';
    await action(meetingId, 'attendance', { memberId, attendanceStatus });
  };

  const saveAllAttendance = async (meetingId: string) => {
    if (!roster?.members.length) return;
    setBusy('attendance-bulk');
    try {
      for (const row of roster.members) {
        const attendanceStatus = attendanceDraft[row.member.id] ?? row.attendance?.attendanceStatus ?? 'PRESENT_ON_TIME';
        await api.post(`/meetings/${meetingId}/attendance`, { memberId: row.member.id, attendanceStatus });
      }
      await reload();
      await loadRoster(meetingId);
      toastSuccess('Attendance saved', 'All member attendance rows were recorded.');
    } catch (err) {
      toastError('Bulk attendance failed', getApiError(err));
    } finally {
      setBusy('');
    }
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

  const collect = async (
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
        paymentMethod: 'MPESA',
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

  const releaseReservation = async (reservation: { id: string }) => {
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
  };

  const officialReserve = async () => {
    if (!activeLoanWindow?.id) {
      toastError('Loan window closed', 'Open the loan window before reserving.');
      return;
    }
    const amount = Number(reserveForm.amount);
    if (!reserveForm.memberId || !amount || amount <= 0) {
      toastError('Reservation incomplete', 'Select a member and enter a valid amount.');
      return;
    }
    setBusy('official-reserve');
    try {
      await api.post(`/meetings/loan-window/${activeLoanWindow.id}/official-reservations`, {
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
  };

  const runLoanAction = async (loan: { id: string; loanNumber?: string }, label: string, runner: () => Promise<unknown>) => {
    setBusy(`loan-${label}-${loan.id}`);
    try {
      await runner();
      await reload();
      await loadRoster();
      toastSuccess('Loan updated', `${loan.loanNumber ?? 'Loan'} moved through ${label}.`);
    } catch (err) {
      const message = getApiError(err);
      if (label === 'disbursement') {
        toastError('Disbursement failed', `${message}. Check payment-ready vouchers under Loans if a voucher was created.`);
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

  const publishMinutes = async (meetingId: string) => {
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
    reviewApology,
    notifyFine,
    collect,
    updateReservation,
    releaseReservation,
    officialReserve,
    runLoanAction,
    saveMinutes,
    publishMinutes,
    loadRoster,
  };
}
