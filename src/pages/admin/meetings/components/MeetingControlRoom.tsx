import { useState, type ReactNode } from "react";
import { MeetingRescheduleModal } from "./MeetingRescheduleModal";
import { hasPermission } from "@/components/ProtectedRoute";
import { useAuthStore } from "@/store/auth";
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiDollarSign,
  FiFileText,
  FiInfo,
  FiMapPin,
  FiPlay,
  FiRefreshCw,
  FiSend,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { PiMapPinAreaDuotone } from "react-icons/pi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  RowActionsMenu,
  type RowActionItem,
} from "@/components/ui/RowActionsMenu";
import { Card } from "@/components/ui/Card";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { RefreshIconButton } from "@/components/ui/RefreshIconButton";
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
import { AobSection } from "./AobSection";
import { StepFooter } from "./StepFooter";
import { AttendanceStep } from "./steps/AttendanceStep";
import { FinesStep } from "./steps/FinesStep";
import { CollectionsStep } from "./steps/CollectionsStep";
import { RepaymentsStep } from "./steps/RepaymentsStep";
import { SummaryStep } from "./steps/SummaryStep";
import { LoanWindowStep } from "./steps/LoanWindowStep";
import { CloseStep } from "./steps/CloseStep";
import { ResolutionsStep } from "./steps/ResolutionsStep";
import { NotificationModal } from "@/components/ui/NotificationModal";
import { MeetingDetailsModal } from "./MeetingDetailsModal";

type Ceremony = ReturnType<typeof useMeetingCeremony>;

function readableLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function meetingSchedule(value: string) {
  const date = new Date(value);
  const day = date.toLocaleDateString("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("en-KE", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

function SittingNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 border-b border-amber-100 bg-amber-50/90 px-4 py-2.5 text-xs leading-5 text-amber-950">
      <FiAlertTriangle
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
        aria-hidden
      />
      <p>{children}</p>
    </div>
  );
}

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

