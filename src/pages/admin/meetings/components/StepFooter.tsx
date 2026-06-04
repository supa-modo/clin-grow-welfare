import { Button } from '@/components/ui/Button';
import type { LoanPool, MeetingRecord, MeetingRoster, MeetingStep } from '../types';
import { advanceBlockReason, canAdvanceStep, nextStep, prevStep } from '../utils';

type Props = {
  step: MeetingStep;
  setStep: (step: MeetingStep) => void;
  meeting?: MeetingRecord | null;
  roster?: MeetingRoster | null;
  pool?: LoanPool | null;
  disabled?: boolean;
  collectionsReady?: boolean;
};

export function StepFooter({ step, setStep, meeting, roster, pool, disabled, collectionsReady }: Props) {
  const back = prevStep(step);
  const forward = nextStep(step);
  let canNext = forward ? canAdvanceStep(step, meeting, roster, pool) : false;
  let blockReason = forward ? advanceBlockReason(step, meeting, roster, pool) : null;
  if (step === 'collections' && forward) {
    if (!collectionsReady) {
      canNext = false;
      blockReason = blockReason ?? 'Collections readiness: resolve dues or apply official override.';
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-2 border-t border-ink-100 px-5 pb-5 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <Button variant="secondary" disabled={!back || disabled} onClick={() => back && setStep(back)}>Back</Button>
      <div className="flex flex-col items-end gap-1">
        {forward ? (
          <Button disabled={!canNext || disabled} onClick={() => setStep(forward)}>Next: {forward.replace(/_/g, ' ')}</Button>
        ) : (
          <span className="text-xs font-semibold text-ink-500">Final step</span>
        )}
        {forward && !canNext && blockReason ? (
          <p className="max-w-md text-right text-xs font-semibold text-amber-800">{blockReason}</p>
        ) : null}
      </div>
    </div>
  );
}
