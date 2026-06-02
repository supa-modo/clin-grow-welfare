import { TbArrowBack, TbArrowNarrowRight } from "react-icons/tb";
import { Button } from "./Button";

export interface StepFooterProps {
  stepIndex: number;
  stepCount: number;
  isSaving?: boolean;
  onCancel: () => void;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
  canGoNext?: boolean;
  className?: string;
  nextLabel?: string;
  saveLabel?: string;
}

export function StepFooter({
  stepIndex,
  stepCount,
  isSaving,
  onCancel,
  onBack,
  onNext,
  onSave,
  canGoNext = true,
  className,
  nextLabel = "Next step",
  saveLabel = "Save",
}: StepFooterProps) {
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= stepCount - 1;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            disabled={isFirst || !!isSaving}
            icon={<TbArrowBack className="h-4 w-4" />}
          >
            Previous
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[0.8rem] font-bold text-gray-500">
            Step {Math.min(stepIndex + 1, stepCount)} of {stepCount}
          </div>
          {isLast ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onSave}
              isLoading={!!isSaving}
            >
              {saveLabel}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={onNext}
              disabled={!canGoNext || !!isSaving}
              icon={<TbArrowNarrowRight className="h-4 w-4" />}
            >
              {nextLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default StepFooter;
