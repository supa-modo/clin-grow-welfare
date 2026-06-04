import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { Spinner } from "./Feedback";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "ghost"
    | "outline"
    | "secondary2"
    | "red";
  icon?: ReactNode;
  size?: "xxs" | "xs" | "sm" | "md" | "lg";
  rounded?: "full" | "lg" | "md" | "sm" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  isLoading?: boolean;
  loadingText?: string;
};

export function Button({
  className,
  variant = "primary",
  icon,
  size = "md",
  rounded = "lg",
  isLoading = false,
  loadingText,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 hover:cursor-pointer font-semibold transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        size === "xxs" &&
          "min-h-5 lg:min-h-6 px-4 text-[0.6rem] md:text-xs lg:text-[0.75rem]",
        size === "xs" &&
          "min-h-6 lg:min-h-7 px-5 text-[0.65rem] md:text-xs lg:text-[0.75rem]",
        size === "sm" &&
          "min-h-8 lg:min-h-9 px-6 text-[0.7rem] md:text-xs lg:text-[0.85rem]",
        size === "md" &&
          "min-h-9 lg:min-h-10 px-6 text-[0.7rem] md:text-xs lg:text-[0.85rem]",
        size === "lg" &&
          "minh-10 lg:min-h-11 px-6 text-[0.7rem] md:text-xs lg:text-[0.85rem]",
        rounded === "full" && "rounded-full",
        rounded === "lg" && "rounded-lg",
        rounded === "md" && "rounded-md",
        rounded === "sm" && "rounded-sm",
        rounded === "xl" && "rounded-xl",
        rounded === "2xl" && "rounded-2xl",
        rounded === "3xl" && "rounded-3xl",
        rounded === "4xl" && "rounded-4xl",
        rounded === "5xl" && "rounded-5xl",
        variant === "primary" &&
          "bg-primary-700 text-white hover:bg-primary-600 border border-primary-600",
        variant === "secondary" &&
          "border border-gray-400 bg-white text-ink-900 hover:bg-ink-100",
        variant === "red" &&
          "border border-red-600 bg-red-600 text-white hover:bg-red-700",
        variant === "secondary2" &&
          "border border-secondary-600 bg-white text-secondary-600 hover:bg-secondary-100",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        variant === "ghost" && "text-ink-700 hover:bg-ink-100",
        variant === "outline" &&
          "border-2 border-gray-500 bg-white text-gray-600 hover:bg-gray-100",
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Spinner /> : icon}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
}
