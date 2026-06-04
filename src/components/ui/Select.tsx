import React, { forwardRef } from "react";
import { clsx } from "clsx";
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  labelClassName?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  placeholder?: string;
  wrapperClassName?: string;
  leftIcon?: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      labelClassName,
      error,
      helperText,
      options,
      placeholder,
      children,
      className,
      wrapperClassName,
      leftIcon,
      variant = "secondary",
      ...props
    },
    ref,
  ) => {
    return (
      <div className={clsx("w-full", wrapperClassName)}>
        {label && (
          <label
            className={clsx(
              "block text-[0.65rem] lg:text-[0.8rem] font-medium text-ink-500 mb-1 pl-2",
              labelClassName,
            )}
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}
          <select
            ref={ref}
            className={clsx(
              variant === "primary"
                ? "w-full px-4 py-2 border transition-all duration-200 "
                : variant === "secondary"
                  ? "w-full px-4 py-2 text-gray-700 border border-gray-400/60 rounded-[0.6rem]  focus:outline-none focus:ring-1 focus:ring-secondary-600 focus:border-secondary-600"
                  : "w-full px-4 py-2 text-gray-700 border border-gray-400/60 rounded-[0.6rem]  focus:outline-none focus:ring-1 focus:ring-primary-600 focus:border-primary-600",
              variant === "primary"
                ? "focus:outline-none focus:ring-1 bg-gray-100"
                : variant === "secondary"
                  ? "focus:outline-none focus:ring-1 "
                  : "focus:outline-none focus:ring-1 ",
              "rounded-[0.6rem] text-[0.75rem] md:text-[0.8rem] lg:text-sm",
              "disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500",
              "appearance-none bg-gray-100/80",
              leftIcon && "pl-11",
              error
                ? "border-red-500 focus:ring-red-500/30 bg-red-50 text-red-900"
                : variant === "primary"
                  ? "border-gray-300 focus:border-primary-600 focus:ring-primary-600"
                  : "border-gray-400 focus:border-secondary-600 focus:ring-secondary-600",
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options?.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
            {children}
          </select>
          {/* Dropdown arrow icon */}
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-600 font-medium">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;
