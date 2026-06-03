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
import { canAdvanceStep, canGoToStep } from "../utils";
import { useMeetingCeremony } from "../hooks/useMeetingCeremony";
import { StepFooter } from "./StepFooter";
import { AttendanceStep } from "./steps/AttendanceStep";
import { FinesStep } from "./steps/FinesStep";
import { CollectionsStep } from "./steps/CollectionsStep";
import { RepaymentsStep } from "./steps/RepaymentsStep";
import { SummaryStep } from "./steps/SummaryStep";
import { LoanWindowStep } from "./steps/LoanWindowStep";
import { CloseStep } from "./steps/CloseStep";
import { StatCard } from "@/components/ui/StatCard";

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
    meetingReport,
    showReserveModal,
    setShowReserveModal,
    reserveForm,
    setReserveForm,
    action,
    sendNotice,
    generateFines,
    markAttendance,
    saveAllAttendance,
    reviewApology,
    notifyFine,
    collect,
    openLoanWindow,
    closeLoanWindow,
    updateReservation,
    releaseReservation,
    officialReserve,
    runLoanAction,
    saveMinutes,
    publishMinutes,
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
  const canClose = canAdvanceStep("loans", m, roster, pool);

  return (
    <Card className="p-5">
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
          <Button
            size="sm"
            variant="secondary"
            icon={<FiPlay />}
            disabled={!!busy || m.status === "CLOSED"}
            onClick={() => void action(m.id, "start")}
          >
            Start
          </Button>
        </div>
      </div>

      <SegmentedTabs<MeetingStep>
        tabs={guardedTabs}
        value={step}
        onChange={setGuardedStep}
        className="mt-5"
      />

      <div className="mt-5">
        {step === "attendance" ? (
          <AttendanceStep
            meeting={m}
            roster={roster}
            busy={busy}
            attendanceDraft={attendanceDraft}
            setAttendanceDraft={setAttendanceDraft}
            onSaveRow={(memberId) => void markAttendance(m.id, memberId)}
            onSaveAll={() => void saveAllAttendance(m.id)}
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
          />
        ) : null}
        {step === "collections" ? (
          <CollectionsStep
            meeting={m}
            roster={roster}
            busy={busy}
            collectionDraft={collectionDraft}
            setCollectionDraft={setCollectionDraft}
            onPost={(memberId, type, amount, periodDate) =>
              void collect(m, memberId, { type, amount, periodDate })
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
            onPost={(memberId, loanId, amount) =>
              void collect(m, memberId, {
                type: "LOAN_REPAYMENT",
                amount,
                loanId,
              })
            }
          />
        ) : null}
        {step === "summary" ? (
          <SummaryStep collectionTotals={collectionTotals} pool={pool} />
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
            onCloseWindow={(id) => void closeLoanWindow(id)}
            onUpdateReservation={(r) => void updateReservation(r)}
            onReleaseReservation={(r) => void releaseReservation(r)}
            onOfficialReserve={() => void officialReserve()}
            onLoanAction={(loan, label, runner) =>
              void runLoanAction(loan, label, runner)
            }
          />
        ) : null}
        {step === "close" ? (
          <CloseStep
            meeting={m}
            busy={busy}
            minutesDraft={minutesDraft}
            setMinutesDraft={setMinutesDraft}
            meetingReport={meetingReport}
            onCloseMeeting={() => void action(m.id, "close")}
            onSaveMinutes={() => void saveMinutes(m)}
            onPublish={() => void publishMinutes(m.id)}
            canClose={canClose}
          />
        ) : null}
      </div>

      <StepFooter
        step={step}
        setStep={setStep}
        meeting={m}
        roster={roster}
        pool={pool}
        disabled={!!busy}
      />
    </Card>
  );
}
