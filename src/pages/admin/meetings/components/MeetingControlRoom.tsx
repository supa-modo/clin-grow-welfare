import {
  FiCheckCircle,
  FiDollarSign,
  FiFileText,
  FiPlay,
  FiRefreshCw,
  FiSend,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { tone } from "@/pages/admin/shared/adminFormatters";
import type { MeetingStep } from "../types";
import {
  canCloseMeeting,
  canGoToStep,
  isCorrectionMode,
  isEarlyCeremonyLocked,
  isMeetingStarted,
  nextStep,
} from "../utils";
import { useMeetingCeremony } from "../hooks/useMeetingCeremony";
import { StepFooter } from "./StepFooter";
import { AttendanceStep } from "./steps/AttendanceStep";
import { FinesStep } from "./steps/FinesStep";
import { CollectionsStep } from "./steps/CollectionsStep";
import { RepaymentsStep } from "./steps/RepaymentsStep";
import { SummaryStep } from "./steps/SummaryStep";
import { LoanWindowStep } from "./steps/LoanWindowStep";
import { CloseStep } from "./steps/CloseStep";
import { ResolutionsStep } from "./steps/ResolutionsStep";
import { StatCard } from "@/components/ui/StatCard";
import { NotificationModal } from "@/components/ui/NotificationModal";

type Ceremony = ReturnType<typeof useMeetingCeremony>;

const workflowTabs = [
  { value: "attendance" as const, label: "Attendance", icon: <FiUsers /> },
  { value: "fines" as const, label: "Fines", icon: <FiShield /> },
  {
    value: "collections" as const,
    label: "Collections",
    icon: <FiDollarSign />,
  },
  { value: "repayments" as const, label: "Repayments", icon: <FiRefreshCw /> },
  { value: "summary" as const, label: "Summary", icon: <FiFileText /> },
  { value: "loans" as const, label: "Loan window", icon: <FiSend /> },
  { value: "close" as const, label: "Close", icon: <FiCheckCircle /> },
];

export function MeetingControlRoom({
  ceremony,
  money,
}: {
  ceremony: Ceremony;
  money: (amount: number) => string;
}) {
  const {
    busy,
    step,
    setStep,
    setCeremonyStepWithSync,
    roster,
    pool,
    selectedMeeting,
    activeLoanWindow,
    collectionTotals,
    attendanceDraft,
    setAttendanceDraft,
    collectionDraft,
    setCollectionDraft,
    reservationDraft,
    setReservationDraft,
    minutesDraft,
    setMinutesDraft,
    mattersArisingDraft,
    setMattersArisingDraft,
    aobDraft,
    setAobDraft,
    meetingReport,
    showReserveModal,
    setShowReserveModal,
    reserveForm,
    setReserveForm,
    action,
    sendNotice,
    generateFines,
    createManualFine,
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
    openLoanWindow,
    closeLoanWindow,
    reopenLoanWindow,
    adminReopenMeeting,
    reverseCollectionItem,
    adjustCollectionItem,
    updateReservation,
    releaseReservation,
    officialReserve,
    runLoanAction,
    saveMinutes,
    saveMattersArising,
    saveAob,
    publishMinutes,
    sendSummaryToMembers,
    uploadMinutesDocument,
    loadPool,
    reload,
    closeMeeting,
    pendingAction,
    clearPendingAction,
    runPendingAction,
  } = ceremony;

  if (!selectedMeeting) return null;

  const m = selectedMeeting;
  const guardedTabs = workflowTabs.map((tab) => ({
    ...tab,
    disabled: !canGoToStep(tab.value, m, roster, pool),
  }));
  const setGuardedStep = (next: MeetingStep) => {
    if (canGoToStep(next, m, roster, pool)) setStep(next);
  };
  const canClose = canCloseMeeting(m, roster, pool);
  const meetingStarted = isMeetingStarted(m);
  const continueStep =
    (m.ceremonyStep as MeetingStep | undefined) ??
    nextStep("attendance") ??
    "fines";
  const stageLocked =
    isEarlyCeremonyLocked(m) &&
    ["attendance", "fines", "collections", "repayments", "summary"].includes(step);

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden p-0">
      <div className="shrink-0 p-5 pb-0">
        {isCorrectionMode(m) ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            Correction mode — changes post with meeting date{" "}
            {new Date(m.meetingDate).toLocaleDateString("en-KE")}. Correct earlier
            meetings before later ones. Re-close when done to regenerate the summary.
          </div>
        ) : null}
        {stageLocked ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            Loan stage is locked. Attendance, fines, and collections can no
            longer be edited for this meeting.
          </div>
        ) : null}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-extrabold text-ink-900">
                {m.meetingNumber}
              </h3>
              <Badge tone={tone(m.status)}>{m.status}</Badge>
              <Badge>{m.meetingType}</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-500">
              {new Date(m.meetingDate).toLocaleString()} -{" "}
              {m.venue ?? "Venue pending"}
            </p>
            <p className="mt-2 max-w-3xl text-sm text-ink-600">{m.agenda}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<FiSend />}
              disabled={!!busy || m.status === "CLOSED"}
              onClick={() => void sendNotice(m.id)}
            >
              Email notice
            </Button>
            {!meetingStarted && m.status !== "CLOSED" ? (
              <Button
                size="sm"
                variant="secondary"
                icon={<FiPlay />}
                disabled={!!busy}
                onClick={() => void action(m.id, "start")}
              >
                Start meeting
              </Button>
            ) : null}
            {meetingStarted && m.status !== "CLOSED" ? (
              <Button
                size="sm"
                variant="secondary2"
                disabled={!!busy}
                onClick={() => setGuardedStep(continueStep)}
              >
                Continue to {continueStep.replace(/_/g, " ")}
              </Button>
            ) : null}
          </div>
        </div>

        <SegmentedTabs<MeetingStep>
          tabs={guardedTabs}
          value={step}
          onChange={setGuardedStep}
          className="mt-3"
        />
      </div>

      <div
        className="pt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-2"
        data-meeting-step-scroll
        data-route-scroll-container
      >
        {step === "attendance" ? (
          <AttendanceStep
            meeting={m}
            roster={roster}
            busy={busy}
            attendanceDraft={attendanceDraft}
            setAttendanceDraft={setAttendanceDraft}
            savedAttendanceIds={savedAttendanceIds}
            showFinalize={showAttendanceFinalize}
            onSaveRow={(memberId) => void markAttendance(m.id, memberId)}
            onSaveAll={() => void saveAllAttendance(m.id)}
            onCloseFinalize={() => setShowAttendanceFinalize(false)}
            onFinalize={() => void finalizeAttendance(m.id)}
            onReviewApology={(id, decision) => void reviewApology(id, decision)}
          />
        ) : null}
        {step === "fines" ? (
          <FinesStep
            meeting={m}
            roster={roster}
            busy={busy}
            onGenerate={() => void generateFines(m.id)}
            onCollectFine={(memberId, fine) =>
              void collect(m, memberId, {
                type: "FINE_PAYMENT",
                amount: Number(fine.amount),
                fineId: fine.id,
              })
            }
            onNotify={(fineId) => void notifyFine(fineId)}
            onDefer={(fineId) => void deferFine(fineId)}
            onCreateManualFine={(input) => void createManualFine(m.id, input)}
            mattersArisingDraft={mattersArisingDraft[m.id] ?? m.mattersArising ?? ''}
            onMattersArisingChange={(value) => setMattersArisingDraft((prev) => ({ ...prev, [m.id]: value }))}
            onSaveMattersArising={() => void saveMattersArising(m)}
          />
        ) : null}
        {step === "collections" ? (
          <CollectionsStep
            meeting={m}
            roster={roster}
            busy={busy}
            collectionDraft={collectionDraft}
            setCollectionDraft={setCollectionDraft}
            readiness={collectionsReadiness}
            constitutionalOverride={collectionsOverride}
            onOverrideChange={(value) => {
              setCollectionsOverride(value);
              void loadCollectionsReadiness(m.id, value);
            }}
            onRefreshReadiness={() => void loadCollectionsReadiness(m.id)}
            onWaiver={(memberId, patch) =>
              void updateCollectionWaiver(m.id, memberId, patch)
            }
            onPost={(memberId, type, amount, periodDate) =>
              void collect(m, memberId, { type, amount, periodDate })
            }
            onFinalize={() => finalizeCollections(m.id)}
            onReverseItem={(itemId, reason) => void reverseCollectionItem(m.id, itemId, reason)}
            onAdjustItem={(itemId, amount, reason) => void adjustCollectionItem(m.id, itemId, amount, reason)}
          />
        ) : null}
        {step === "repayments" ? (
          <RepaymentsStep
            meeting={m}
            roster={roster}
            busy={busy}
            collectionDraft={collectionDraft}
            setCollectionDraft={setCollectionDraft}
            onPost={(memberId, loanId, amount) =>
              void collect(m, memberId, {
                type: "LOAN_REPAYMENT",
                amount,
                loanId,
              })
            }
            onReverseItem={(itemId, reason) => void reverseCollectionItem(m.id, itemId, reason)}
            onAdjustItem={(itemId, amount, reason) => void adjustCollectionItem(m.id, itemId, amount, reason)}
          />
        ) : null}
        {step === "summary" ? (
          <div className="space-y-4">
            <SummaryStep
              meeting={m}
              collectionTotals={collectionTotals}
              pool={pool}
            />
            <ResolutionsStep
              meeting={m}
              resolutions={m.resolutions}
              busy={busy}
              onRecorded={() => void reload()}
            />
          </div>
        ) : null}
        {step === "loans" ? (
          <LoanWindowStep
            meeting={m}
            roster={roster}
            pool={pool}
            busy={busy}
            activeLoanWindow={activeLoanWindow}
            reservationDraft={reservationDraft}
            setReservationDraft={setReservationDraft}
            showReserveModal={showReserveModal}
            setShowReserveModal={setShowReserveModal}
            reserveForm={reserveForm}
            setReserveForm={setReserveForm}
            onOpenWindow={() => void openLoanWindow(m.id)}
            onCloseWindow={(id) => void closeLoanWindow(id, m)}
            onReopenWindow={(id) => void reopenLoanWindow(id)}
            onUpdateReservation={(r) => void updateReservation(r)}
            onReleaseReservation={(r) => void releaseReservation(r)}
            onOfficialReserve={() => void officialReserve()}
            onRefreshPool={() => void loadPool(m.id)}
            onLoanAction={(loan, label, runner) =>
              void runLoanAction(loan, label, runner)
            }
            aobDraft={aobDraft[m.id] ?? m.anyOtherBusiness ?? ''}
            onAobChange={(value) => setAobDraft((prev) => ({ ...prev, [m.id]: value }))}
            onSaveAob={() => void saveAob(m)}
          />
        ) : null}
        {step === "close" ? (
          <CloseStep
            meeting={m}
            busy={busy}
            minutesDraft={minutesDraft}
            setMinutesDraft={setMinutesDraft}
            meetingReport={meetingReport}
            onCloseMeeting={() => void closeMeeting(m.id)}
            onSaveMinutes={() => void saveMinutes(m)}
            onPublish={() => void publishMinutes(m.id)}
            onUploadMinutes={(file) => void uploadMinutesDocument(m.id, file)}
            onSendSummary={() => void sendSummaryToMembers(m.id)}
            onAdminReopen={(input) => void adminReopenMeeting(m.id, input)}
            canClose={canClose}
          />
        ) : null}
      </div>

      <StepFooter
        step={step}
        setStep={setCeremonyStepWithSync}
        canSetStep={(next) => canGoToStep(next, m, roster, pool)}
        meeting={m}
        roster={roster}
        pool={pool}
        disabled={!!busy}
        collectionsReady={collectionsReadiness?.ready || collectionsOverride}
      />

      <NotificationModal
        isOpen={!!pendingAction}
        onClose={clearPendingAction}
        type={pendingAction?.type}
        title={pendingAction?.title ?? ""}
        message={pendingAction?.message ?? ""}
        confirmText={pendingAction?.confirmText ?? "Confirm"}
        onConfirm={() => void runPendingAction()}
      />
    </Card>
  );
}
