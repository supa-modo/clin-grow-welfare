import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RiMoreFill } from "react-icons/ri";
import clsx from "clsx";

export interface RowActionItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  disabledReason?: string;
  size?: "sm" | "md" | "lg";
  buttonClassName?: string;
}

export interface RowActionsMenuProps {
  items: RowActionItem[];
  /** Accessible label for the trigger */
  ariaLabel?: string;
  /** Optional trigger button class override */
  triggerClassName?: string;
  size?: "sm" | "md" | "lg";
}

const MENU_WIDTH = 192;
const MARGIN = 8;

export function RowActionsMenu({
  items,
  ariaLabel = "Row actions",
  triggerClassName,
  size = "sm",
}: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.getBoundingClientRect().height ?? 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeBelow = spaceBelow >= menuHeight + MARGIN;
    const top = placeBelow
      ? rect.bottom + MARGIN
      : rect.top - menuHeight - MARGIN;
    let left = rect.right - MENU_WIDTH;
    left = Math.max(
      MARGIN,
      Math.min(left, window.innerWidth - MENU_WIDTH - MARGIN),
    );
    setPosition({ top, left });
  }, [open]);

  return (
    <div className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        ref={buttonRef}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={clsx(
          "flex items-center justify-center hover:cursor-pointer rounded-lg text-gray-500 hover:text-gray-700 border border-gray-300 hover:bg-gray-100 transition-colors",
          size === "sm" && "w-7 h-[1.6rem]",
          size === "md" && "w-8 h-8",
          size === "lg" && "w-9 h-9",
          triggerClassName,
        )}
      >
        <RiMoreFill
          className={clsx(
            size === "sm" && "w-5 h-5",
            size === "md" && "w-5 h-5",
            size === "lg" && "w-6 h-6",
          )}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              zIndex: 10050,
            }}
            className="min-w-48 bg-white rounded-xl border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden p-1"
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                title={item.disabled ? item.disabledReason : undefined}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!item.disabled) {
                    item.onClick();
                    setOpen(false);
                  }
                }}
                className={clsx(
                  "w-full rounded-[0.6rem] flex items-center gap-2.5 px-4 py-1.5 text-sm text-left transition-colors disabled:opacity-50 disabled:pointer-events-none",
                  item.variant === "danger"
                    ? "text-red-600 hover:bg-red-100"
                    : "text-gray-700 hover:bg-gray-200/80 hover:text-gray-900",
                  item.buttonClassName,
                )}
              >
                {item.icon ? (
                  <span className="shrink-0">{item.icon}</span>
                ) : null}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
