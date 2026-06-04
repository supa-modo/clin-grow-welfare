import { FiClock, FiRefreshCw } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { money } from '@/pages/admin/shared/adminFormatters';
import { StateBlock } from '@/pages/admin/shared/adminUi';
import { useMeetingCeremony } from './hooks/useMeetingCeremony';
import { MeetingListSidebar } from './components/MeetingListSidebar';
import { MeetingControlRoom } from './components/MeetingControlRoom';
import { MeetingScheduleModal } from './components/MeetingScheduleModal';

export function MeetingsPage() {
  const ceremony = useMeetingCeremony();
  const {
    data,
    loading,
    error,
    reload,
    busy,
    showSchedule,
    setShowSchedule,
    scheduleForm,
    setScheduleForm,
    create,
    selectedMeeting,
    selectedId,
    setSelectedId,
    deleteMeeting,
    pool,
    collectionTotals,
  } = ceremony;

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-4">
      <PageHeader
        title="Meeting Control Room"
        subtitle="Run the weekly welfare sitting from notice to attendance, collections, loan window, resolutions, and close report."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void reload()}>Refresh</Button>
            <Button icon={<FiClock />} onClick={() => setShowSchedule(true)}>Schedule Meeting</Button>
          </div>
        }
      />

     

      <StateBlock loading={loading} error={error} empty={!loading && !data?.length} />
      {data?.length ? (
        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[380px_1fr]">
          <MeetingListSidebar meetings={data} selectedId={selectedMeeting?.id ?? selectedId} onSelect={setSelectedId} onDelete={deleteMeeting} />
          <MeetingControlRoom ceremony={ceremony} money={money} />
        </div>
      ) : null}

      <MeetingScheduleModal
        open={showSchedule}
        busy={busy === 'create'}
        form={scheduleForm}
        onChange={setScheduleForm}
        onClose={() => setShowSchedule(false)}
        onSubmit={() => void create()}
      />
    </div>
  );
}
