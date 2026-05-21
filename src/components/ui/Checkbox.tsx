import React from "react";
import clsx from "clsx";
import { FiCheck } from "react-icons/fi";
import { FaCheck } from "react-icons/fa";

export type CheckboxProps = {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "brand" | "neutral" | "danger";
};

const sizeClasses: Record<NonNullable<CheckboxProps["size"]>, string> = {
  sm: "w-3.5 h-3.5 lg:w-4 lg:h-4",
  md: "w-[0.9rem] h-[0.9rem] lg:w-[1.1rem] lg:h-[1.1rem]",
  lg: "w-5 h-5 lg:w-6 lg:h-6",
};

const iconSize: Record<NonNullable<CheckboxProps["size"]>, number> = {
  sm: 9,
  md: 10.5,
  lg: 13,
};

const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  onChange,
  disabled = false,
  label,
  className,
  size = "md",
  variant = "brand",
}) => {
  const handleToggle = () => {
    if (disabled) return;
    onChange?.(!checked);
  };

  const activeClasses =
    variant === "danger"
      ? "bg-red-600 border-red-600"
      : variant === "neutral"
        ? "bg-ink-900 border-ink-900"
        : "bg-brand-600 border-brand-600";

  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 lg:gap-2.5 select-none",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        className,
      )}
      onClick={handleToggle}
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggle();
        }
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {}}
        disabled={disabled}
        className="sr-only"
      />
      <span
        className={clsx(
          "border rounded-[0.3rem] flex items-center justify-center transition-all duration-200",
          sizeClasses[size],
          checked ? activeClasses : `bg-white border-gray-400`,
          !disabled && "hover:shadow-sm",
        )}
      >
        {checked ? (
          <>
            <FiCheck size={iconSize[size]} className="lg:hidden text-white" />
            <FaCheck size={iconSize[size]} className="hidden lg:block text-white" />
          </>
        ) : null}
      </span>
      {label ? (
        <span className="text-xs lg:text-sm text-ink-700">{label}</span>
      ) : null}
    </div>
  );
};

export default Checkbox;
