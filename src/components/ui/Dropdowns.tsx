import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown, FiX } from "react-icons/fi";
import clsx from "clsx";
import { SearchBar } from "./SearchBar";
export type Option = { label: string; value: string; disabled?: boolean };

export function SearchableDropdown({
  label,
  options,
  value,
  onChange,
  placeholder = "Choose an option",
  disabled = false,
  clearable = false,
}: {
  label?: string;
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(
    () =>
      options.filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase()),
      ),
    [options, query],
  );

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const maxHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    const panelHeight = Math.min(maxHeight, openUp ? spaceAbove - 8 : spaceBelow - 8);

    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 10000,
      maxHeight: panelHeight,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 8 }
        : { top: rect.bottom + 8 }),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="flex flex-col overflow-hidden rounded-2xl border border-gray-300 bg-white p-2 shadow-lg"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search for an option"
            />
            <div className="mt-1 min-h-0 flex-1 overflow-auto scrollbar-thin lg:mt-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-center text-sm text-slate-500">
                  No options found
                </p>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    className={clsx(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[0.75rem] hover:bg-gray-100 md:text-[0.8rem] lg:text-[0.85rem]",
                      option.value === value && "bg-brand-50 font-semibold text-brand-700",
                      option.disabled && "cursor-not-allowed opacity-50",
                    )}
                    onClick={() => {
                      if (option.disabled) return;
                      onChange(option.value);
                      close();
                    }}
                  >
                    <span className="line-clamp-1 truncate">{option.label}</span>
                    {option.value === value ? <FiCheck size={16} /> : null}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative" ref={rootRef}>
      {label ? (
        <label className="mb-1 block pl-2 text-[0.75rem] font-medium text-ink-500 lg:text-[0.8rem]">
          {label}
        </label>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={clsx(
          "flex w-full items-center justify-between rounded-[0.6rem] border border-gray-400 bg-gray-100 p-2 px-3 py-2 text-[0.75rem] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 md:text-[0.8rem] lg:py-2.5 lg:text-sm",
          disabled && "cursor-not-allowed opacity-60",
        )}
        onClick={() => {
          if (disabled) return;
          if (open) close();
          else {
            setOpen(true);
            setQuery("");
          }
        }}
      >
        <span className={clsx(!selected && "text-slate-500")}>
          {selected?.label ?? placeholder}
        </span>
        <div className="flex items-center gap-1.5">
          {clearable && value ? (
            <span
              role="button"
              tabIndex={0}
              className="text-slate-500 hover:text-slate-800"
              aria-label="Clear selection"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
                close();
              }}
            >
              <FiX size={14} />
            </span>
          ) : null}
          <FiChevronDown
            size={16}
            className={clsx("transition-transform", open && "rotate-180")}
          />
        </div>
      </button>
      {menu}
    </div>
  );
}

export function MultiSelect({
  options,
  values,
  onChange,
}: {
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="grid gap-2 rounded-[0.6rem] border border-ink-100 bg-white p-3">
      {options.map((option) => {
        const checked = values.includes(option.value);
        return (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked}
              onChange={() =>
                onChange(
                  checked
                    ? values.filter((value) => value !== option.value)
                    : [...values, option.value],
                )
              }
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
