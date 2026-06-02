import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RiMoreFill } from 'react-icons/ri';
import clsx from 'clsx';
export interface RowActionItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  disabledReason?: string;
}

export interface RowActionsMenuProps {
  items: RowActionItem[];
  ariaLabel?: string;
  triggerClassName?: string;
}

const MENU_WIDTH = 192;
const MARGIN = 8;

export function RowActionsMenu({ items, ariaLabel = 'Row actions', triggerClassName }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.getBoundingClientRect().height ?? 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeBelow = spaceBelow >= menuHeight + MARGIN;
    const top = placeBelow ? rect.bottom + MARGIN : rect.top - menuHeight - MARGIN;
    let left = rect.right - MENU_WIDTH;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - MENU_WIDTH - MARGIN));
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
          'flex h-7 w-9 items-center justify-center rounded-lg border border-ink-200/80 text-ink-500 transition-colors hover:border-ink-300 hover:bg-ink-50 hover:text-ink-800',
          triggerClassName
        )}
      >
        <RiMoreFill className="h-5 w-5" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              zIndex: 10050
            }}
            className="min-w-48 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-panel"
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
                  'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-50',
                  item.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-ink-700 hover:bg-ink-50 hover:text-ink-900'
                )}
              >
                {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
