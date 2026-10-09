import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { api } from '@/services/api';
import { useUiStore } from '@/store/uiStore';
import { getApiError } from '@/pages/admin/shared/adminFormatters';
import type { MeetingRecord } from '../types';

export function MeetingRescheduleModal({ open, meeting, onClose, onSaved }: { open: boolean; meeting: MeetingRecord; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ meetingDate: '', venue: '', virtualLink: '', agenda: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const toastSuccess = useUiStore(s => s.toastSuccess), toastError = useUiStore(s => s.toastError);
  useEffect(() => {
    if (open) setForm({ meetingDate: new Date(new Date(meeting.meetingDate).getTime() + 3 * 3600000).toISOString().slice(0, 16), venue: meeting.venue ?? '', virtualLink: meeting.virtualLink ?? '', agenda: meeting.agenda ?? '', reason: '' });
  }, [open, meeting.id, meeting.meetingDate]);
  const submit = async () => {
    const date = new Date(form.meetingDate + ':00+03:00');
    if (!Number.isFinite(date.getTime()) || date <= new Date()) { toastError('Choose a future date', 'Enter the revised date and time in Nairobi time.'); return; }
    setSaving(true);
    try {
      const { data } = await api.post(`/meetings/${meeting.id}/reschedule`, { ...form, meetingDate: date.toISOString() });
      toastSuccess('Meeting rescheduled', data.reminderQueued ? 'The revised details have been saved and reminder emails queued for active members.' : 'The revised details have been saved. Reminder emails are pending and will retry when the email queue is available.');
      onClose();
      await onSaved();
    } catch (error) { toastError('Could not reschedule meeting', getApiError(error)); }
    finally { setSaving(false); }
  };
  return <Modal open={open} title="Reschedule meeting" subtitle="Update the arrangements and email members the revised notice." onClose={() => { if (!saving) onClose(); }} footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button><Button disabled={!form.meetingDate || form.reason.trim().length < 3} isLoading={saving} onClick={() => void submit()}>Reschedule and notify</Button></div>}>
    <div className="space-y-4">
      <p className="rounded-lg bg-slate-50 p-3 text-sm text-ink-600">{meeting.meetingNumber}. The meeting number and existing records are retained. Old scheduled reminders will be cancelled.</p>
      <Input label="New date and time (Nairobi)" aria-label="New date and time (Nairobi)" type="datetime-local" value={form.meetingDate} onChange={e => setForm({ ...form, meetingDate: e.target.value })} />
      <Input label="Venue" aria-label="Venue" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
      <Input label="Virtual meeting link" aria-label="Virtual meeting link" value={form.virtualLink} onChange={e => setForm({ ...form, virtualLink: e.target.value })} />
      <RichTextEditor label="Agenda" value={form.agenda} disabled={saving} onChange={agenda => setForm({ ...form, agenda })} />
      <Textarea label="Reason for postponement" aria-label="Reason for postponement" rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
    </div>
  </Modal>;
}
