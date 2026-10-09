import { Link, useLocation, useParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { StateBlock } from "@/pages/admin/shared/adminUi";
import { useMeetingCeremony } from "./hooks/useMeetingCeremony";
import { MeetingControlRoom } from "./components/MeetingControlRoom";

export function MeetingDetailsPage() {
  const { meetingId } = useParams();
  return meetingId ? (
    <MeetingWorkspace key={meetingId} meetingId={meetingId} />
  ) : (
    <StateBlock error="Meeting not found" />
  );
}

function MeetingWorkspace({ meetingId }: { meetingId: string }) {
  const location = useLocation();
  const ceremony = useMeetingCeremony(meetingId);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 bg-white">
      <div className="flex items-center justify-between gap-3">
        <Link
          to={{ pathname: "..", search: location.state?.meetingsSearch ?? "" }}
          relative="path"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gray-200 text-gray-700">
            <FiArrowLeft className="h-3.5 w-3.5" />
          </span>
          All meetings
        </Link>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-gray-600">
          Meeting Control room
        </p>
      </div>
      <StateBlock
        loading={ceremony.loading && !ceremony.selectedMeeting}
        error={ceremony.error}
      />
      {!ceremony.error && ceremony.selectedMeeting ? (
        <MeetingControlRoom ceremony={ceremony} />
      ) : null}
    </div>
  );
}
