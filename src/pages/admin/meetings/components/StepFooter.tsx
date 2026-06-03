import { Button } from '@/components/ui/Button';
import type { LoanPool, MeetingRecord, MeetingRoster, MeetingStep } from '../types';
import { canAdvanceStep, nextStep, prevStep } from '../utils';

type Props = {
  step: MeetingStep;
  setStep: (step: MeetingStep) => void;
  meeting?: MeetingRecord | null;
  roster?: MeetingRoster | null;
  pool?: LoanPool | null;
  disabled?: boolean;
};

export function StepFooter({ step, setStep, meeting, roster, pool, disabled }: Props) {
  const back = prevStep(step);
  const forward = nextStep(step);
  const canNext = forward ? canAdvanceStep(step, meeting, roster, pool) : false;

  return (
    <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-4">
      <Button variant="secondary" disabled={!back || disabled} onClick={() => back && setStep(back)}>Back</Button>
      {forward ? (
        <Button disabled={!canNext || disabled} onClick={() => setStep(forward)}>Next: {forward.replace(/_/g, ' ')}</Button>
      ) : (
        <span className="text-xs font-semibold text-ink-500">Final step</span>
      )}
    </div>
  );
}
