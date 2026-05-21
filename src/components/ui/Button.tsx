import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "ghost"
    | "outline"
    | "secondary2";
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
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
  children,
  isLoading = false,
  loadingText = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 text-[0.7rem] md:text-xs lg:text-sm font-semibold transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" && "px-6 lg:px-5 ",
        size === "md" && " px-6 ",
        size === "lg" && " px-6 ",
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
          "bg-brand-700 text-white hover:bg-brand-600 border border-brand-600",
        variant === "secondary" &&
          "border border-gray-400 bg-white text-ink-900 hover:bg-ink-100",
        variant === "secondary2" &&
          "border border-secondary-600 bg-white text-secondary-600 hover:bg-secondary-100",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        variant === "ghost" && "text-ink-700 hover:bg-ink-100",
        variant === "outline" &&
          "border-2 border-brand-500 bg-white text-brand-500 hover:bg-brand-100",
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2.5">
          <span
            className="w-4 h-4 rounded-full border-b-2 border-white block"
            style={{ animation: "spin 0.9s linear infinite" }}
          />
          {loadingText}
        </span>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}