export function MeetingControlRoom({ ceremony }: { ceremony: Ceremony }) {
  const {
    busy,
    step,
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
    reopenCollections,
    skipCollections,
    updateCollectionWaiver,
    bulkWaiveWeeklySavings,
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
    refreshWorkspace,
    workspaceSyncing,
    rolloverCandidates,
    rolloverCandidatesStatus,
    loadRolloverCandidates,
    unclaimedCarryover,
    confirmLoanRollover,
    waiveLoanRollover,
    appendResolution,
    closeMeeting,
    pendingAction,
    clearPendingAction,
    runPendingAction,
  } = ceremony;

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const canReschedule = hasPermission(
    useAuthStore((s) => s.user),
    "officialsPortal.meetings.create",
  );

  if (!selectedMeeting) return null;

  const m = selectedMeeting;
  if (m.status === "CANCELLED")
    return (
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {m.meetingNumber}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              This meeting was cancelled. Its record has been retained.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<FiInfo />}
            onClick={() => setDetailsOpen(true)}
          >
            Meeting details
          </Button>
        </div>
        <MeetingDetailsModal
          open={detailsOpen}
          meeting={m}
          roster={null}
          report={null}
          onClose={() => setDetailsOpen(false)}
        />
      </Card>
    );
  const collectionsPaused = Boolean(
    roster?.collectionsPaused || collectionsReadiness?.collectionsPaused,
  );
  const lendingClosed = Boolean(
    collectionsPaused || roster?.lendingClosed || pool?.lendingClosed,
  );
  const guardedTabs = workflowTabs
    .filter(
      (tab) =>
        tab.value !== "loans" ||
        !lendingClosed ||
        m.loanWindows?.some((window) => window.status === "OPEN"),
    )
    .map((tab) => ({
      ...tab,
      label:
        tab.value === "collections" &&
        collectionsPaused &&
        !m.collectionsFinalizedAt
          ? "Collections (paused)"
          : tab.label,
      disabled: !canGoToStep(tab.value, m, roster, pool),
    }));
  const setGuardedStep = (next: MeetingStep) => {
    if (canGoToStep(next, m, roster, pool)) void setCeremonyStepWithSync(next);
  };
  const canClose = canCloseMeeting(m, roster, pool);
  const meetingStarted = isMeetingStarted(m);
  const continueStep =
    (m.ceremonyStep as MeetingStep | undefined) ??
    nextStep("attendance") ??
    "fines";
  const stageLocked =
    isEarlyCeremonyLocked(m) &&
    ["attendance", "fines", "collections", "repayments", "summary"].includes(
      step,
    );
  const noticeLocked =
    busy === "notices" ||
    ["CLOSED", "COMPLETED", "CANCELLED"].includes(m.status);
  const canOfferReschedule =
    canReschedule &&
    ["SCHEDULED", "NOTICE_SENT", "OPEN"].includes(m.status) &&
    !m.ceremonyStep &&
    !m.attendanceFinalizedAt &&
    !m.collectionsFinalizedAt &&
    !m.loanStageReachedAt;
  const meetingMenuItems: RowActionItem[] = [
    ...(canOfferReschedule
      ? [
          {
            key: "reschedule",
            label: "Reschedule Meeting",
            icon: <FiCalendar />,
            disabled: Boolean(busy),
            onClick: () => setRescheduleOpen(true),
          },
        ]
      : []),
    {
      key: "details",
      label: "Meeting Details",
      icon: <FiInfo />,
      onClick: () => setDetailsOpen(true),
    },
    {
      key: "notice",
      label: "Send Email Notice",
      icon: <FiSend />,
      disabled: noticeLocked,
      disabledReason: noticeLocked
        ? "Notices cannot be sent for this meeting."
        : undefined,
      onClick: () => void sendNotice(m.id),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0">
        <section className="overflow-hidden rounded-[0.8rem] border border-slate-200 bg-white shadow-sm">
          {lendingClosed ? (
            <SittingNotice>
              <strong>Lending closed for AGM recovery.</strong> Collect fines
              and loan repayments, record AOB, and close the meeting. Receipts
              remain in the welfare&apos;s cash balance.
            </SittingNotice>
          ) : null}
          {isCorrectionMode(m) ? (
            <SittingNotice>
              <strong>Correction mode.</strong> Changes post with meeting date{" "}
              {new Date(m.meetingDate).toLocaleDateString("en-KE")}. Correct
              earlier meetings before later ones, then re-close to regenerate
              the summary.
            </SittingNotice>
          ) : null}
          {stageLocked ? (
            <SittingNotice>
              <strong>Loan stage is locked.</strong> Attendance, fines, and
              collections can no longer be edited for this meeting.
            </SittingNotice>
          ) : null}
          <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex items-center gap-3">
              <h2 className="font-google text-lg font-extrabold tracking-tight text-slate-950">
                {m.meetingNumber}
              </h2>
              <div className="w-px h-4 bg-gray-300" />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
                <Badge size="xs" tone={tone(m.status)}>
                  {readableLabel(m.status)}
                </Badge>
                <Badge size="xs">{readableLabel(m.meetingType)}</Badge>
                <span
                  className="hidden h-3 w-px bg-slate-200 sm:inline-block"
                  aria-hidden
                />
                <span className="inline-flex items-center gap-1.5">
                  <FiCalendar
                    className="h-3.5 w-3.5 text-slate-400"
                    aria-hidden
                  />
                  {meetingSchedule(m.meetingDate)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <PiMapPinAreaDuotone
                    className="h-3.5 w-3.5 text-slate-400"
                    aria-hidden
                  />
                  {m.venue ?? "Venue pending"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
              <RefreshIconButton
                size="sm"
                loading={workspaceSyncing}
                onClick={() => void refreshWorkspace()}
              />
              <RowActionsMenu
                items={meetingMenuItems}
                ariaLabel={`Actions for ${m.meetingNumber}`}
                size="md"
              />
              {!meetingStarted &&
              !["CLOSED", "COMPLETED", "CANCELLED"].includes(m.status) ? (
                <Button
                  size="sm"
                  variant="primary"
                  icon={<FiPlay />}
                  disabled={busy === "start"}
                  onClick={() => void action(m.id, "start")}
                >
                  Start meeting
                </Button>
              ) : null}
              {meetingStarted && m.status !== "CLOSED" ? (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={false}
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
            compact
            aria-label="Meeting workflow"
            className=" font-bold"
          />
        </section>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-1 pb-2 pt-3"
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
            mattersArisingDraft={
              mattersArisingDraft[m.id] ?? m.mattersArising ?? ""
            }
            onMattersArisingChange={(value) =>
              setMattersArisingDraft((prev) => ({ ...prev, [m.id]: value }))
            }
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
            onReopen={(reason) => reopenCollections(m.id, reason)}
            onSkip={() => skipCollections(m.id)}
            onBulkWaiveWeekly={(weeklyWaived) =>
              bulkWaiveWeeklySavings(m.id, weeklyWaived)
            }
            onReverseItem={(itemId, reason) =>
              void reverseCollectionItem(m.id, itemId, reason)
            }
            onAdjustItem={(itemId, amount, reason) =>
              void adjustCollectionItem(m.id, itemId, amount, reason)
            }
          />
        ) : null}
        {step === "repayments" ? (
          <RepaymentsStep
            meeting={m}
            roster={roster}
            busy={busy}
            collectionDraft={collectionDraft}
            setCollectionDraft={setCollectionDraft}
            rolloverCandidates={rolloverCandidates}
            rolloverLoading={
              rolloverCandidatesStatus.meetingId === m.id &&
              rolloverCandidatesStatus.state === "loading"
            }
            rolloverLoadError={
              rolloverCandidatesStatus.meetingId === m.id
                ? rolloverCandidatesStatus.error
                : null
            }
            onRefreshRollovers={() => void loadRolloverCandidates(m.id)}
            onConfirmRollover={(loanId, periodNumber) =>
              void confirmLoanRollover(m.id, loanId, { periodNumber })
            }
            onWaiveRollover={(loanId, periodNumber, reason, component) =>
              void waiveLoanRollover(m.id, loanId, {
                periodNumber,
                reason,
                component,
              })
            }
            onPost={(memberId, loanId, amount) =>
              void collect(m, memberId, {
                type: "LOAN_REPAYMENT",
                amount,
                loanId,
              })
            }
            onReverseItem={(itemId, reason) =>
              void reverseCollectionItem(m.id, itemId, reason)
            }
            onAdjustItem={(itemId, amount, reason) =>
              void adjustCollectionItem(m.id, itemId, amount, reason)
            }
          />
        ) : null}
        {step === "summary" ? (
          <div className="space-y-4">
            <SummaryStep
              meeting={m}
              collectionTotals={collectionTotals}
              pool={pool}
              unclaimedCarryover={unclaimedCarryover}
              lendingClosed={lendingClosed}
            />
            <AobSection
              meeting={m}
              busy={busy}
              value={aobDraft[m.id] ?? m.anyOtherBusiness ?? ""}
              onChange={(value) =>
                setAobDraft((prev) => ({ ...prev, [m.id]: value }))
              }
              onSave={() => void saveAob(m)}
            />
            <ResolutionsStep
              meeting={m}
              resolutions={m.resolutions}
              busy={busy}
              onRecorded={(resolution) => appendResolution(m.id, resolution)}
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
            onCloseWindow={(id, options) =>
              void closeLoanWindow(id, m, options)
            }
            onReopenWindow={(id) => void reopenLoanWindow(id)}
            onUpdateReservation={(r) => void updateReservation(r)}
            onReleaseReservation={(r) => void releaseReservation(r)}
            onOfficialReserve={() => void officialReserve()}
            onRefreshPool={() => void loadPool(m.id)}
            unclaimedCarryover={unclaimedCarryover}
            onLoanAction={(loan, label, runner) =>
              void runLoanAction(loan, label, runner)
            }
          />
        ) : null}
        {step === "close" ? (
          <div className="space-y-4">
            <AobSection
              meeting={m}
              busy={busy}
              value={aobDraft[m.id] ?? m.anyOtherBusiness ?? ""}
              onChange={(value) =>
                setAobDraft((prev) => ({ ...prev, [m.id]: value }))
              }
              onSave={() => void saveAob(m)}
            />
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
          </div>
        ) : null}
      </div>

      <StepFooter
        step={step}
        setStep={setCeremonyStepWithSync}
        canSetStep={(next) => canGoToStep(next, m, roster, pool)}
        meeting={m}
        roster={roster}
        pool={pool}
        disabled={false}
        collectionsReady={
          collectionsReadiness?.ready ||
          collectionsOverride ||
          collectionsPaused
        }
        repaymentsReady={
          rolloverCandidatesStatus.meetingId === m.id &&
          rolloverCandidatesStatus.state === "loaded" &&
          !rolloverCandidates.some(
            (candidate) => candidate.status === "PENDING",
          )
        }
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
      <MeetingDetailsModal
        open={detailsOpen}
        meeting={m}
        roster={roster}
        report={meetingReport}
        onClose={() => setDetailsOpen(false)}
      />
      <MeetingRescheduleModal
        open={rescheduleOpen}
        meeting={m}
        onClose={() => setRescheduleOpen(false)}
        onSaved={refreshWorkspace}
      />
    </div>
  );
}
