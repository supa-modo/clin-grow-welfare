import React, { forwardRef } from "react";
import clsx from "clsx";
import { Link } from "react-router-dom";
type RightLabelLink = {
  text: string;
  href: string;
};

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  labelClassName?: string;
  rightLabelLink?: RightLabelLink;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClickRightIcon?: () => void;
  OnClickRightIcon?: () => void;
  rightIconAriaLabel?: string;
  helperText?: string;
  description?: string;
  wrapperClassName?: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      rightLabelLink,
      labelClassName,
      error,
      leftIcon,
      rightIcon,
      onClickRightIcon,
      OnClickRightIcon,
      rightIconAriaLabel = "Input action",
      helperText,
      description,
      className,
      wrapperClassName,
      ...props
    },
    ref,
  ) => {
    return (
      <div className={clsx("w-full", wrapperClassName)}>
        {label ? (
          <div className="flex items-center justify-between">
            <label
              className={clsx(
                "block text-[0.65rem] lg:text-[0.8rem] font-medium text-ink-500 mb-1 pl-2",
                labelClassName,
              )}
            >
              {label}
              {props.required ? (
                <span className="text-red-600 ml-1">*</span>
              ) : null}
            </label>

            {rightLabelLink ? (
              <Link
                to={rightLabelLink.href}
                className="text-[0.65rem] lg:text-[0.83rem] font-semibold pr-0.5 text-brand-700 hover:text-brand-600 transition-colors"
              >
                {rightLabelLink.text}
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="relative">
          {leftIcon ? (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-500">
              {leftIcon}
            </div>
          ) : null}

          <input
            ref={ref}
            className={clsx(
              "w-full px-4 py-2 lg:py-[0.6rem] rounded-[0.6rem] border transition-all duration-200 text-xs lg:text-sm",
              "focus:outline-none focus:ring-1 focus:ring-primary-600 focus:border-primary-600",
              "disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-ink-500",
              "placeholder:text-ink-300 placeholder:font-normal",
              leftIcon && "pl-11",
              rightIcon && "pr-11",
              error
                ? "border-red-400 bg-red-50 text-red-900 placeholder:text-red-400"
                : "border-gray-400/70 bg-gray-100 text-ink-900",
              className,
            )}
            {...props}
          />

          {rightIcon ? (
            <button
              type="button"
              onClick={onClickRightIcon ?? OnClickRightIcon}
              className="absolute inset-y-0 right-0 pr-3.5 md:pr-4 lg:pr-5 flex items-center text-ink-500 hover:text-ink-700"
              aria-label={rightIconAriaLabel}
            >
              {rightIcon}
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="mt-1.5 text-[0.6rem] lg:text-xs pl-2 text-red-600 font-medium">
            {error}
          </p>
        ) : null}
        {!error && helperText ? (
          <p className="mt-1.5 text-sm text-ink-500">{helperText}</p>
        ) : null}
        {!error && !helperText && description ? (
          <p className="mt-1.5 text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
