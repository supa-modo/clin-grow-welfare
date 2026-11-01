import React, {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { PiCaretDownFill } from "react-icons/pi";

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

interface MenuBox {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

type TrackedSelect = HTMLSelectElement & {
  _valueTracker?: { setValue: (value: string) => void };
};

function optionLabel(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(optionLabel).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return optionLabel(node.props.children);
  }
  return "";
}

function collectOptions(
  children: React.ReactNode,
  into: SelectOption[] = [],
): SelectOption[] {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === React.Fragment) {
      const fragmentProps = child.props as { children?: React.ReactNode };
      collectOptions(fragmentProps.children, into);
      return;
    }
    if (child.type !== "option") return;
    const optionProps = child.props as {
      value?: string | number;
      disabled?: boolean;
      children?: React.ReactNode;
    };
    const label = optionLabel(optionProps.children).trim();
    const value = optionProps.value != null ? String(optionProps.value) : label;
    into.push({
      value,
      label: label || value,
      disabled: Boolean(optionProps.disabled),
    });
  });
  return into;
}

function initialUncontrolled(
  defaultValue: SelectProps["defaultValue"],
): string {
  if (Array.isArray(defaultValue)) return String(defaultValue[0] ?? "");
  if (defaultValue == null) return "";
  return String(defaultValue);
}

