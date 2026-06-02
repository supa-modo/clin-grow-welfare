import React from "react";
import { clsx } from "clsx";
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "small" | "default" | "large";
  variant?: "default" | "success" | "warning" | "danger" | "secondary" | "primary";
  className?: string;
  title?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = "default",
  variant = "default",
  className = "",
  title = "",
}) => {
  const sizeClasses = {
    small: "h-4 w-7",
    default: "h-[1.35rem] w-[2.3rem]",
    large: "h-6 w-11",
  };

  const thumbSizeClasses = {
    small: "h-3.5 w-3.5",
    default: "h-4 w-4",
    large: "h-5 w-5",
  };

  const translateClasses = {
    small: checked ? "translate-x-4" : "translate-x-0.5",
    default: checked ? "translate-x-[1.1rem]" : "translate-x-1",
    large: checked ? "translate-x-[1.35rem]" : "translate-x-0.5",
  };

  const variantClasses = {
    default: checked
      ? "bg-gradient-to-r from-green-600 to-green-700 shadow-lg shadow-green-500/25"
      : "bg-gray-300 hover:bg-gray-400",
    success: checked
      ? "bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg shadow-green-500/25"
      : "bg-gray-300 hover:bg-gray-400",
    warning: checked
      ? "bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25"
      : "bg-gray-300 hover:bg-gray-400",
    danger: checked
      ? "bg-gradient-to-r from-red-500 to-pink-600 shadow-lg shadow-red-500/25"
      : "bg-gray-300 hover:bg-gray-400",
    secondary: checked
      ? "bg-gradient-to-r from-secondary-500 to-secondary-600 shadow-lg shadow-secondary-600/25"
      : "bg-gray-300 hover:bg-gray-400",
    primary: checked
      ? "bg-gradient-to-r from-primary-400 to-primary-500 shadow-lg shadow-primary-500/25"
      : "bg-gray-300 hover:bg-gray-400",
  };

  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={clsx(
        "relative inline-flex items-center rounded-full transition-all duration-300",
        sizeClasses[size],
        variantClasses[variant],
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className
      )}
      title={title}
      type="button"
    >
      <span
        className={clsx(
          "inline-block rounded-full bg-white shadow-lg transition-all duration-300",
          thumbSizeClasses[size],
          translateClasses[size]
        )}
      />
    </button>
  );
};

export default ToggleSwitch;
