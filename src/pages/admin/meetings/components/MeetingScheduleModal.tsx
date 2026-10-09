import { FiCalendar, FiMapPin } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

export type ScheduleForm = {
  meetingType: string;
  meetingDate: string;
  venue: string;
  virtualLink: string;
  agenda: string;
  notifyMembersByEmail: boolean;
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
      subtitle="Set the arrangements and prepare the notice for members."
      size="lg"
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            All meeting times use Nairobi time.
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              icon={<FiCalendar />}
              disabled={!form.meetingDate}
              isLoading={busy}
              loadingText="Scheduling..."
              onClick={onSubmit}
            >
              {form.notifyMembersByEmail
                ? "Schedule and notify"
                : "Schedule meeting"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <section>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <FiCalendar className="text-slate-400" /> Meeting arrangements
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Meeting type"
              aria-label="Meeting type"
              disabled={busy}
              options={[
                { label: "Ordinary", value: "ORDINARY" },
                { label: "AGM", value: "AGM" },
                { label: "Special general", value: "SPECIAL_GENERAL" },
                {
                  label: "Management committee",
                  value: "MANAGEMENT_COMMITTEE",
                },
              ]}
              value={form.meetingType}
              onChange={(e) =>
                onChange({ ...form, meetingType: e.target.value })
              }
            />
            <Input
              label="Date and time (Nairobi)"
              aria-label="Date and time (Nairobi)"
              type="datetime-local"
              disabled={busy}
              value={form.meetingDate}
              onChange={(e) =>
                onChange({ ...form, meetingDate: e.target.value })
              }
            />
          </div>
        </section>
        <section className="border-t border-slate-100 pt-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <FiMapPin className="text-slate-400" /> Location and online access
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Venue"
              aria-label="Venue"
              disabled={busy}
              value={form.venue}
              placeholder="Meeting location"
              onChange={(e) => onChange({ ...form, venue: e.target.value })}
            />
            <Input
              label="Virtual meeting link (optional)"
              aria-label="Virtual meeting link (optional)"
              type="url"
              disabled={busy}
              value={form.virtualLink ?? ""}
              placeholder="https://meet.google.com/..."
              onChange={(e) =>
                onChange({ ...form, virtualLink: e.target.value })
              }
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            The online meeting link is included in the notice sent to members.
          </p>
        </section>
        <RichTextEditor
          label="Agenda"
          value={form.agenda}
          disabled={busy}
          onChange={(agenda) => onChange({ ...form, agenda })}
        />
        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <div>
            <p className="text-xs font-semibold text-slate-800">
              Email the meeting notice
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Include the date, venue, online link and formatted agenda.
            </p>
          </div>
          <ToggleSwitch
            checked={form.notifyMembersByEmail}
            onChange={(checked) =>
              onChange({ ...form, notifyMembersByEmail: checked })
            }
            variant="success"
            title="Email members"
          />
        </div>
      </div>
    </Modal>
  );
}
