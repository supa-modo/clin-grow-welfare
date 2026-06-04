import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";

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

export function MeetingScheduleModal({
  open,
  busy,
  form,
  onChange,
  onClose,
  onSubmit,
}: Props) {
  return (
    <Modal
      open={open}
      title="Schedule meeting"
      subtitle="Create the meeting notice and notify members."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            isLoading={busy}
            loadingText="Scheduling..."
            onClick={onSubmit}
          >
            Schedule and notify
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Meeting type"
            options={[
              { label: "Ordinary", value: "ORDINARY" },
              { label: "AGM", value: "AGM" },
              { label: "Special general", value: "SPECIAL_GENERAL" },
              { label: "Management committee", value: "MANAGEMENT_COMMITTEE" },
            ]}
            value={form.meetingType}
            onChange={(e) => onChange({ ...form, meetingType: e.target.value })}
            className="w-full"
          />

          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-700">
              Date and time
            </label>
            <input
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              type="datetime-local"
              value={form.meetingDate}
              onChange={(e) =>
                onChange({ ...form, meetingDate: e.target.value })
              }
            />
          </div>
        </div>
        <Input
          label="Venue"
          value={form.venue}
          onChange={(e) => onChange({ ...form, venue: e.target.value })}
          className="w-full"
        />
        <Textarea
          label="Agenda"
          value={form.agenda}
          onChange={(e) => onChange({ ...form, agenda: e.target.value })}
          className="w-full"
          rows={4}
        />
      </div>
    </Modal>
  );
}
