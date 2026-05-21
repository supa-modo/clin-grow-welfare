import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { FiCalendar } from "react-icons/fi";

interface DateInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
  labelClassName?: string;
  error?: string;
  helperText?: string;
  wrapperClassName?: string;
}

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      label,
      labelClassName,
      error,
      helperText,
      className,
      wrapperClassName,
      ...props
    },
    ref,
  ) => {
    return (
      <div className={clsx("w-full", wrapperClassName)}>
        {label && (
          <label
            className={clsx(
              "block text-sm pl-1.5 text-gray-700  mb-1",
              labelClassName,
            )}
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type="date"
            placeholder="dd/mm/yyyy"
            className={clsx(
              "w-full px-4 py-2.5 rounded-[0.6rem] border transition-all duration-200 text-[0.75rem] md:text-[0.8rem] lg:text-sm",
              "focus:outline-none focus:ring-1",
              "disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500",
              "pr-12",
              error
                ? "border-red-500 focus:ring-red-500/30 bg-red-50 text-red-900 placeholder:text-red-300"
                : "border-gray-300 focus:border-primary-600 focus:ring-primary-600 bg-gray-100",
              className,
            )}
            {...props}
          />
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
            <FiCalendar className="w-5 h-5" />
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

DateInput.displayName = "DateInput";

export default DateInput;
