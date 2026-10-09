import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FiCalendar, FiEye, FiPlay, FiRefreshCw, FiTrash2, FiXCircle, FiCheckCircle } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { RowActionsMenu, type RowActionItem } from '@/components/ui/RowActionsMenu';
import { NotificationModal } from '@/components/ui/NotificationModal';
import { hasPermission } from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/auth';
import { useUiStore } from '@/store/uiStore';
import { api } from '@/services/api';
import { getApiError, tone } from '@/pages/admin/shared/adminFormatters';
import { MeetingScheduleModal } from './components/MeetingScheduleModal';
import { MeetingRescheduleModal } from './components/MeetingRescheduleModal';
import type { MeetingRecord } from './types';

const statuses = ['SCHEDULED', 'NOTICE_SENT', 'OPEN', 'ATTENDANCE_RECORDING', 'COLLECTIONS_OPEN', 'LOAN_WINDOW_OPEN', 'CLOSING_REVIEW', 'CLOSED', 'CANCELLED'];
const humanize = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const dateFormat = (value: string, time = false) => new Date(value).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', ...(time ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' }) });
const unstarted = (m: MeetingRecord) => ['SCHEDULED', 'NOTICE_SENT', 'OPEN'].includes(m.status) && !m.ceremonyStep && !m.attendanceFinalizedAt && !m.collectionsFinalizedAt && !m.loanStageReachedAt;

