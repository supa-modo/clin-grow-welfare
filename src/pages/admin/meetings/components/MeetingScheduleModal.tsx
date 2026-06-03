import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

type ScheduleForm = {
  meetingType: string;
  meetingDate: string;
  venue: string;
  agenda: string;
};

type Props = {
  open: boolean;
  busy: boolean;
  form: ScheduleForm;
  onChange: (form: ScheduleForm) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function MeetingScheduleModal({ open, busy, form, onChange, onClose, onSubmit }: Props) {
  return (
    <Modal
      open={open}
      title="Schedule meeting"
      subtitle="Create the meeting notice and notify members."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2 px-5 py-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button isLoading={busy} loadingText="Scheduling..." onClick={onSubmit}>Schedule and notify</Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-700">Meeting type</label>
            <select className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" value={form.meetingType} onChange={(e) => onChange({ ...form, meetingType: e.target.value })}>
              <option value="ORDINARY">Ordinary</option>
              <option value="AGM">AGM</option>
              <option value="SPECIAL_GENERAL">Special general</option>
              <option value="MANAGEMENT_COMMITTEE">Management committee</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-700">Date and time</label>
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" type="datetime-local" value={form.meetingDate} onChange={(e) => onChange({ ...form, meetingDate: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-700">Venue</label>
          <input className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" value={form.venue} onChange={(e) => onChange({ ...form, venue: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-700">Agenda</label>
          <textarea className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" rows={4} value={form.agenda} onChange={(e) => onChange({ ...form, agenda: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}
