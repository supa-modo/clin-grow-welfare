import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { StateBlock } from '@/pages/admin/shared/adminUi';
import { useMeetingCeremony } from './hooks/useMeetingCeremony';
import { MeetingControlRoom } from './components/MeetingControlRoom';

export function MeetingDetailsPage() {
  const { meetingId } = useParams();
  const ceremony = useMeetingCeremony(meetingId);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to=".." relative="path" className="inline-flex items-center gap-2 rounded-md text-xs font-semibold text-slate-600 hover:text-brand-700"><FiArrowLeft /> All meetings</Link>
        <h1 className="text-sm font-semibold text-slate-900">Meeting Control Room</h1>
      </div>
      <StateBlock loading={ceremony.loading && !ceremony.selectedMeeting} error={ceremony.error} />
      {!ceremony.error && ceremony.selectedMeeting ? <MeetingControlRoom ceremony={ceremony} /> : null}
    </div>
  );
}
