import { Button } from "@/components/ui/Button";
import type {
  LoanPool,
  MeetingRecord,
  MeetingRoster,
  MeetingStep,
} from "../types";
import {
  advanceBlockReason,
  canAdvanceStep,
  nextStep,
  prevStep,
} from "../utils";
import { TbArrowBack, TbArrowNarrowRight } from "react-icons/tb";

type Props = {
  step: MeetingStep;
  setStep: (step: MeetingStep) => void;
  canSetStep?: (step: MeetingStep) => boolean;
  meeting?: MeetingRecord | null;
  roster?: MeetingRoster | null;
  pool?: LoanPool | null;
  disabled?: boolean;
  collectionsReady?: boolean;
  repaymentsReady?: boolean;
};

export function StepFooter({
  step,
  setStep,
  canSetStep,
  meeting,
  roster,
  pool,
  disabled,
  collectionsReady,
  repaymentsReady,
}: Props) {
  const recovery = Boolean(roster?.lendingClosed || roster?.collectionsPaused || pool?.lendingClosed)
    && !meeting?.loanWindows?.some((window) => window.status === 'OPEN');
  const back = prevStep(step, recovery);
  const forward = nextStep(step, recovery);
  let canNext = forward ? canAdvanceStep(step, meeting, roster, pool) : false;
  let blockReason = forward
    ? advanceBlockReason(step, meeting, roster, pool)
    : null;
  if (step === "collections" && forward) {
    if (!collectionsReady) {
      canNext = false;
      blockReason =
        blockReason ??
        "Collections readiness: resolve dues or apply official override.";
    }
  }
  if (step === "repayments" && forward && !repaymentsReady) {
    canNext = false;
    blockReason =
      "Confirm or waive every due rollover before completing repayments.";
  }

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <Button
        variant="secondary"
        disabled={!back || disabled}
        size="xs"
        icon={<TbArrowBack size={14} />}
        onClick={() => back && setStep(back)}
      >
        Previous
      </Button>
      <div className="flex flex-col items-end gap-1">
        {forward ? (
          <Button
            size="xs"
            icon={<TbArrowNarrowRight
               size={14} />}
            disabled={
              !canNext ||
              disabled ||
              (canSetStep ? !canSetStep(forward) : false)
            }
            onClick={() => {
              if (!forward || !canNext || disabled) return;
              if (canSetStep && !canSetStep(forward)) return;
              setStep(forward);
            }}
          >
            Next: {forward.replace(/_/g, " ")}
          </Button>
        ) : (
          <span className="text-xs font-semibold text-ink-500">Final step</span>
        )}
        {forward && !canNext && blockReason ? (
          <p className="max-w-md text-right text-xs font-semibold text-amber-800">
            {blockReason}
          </p>
        ) : null}
      </div>
    </div>
  );
}
