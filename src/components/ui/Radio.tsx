import React, { useId } from "react";
import clsx from "clsx";

export type RadioSize = "sm" | "md" | "lg";
export type RadioVariant = "brand" | "neutral" | "danger" | "white";

export type RadioOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type RadioProps = {
  name: string;
  value: string;
  label?: string;
  description?: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (value: string) => void;
  size?: RadioSize;
  variant?: RadioVariant;
  className?: string;
};

const outerSizeClasses: Record<RadioSize, string> = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4 lg:w-[1.125rem] lg:h-[1.125rem]",
  lg: "w-5 h-5 lg:w-6 lg:h-6",
};

const innerDotSizeClasses: Record<RadioSize, string> = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2 lg:w-2.5 lg:h-2.5",
  lg: "w-2 h-2 lg:w-2.5 lg:h-2.5",
};

const variantActiveClasses: Record<RadioVariant, string> = {
  brand: "border-primary-500 bg-primary-500",
  neutral: "border-ink-900 bg-ink-900",
  danger: "border-red-600 bg-red-600",
  white: "border-primary-500 bg-white",
};

const variantFocusRingClasses: Record<RadioVariant, string> = {
  brand: "peer-focus-visible:ring-primary-500/40",
  neutral: "peer-focus-visible:ring-ink-700/40",
  danger: "peer-focus-visible:ring-red-500/40",
  white: "peer-focus-visible:ring-white",
};

export const Radio: React.FC<RadioProps> = ({
  name,
  value,
  label,
  description,
  checked = false,
  disabled = false,
  onChange,
  size = "md",
  variant = "brand",
  className,
}) => {
  const inputId = useId();
  const selectOption = () => {
    if (!disabled && !checked) onChange?.(value);
  };

  return (
    <label
      htmlFor={inputId}
      onMouseDown={(event) => {
        event.preventDefault();
        selectOption();
      }}
      onClick={selectOption}
      className={clsx(
        "inline-flex items-center gap-2 select-none leading-none",
        description ? "items-start" : "items-center",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        className,
      )}
    >
      <input
        id={inputId}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange?.(value)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={clsx(
          "relative inline-flex shrink-0 items-center justify-center rounded-full border transition-all duration-200",
          description ? "mt-[1px]" : "",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2",
          variantFocusRingClasses[variant],
          outerSizeClasses[size],
          checked ? variantActiveClasses[variant] : "border-gray-400 bg-white",
          !disabled && "hover:shadow-sm",
        )}
      >
        {checked ? (
          <span
            className={clsx(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500",
              innerDotSizeClasses[size],
            )}
          />
        ) : null}
      </span>
      {label || description ? (
        <span className="flex flex-col leading-tight">
          {label ? (
            <span className="text-[0.7rem] md:text-xs lg:text-sm font-medium text-ink-700">
              {label}
            </span>
          ) : null}
          {description ? (
            <span className="mt-0.5 text-[0.65rem] lg:text-xs font-medium text-ink-500">
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
};

export type RadioGroupProps<T extends string = string> = {
  name: string;
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<RadioOption<T>>;
  orientation?: "row" | "column";
  size?: RadioSize;
  variant?: RadioVariant;
  disabled?: boolean;
  className?: string;
  groupClassName?: string;
  labelClassName?: string;
  ariaLabel?: string;
  helperText?: string;
  error?: string;
};

export function RadioGroup<T extends string = string>({
  name,
  label,
  value,
  onChange,
  options,
  orientation = "row",
  size = "md",
  variant = "brand",
  disabled = false,
  className,
  groupClassName,
  labelClassName,
  ariaLabel,
  helperText,
  error,
}: RadioGroupProps<T>) {
  return (
    <div className={className}>
      {label ? (
        <p
          className={clsx(
            "pl-1 block text-[0.78rem] md:text-sm font-semibold text-ink-700 mb-2",
            labelClassName,
          )}
        >
          {label}
        </p>
      ) : null}
      <div
        role="radiogroup"
        aria-label={ariaLabel ?? label}
        className={clsx(
          orientation === "row"
            ? "flex flex-wrap items-start gap-x-4 md:gap-x-5 gap-y-2 pl-1"
            : "flex flex-col gap-2 pl-1",
          groupClassName,
        )}
      >
        {options.map((opt) => (
          <Radio
            key={opt.value}
            name={name}
            value={opt.value}
            label={opt.label}
            description={opt.description}
            checked={value === opt.value}
            disabled={disabled || opt.disabled}
            onChange={(next) => onChange(next as T)}
            size={size}
            variant={variant}
          />
        ))}
      </div>
      {helperText && !error ? (
        <p className="mt-1.5 pl-1 text-[0.65rem] lg:text-xs text-ink-500">
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p
          className="mt-1.5 pl-1 text-[0.65rem] lg:text-xs font-semibold text-red-600"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default Radio;