export function MeetingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = [10, 20, 25, 50, 100, 200].includes(Number(params.get('size'))) ? Number(params.get('size')) : 50;
  const status = params.get('status') ?? '';
  const search = params.get('search') ?? '';
  const [rows, setRows] = useState<MeetingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState<MeetingRecord | null>(null);
  const [pending, setPending] = useState<{ meeting: MeetingRecord; action: 'delete' | 'cancel' } | null>(null);
  const [form, setForm] = useState({ meetingType: 'ORDINARY', meetingDate: '', venue: 'CREATES Meeting Room', agenda: 'Attendance, collections, loan window, welfare claims, resolutions', notifyMembersByEmail: true });
  const user = useAuthStore(s => s.user);
  const canManage = hasPermission(user, 'officialsPortal.meetings.create');
  const canStart = hasPermission(user, 'officialsPortal.meetings.recordAttendance');
  const canClose = hasPermission(user, 'officialsPortal.meetings.publish');
  const toastSuccess = useUiStore(s => s.toastSuccess);
  const toastError = useUiStore(s => s.toastError);
  const changeQuery = (updates: Record<string, string>) => setParams(prev => { const next = new URLSearchParams(prev); Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); return next; }, { replace: true });
  const refresh = async () => { setRevision(value => value + 1); };
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const timer = window.setTimeout(() => {
      api.get('/meetings', { params: { page, pageSize, status: status || undefined, search: search || undefined, view: 'summary' }, signal: controller.signal })
        .then(res => { if (controller.signal.aborted) return; setRows(res.data.data ?? []); setTotal(res.data.meta?.total ?? 0); const pages = res.data.meta?.totalPages ?? 1; if (page > pages) changeQuery({ page: String(pages) }); })
        .catch(err => { if (!controller.signal.aborted) { setRows([]); setError(getApiError(err)); } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, search ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
    // Query values form the request identity; abort prevents stale responses replacing the current page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status, search, revision]);
  const openMeeting = (meeting: MeetingRecord) => navigate(meeting.id, { state: { meetingsSearch: location.search } });
  const create = async () => {
    if (!form.meetingDate) { toastError('Meeting date required', 'Choose the meeting date and time.'); return; }
    setBusy(true);
    try {
      await api.post('/meetings', { ...form, meetingDate: new Date(`${form.meetingDate}:00+03:00`).toISOString() });
      setScheduleOpen(false); changeQuery({ page: '1', search: '', status: '' }); await refresh();
      toastSuccess('Meeting scheduled', form.notifyMembersByEmail ? 'Members will receive the meeting notice according to their notification settings.' : 'Members have been notified in the portal.');
    } catch (err) { toastError('Could not schedule meeting', getApiError(err)); }
    finally { setBusy(false); }
  };
  const confirm = async (reason: string) => {
    if (!pending) return;
    const { meeting, action } = pending; setPending(null); setBusy(true);
    try {
      if (action === 'delete') await api.delete(`/meetings/${meeting.id}`);
      else await api.post(`/meetings/${meeting.id}/cancel`, { reason });
      await refresh(); toastSuccess(action === 'delete' ? 'Meeting deleted' : 'Meeting cancelled', meeting.meetingNumber);
    } catch (err) { toastError('Meeting action blocked', getApiError(err)); }
    finally { setBusy(false); }
  };
  const columns: Column<MeetingRecord>[] = [
    { id: 'meeting', header: 'Meeting', render: m => <button onClick={() => openMeeting(m)} className="text-left font-semibold text-slate-900 hover:text-brand-700"><span className="block">{m.meetingNumber}</span><span className="mt-0.5 block text-[0.7rem] font-normal text-slate-500">{humanize(m.meetingType)}</span></button> },
    { id: 'date', header: 'Date & time', cellClassName: 'whitespace-nowrap', render: m => <><span className="block text-slate-800">{dateFormat(m.meetingDate)}</span><span className="text-[0.7rem] text-slate-500">{dateFormat(m.meetingDate, true)} · Nairobi</span></> },
    { id: 'venue', header: 'Location', render: m => <span className="block max-w-48 truncate" title={m.venue}>{m.venue || 'Venue pending'}</span> },
    { id: 'status', header: 'Status', render: m => <Badge tone={tone(m.status)}>{humanize(m.status)}</Badge> },
    { id: 'progress', header: 'Current step', headerClassName: 'hidden lg:table-cell', cellClassName: 'hidden lg:table-cell', render: m => m.status === 'CLOSED' ? 'Completed' : m.status === 'CANCELLED' ? '—' : m.ceremonyStep ? humanize(m.ceremonyStep) : 'Not started' },
    { id: 'agenda', header: 'Agenda', headerClassName: 'hidden xl:table-cell', cellClassName: 'hidden xl:table-cell', render: m => <span className="block max-w-64 truncate text-slate-500" title={m.agenda}>{m.agenda || 'No agenda recorded'}</span> },
  ];
  const actions = (meeting: MeetingRecord) => {
    const items: RowActionItem[] = [{ key: 'view', label: 'View details', icon: <FiEye />, onClick: () => openMeeting(meeting) }];
    if (unstarted(meeting) && canStart) items.push({ key: 'start', label: 'Start meeting', icon: <FiPlay />, onClick: () => openMeeting(meeting) });
    if (unstarted(meeting) && canManage) items.push({ key: 'reschedule', label: 'Reschedule meeting', icon: <FiCalendar />, onClick: () => setRescheduling(meeting), disabled: busy }, { key: 'cancel', label: 'Cancel meeting', icon: <FiXCircle />, onClick: () => setPending({ meeting, action: 'cancel' }), disabled: busy });
    if (!unstarted(meeting) && !['CLOSED', 'COMPLETED', 'CANCELLED'].includes(meeting.status) && canClose) items.push({ key: 'close', label: 'Review & close', icon: <FiCheckCircle />, onClick: () => openMeeting(meeting) });
    if (canManage && !['CLOSED', 'COMPLETED'].includes(meeting.status)) items.push({ key: 'delete', label: 'Delete meeting', icon: <FiTrash2 />, variant: 'danger', onClick: () => setPending({ meeting, action: 'delete' }), disabled: busy });
    return <RowActionsMenu items={items} ariaLabel={`Actions for ${meeting.meetingNumber}`} />;
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold tracking-tight text-slate-900">Meetings</h1><p className="mt-0.5 text-xs text-slate-500">Schedule sittings and open a meeting to manage its workflow.</p></div>
        <div className="flex items-center gap-2"><Button size="sm" variant="secondary" icon={<FiRefreshCw />} isLoading={loading} onClick={() => void refresh()}>Refresh</Button>{canManage ? <Button size="sm" icon={<FiCalendar />} onClick={() => setScheduleOpen(true)}>Schedule meeting</Button> : null}</div>
      </header>
      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      <DataTable columns={columns} rows={rows} getRowKey={m => m.id} actions={actions} tableLoading={loading} fillContainer search searchValue={search} onSearchChange={value => changeQuery({ search: value, page: '1' })} searchPlaceholder="Search meeting, location or agenda…" searchAriaLabel="Search meetings" hasSearched={Boolean(search || status)} totalItems={total} currentPage={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} pageSize={pageSize} onPageChange={value => changeQuery({ page: String(value) })} onPageSizeChange={value => changeQuery({ size: String(value), page: '1' })} startIndex={rows.length ? (page - 1) * pageSize + 1 : 0} endIndex={rows.length ? (page - 1) * pageSize + rows.length : 0} emptyTitle="No meetings found" emptyMessage="Schedule a meeting or adjust your search and status filter." actionsButtons={<select aria-label="Meeting status" value={status} onChange={event => changeQuery({ status: event.target.value, page: '1' })} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700"><option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{humanize(value)}</option>)}</select>} />
      <MeetingScheduleModal open={scheduleOpen} busy={busy} form={form} onChange={setForm} onClose={() => setScheduleOpen(false)} onSubmit={() => void create()} />
      {rescheduling ? <MeetingRescheduleModal open meeting={rescheduling} onClose={() => setRescheduling(null)} onSaved={refresh} /> : null}
      <NotificationModal isOpen={Boolean(pending)} onClose={() => setPending(null)} type={pending?.action === 'delete' ? 'delete' : 'confirm'} title={pending?.action === 'delete' ? 'Delete this meeting?' : 'Cancel this meeting?'} message={pending?.action === 'delete' ? 'Only meetings without financial or governance records can be deleted. This cannot be undone.' : 'The meeting will remain in the records as cancelled. Pending reminders will stop.'} confirmText={pending?.action === 'delete' ? 'Delete meeting' : 'Cancel meeting'} showInput={pending?.action === 'cancel'} inputRequired={pending?.action === 'cancel'} inputLabel="Cancellation reason" inputType="textarea" onConfirm={reason => void confirm(reason)} />
    </div>
  );
}