function measureMenu(element: HTMLElement): MenuBox {
  const rect = element.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - 8;
  return {
    top: rect.bottom - 1,
    left: rect.left,
    width: rect.width,
    maxHeight: Math.max(120, Math.min(224, spaceBelow)),
  };
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      labelClassName,
      error,
      helperText,
      options,
      placeholder = "Select ...",
      children,
      className,
      wrapperClassName,
      leftIcon,
      variant = "primary",
      id,
      value,
      defaultValue,
      onChange,
      onBlur,
      onInvalid,
      disabled,
      required,
      name,
      autoFocus,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const listId = `${selectId}-listbox`;
    const isControlled = value !== undefined;
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [menuBox, setMenuBox] = useState<MenuBox | null>(null);
    const [nativeMessage, setNativeMessage] = useState<string | null>(null);
    const [uncontrolledValue, setUncontrolledValue] = useState(() =>
      initialUncontrolled(defaultValue),
    );
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const selectRef = useRef<HTMLSelectElement>(null);

    const listOptions = useMemo(() => {
      const fromProp = options ?? [];
      const fromChildren = collectOptions(children);
      return [...fromProp, ...fromChildren].filter(
        (option) => !(placeholder && option.value === "" && option.disabled),
      );
    }, [options, children, placeholder]);

    const currentValue = isControlled ? String(value ?? "") : uncontrolledValue;
    const selected = listOptions.find(
      (option) => option.value === currentValue,
    );
    const showPlaceholder = Boolean(placeholder) && currentValue === "";
    const displayText = showPlaceholder
      ? placeholder
      : (selected?.label ?? currentValue);

    const accentBorder = error
      ? "border-red-500"
      : variant === "secondary"
        ? "border-secondary-600"
        : "border-gray-300";

    const assignRef = (node: HTMLSelectElement | null) => {
      selectRef.current = node;
      if (node) {
        Object.defineProperty(node, "focus", {
          configurable: true,
          value: (options?: FocusOptions) => {
            buttonRef.current?.focus(options);
          },
        });
      }
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
      if (node && !isControlled) setUncontrolledValue(node.value);
    };

    const commit = (next: string) => {
      const element = selectRef.current;
      if (!element) return;
      const prototype = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      );
      const tracked = element as TrackedSelect;
      tracked._valueTracker?.setValue(element.value);
      if (prototype?.set) prototype.set.call(element, next);
      else element.value = next;
      if (!isControlled) setUncontrolledValue(next);
      setNativeMessage(null);
      element.dispatchEvent(new Event("change", { bubbles: true }));
      setOpen(false);
    };

    const openMenu = () => {
      if (disabled) return;
      const selectedIndex = listOptions.findIndex(
        (option) => option.value === currentValue && !option.disabled,
      );
      const firstEnabled = listOptions.findIndex((option) => !option.disabled);
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled);
      if (buttonRef.current) setMenuBox(measureMenu(buttonRef.current));
      setOpen(true);
    };

    const moveActive = (delta: number) => {
      const enabled = listOptions
        .map((option, index) => (option.disabled ? -1 : index))
        .filter((index) => index >= 0);
      if (enabled.length === 0) return;
      setActiveIndex((current) => {
        const position = enabled.indexOf(current);
        const next =
          position === -1
            ? delta > 0
              ? enabled[0]
              : enabled[enabled.length - 1]
            : enabled[(position + delta + enabled.length) % enabled.length];
        return next ?? enabled[0] ?? -1;
      });
    };

    useLayoutEffect(() => {
      if (!open) return;
      const update = () => {
        if (buttonRef.current) setMenuBox(measureMenu(buttonRef.current));
      };
      update();
      window.addEventListener("resize", update);
      window.addEventListener("scroll", update, true);
      return () => {
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", update, true);
      };
    }, [open]);

    useEffect(() => {
      if (!open) return;
      const onPointerDown = (event: MouseEvent) => {
        const target = event.target as Node;
        if (containerRef.current?.contains(target)) return;
        if (menuRef.current?.contains(target)) return;
        setOpen(false);
      };
      document.addEventListener("mousedown", onPointerDown);
      return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open]);

    useEffect(() => {
      if (!open || activeIndex < 0) return;
      document
        .getElementById(`${selectId}-opt-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
    }, [open, activeIndex, selectId]);

    useEffect(() => {
      if (autoFocus) buttonRef.current?.focus();
    }, [autoFocus]);

    const menu =
      open && menuBox
        ? createPortal(
            <div
              ref={menuRef}
              id={listId}
              role="listbox"
              aria-label={props["aria-label"] ?? label ?? placeholder}
              style={{
                position: "fixed",
                top: menuBox.top,
                left: menuBox.left,
                width: menuBox.width,
                zIndex: 1200,
              }}
              className={clsx(
                "overflow-hidden rounded-b-2xl border border-t-0 bg-white shadow-panel",
                accentBorder,
              )}
            >
              <ul
                className="scrollbar-kanban overflow-y-auto py-1"
                style={{ maxHeight: menuBox.maxHeight }}
              >
                {listOptions.length === 0 ? (
                  <li className="px-4 py-3 text-center text-sm text-ink-500">
                    No options
                  </li>
                ) : (
                  listOptions.map((option, index) => (
                    <li
                      key={`${option.value}-${index}`}
                      id={`${selectId}-opt-${index}`}
                      role="option"
                      aria-selected={option.value === currentValue}
                      aria-disabled={option.disabled}
                      onMouseEnter={() => {
                        if (!option.disabled) setActiveIndex(index);
                      }}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        if (!option.disabled) commit(option.value);
                      }}
                      className={clsx(
                        "cursor-pointer px-4 py-2 text-[0.75rem] transition-colors md:text-[0.8rem] lg:text-sm",
                        option.value === currentValue
                          ? "bg-gray-300 font-bold text-gray-800"
                          : index === activeIndex
                            ? "bg-gray-200 text-ink-700"
                            : "text-ink-700 hover:bg-gray-200",
                        option.disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {option.label}
                    </li>
                  ))
                )}
              </ul>
            </div>,
            document.body,
          )
        : null;

    return (
      <div className={clsx("w-full", wrapperClassName)} ref={containerRef}>
        {label && (
          <label
            htmlFor={selectId}
            className={clsx(
              "mb-1 block pl-2 text-[0.65rem] font-medium text-ink-500 lg:text-[0.8rem]",
              labelClassName,
            )}
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
              {leftIcon}
            </div>
          )}
          <button
            id={selectId}
            ref={buttonRef}
            type="button"
            aria-label={props["aria-label"] ?? label}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-invalid={Boolean(error || nativeMessage)}
            aria-required={required}
            aria-activedescendant={
              open && activeIndex >= 0
                ? `${selectId}-opt-${activeIndex}`
                : undefined
            }
            onClick={() => {
              if (disabled) return;
              if (open) setOpen(false);
              else openMenu();
            }}
            onBlur={(event) => {
              const next = event.relatedTarget;
              if (next instanceof Node && menuRef.current?.contains(next)) {
                return;
              }
              setOpen(false);
              selectRef.current?.dispatchEvent(
                new FocusEvent("focusout", { bubbles: true }),
              );
            }}
            onKeyDown={(event) => {
              if (disabled) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                if (!open) openMenu();
                else moveActive(1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                if (!open) openMenu();
                else moveActive(-1);
              } else if (event.key === "Home") {
                event.preventDefault();
                if (!open) openMenu();
                const first = listOptions.findIndex(
                  (option) => !option.disabled,
                );
                setActiveIndex(first);
              } else if (event.key === "End") {
                event.preventDefault();
                if (!open) openMenu();
                let last = -1;
                for (
                  let index = listOptions.length - 1;
                  index >= 0;
                  index -= 1
                ) {
                  if (!listOptions[index]?.disabled) {
                    last = index;
                    break;
                  }
                }
                setActiveIndex(last);
              } else if (event.key === "Enter" || event.key === " ") {
                if (!open) {
                  event.preventDefault();
                  openMenu();
                  return;
                }
                event.preventDefault();
                const option = listOptions[activeIndex];
                if (option && !option.disabled) commit(option.value);
              } else if (event.key === "Escape" || event.key === "Tab") {
                setOpen(false);
              }
            }}
            className={clsx(
              "flex w-full items-center border px-4 py-[0.4rem] pr-10 text-left text-[0.75rem] transition-all duration-200 md:text-[0.8rem] lg:py-2 lg:text-sm",
              "focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500",
              open ? "rounded-t-[0.6rem] rounded-b-none" : "rounded-[0.6rem]",
              leftIcon && "pl-11",
              variant !== "primary" && "text-gray-700",
              error
                ? "border-red-500 bg-red-50 text-red-900"
                : open
                  ? accentBorder
                  : variant === "primary"
                    ? "border-gray-300"
                    : "border-gray-400/60",
              !open &&
                !error &&
                (variant === "secondary"
                  ? "focus:border-secondary-600 focus:ring-1 focus:ring-secondary-600"
                  : "focus:border-gray-600 focus:ring-1 focus:ring-gray-600"),
              !open && error && "focus:ring-1 focus:ring-red-500/30",
              open && "focus:ring-0",
              className,
            )}
          >
            <span
              className={clsx(
                "min-w-0 flex-1 truncate",
                showPlaceholder && "text-gray-400",
              )}
            >
              {displayText}
            </span>
          </button>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-500">
            <PiCaretDownFill
              className={clsx(
                "h-4 w-4 transition-transform",
                open && "rotate-180",
              )}
            />
          </div>
          <select
            {...props}
            ref={assignRef}
            id={`${selectId}-value`}
            name={name}
            required={required}
            disabled={disabled}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            value={isControlled ? currentValue : undefined}
            defaultValue={isControlled ? undefined : defaultValue}
            onChange={(event) => {
              if (!isControlled) setUncontrolledValue(event.target.value);
              setNativeMessage(null);
              onChange?.(event);
            }}
            onBlur={onBlur}
            onInvalid={(event) => {
              event.preventDefault();
              setNativeMessage(event.currentTarget.validationMessage);
              buttonRef.current?.focus();
              onInvalid?.(event);
            }}
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
        </div>
        {menu}
        {(error || nativeMessage) && (
          <p className="mt-1.5 text-sm font-medium text-red-600">
            {error || nativeMessage}
          </p>
        )}
        {helperText && !error && !nativeMessage && (
          <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;
