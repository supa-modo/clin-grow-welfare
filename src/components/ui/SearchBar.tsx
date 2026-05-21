import {
  forwardRef,
  type FocusEventHandler,
  type KeyboardEventHandler,
} from "react";
import { FiSearch, FiX } from "react-icons/fi";
import clsx from "clsx";

export type SearchBarProps = {
  value: string;
  /** Called with the updated string on each keystroke. */
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  autoComplete?: string;
  "aria-label"?: string;
  /** When true with `attachDropdown`, the input uses top-only rounding to meet a panel below (Header search). */
  dropdownOpen?: boolean;
  /** Enables Header-style `rounded-t-xl` when `dropdownOpen` is true; otherwise the field stays fully rounded. */
  attachDropdown?: boolean;
  /** Applied to the outer wrapper (default includes `relative max-w-2xl`). */
  wrapperClassName?: string;
  inputClassName?: string;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  /** Full reset when clear is pressed; defaults to `onChange('')`. */
  onClear?: () => void;
  clearAriaLabel?: string;
};

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar(
    {
      value,
      onChange,
      placeholder = "Search...",
      disabled,
      id,
      name,
      autoComplete,
      "aria-label": ariaLabel,
      dropdownOpen = false,
      attachDropdown = false,
      wrapperClassName,
      inputClassName,
      onFocus,
      onBlur,
      onKeyDown,
      onClear,
      clearAriaLabel = "Clear search",
    },
    ref,
  ) {
    const rounded =
      attachDropdown && dropdownOpen ? "rounded-t-xl" : "rounded-xl";

    function handleClear() {
      if (onClear) onClear();
      else onChange("");
    }

    return (
      <div className={clsx("relative max-w-2xl px-0.5", wrapperClassName)}>
        <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
        <input
          ref={ref}
          id={id}
          type="text"
          name={name}
          value={value}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-label={ariaLabel}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={clsx(
            "w-full border border-gray-400 bg-white py-2 pl-9 pr-10 text-[0.78rem] md:text-[0.8rem] lg:text-sm font-medium text-ink-700 outline-none transition placeholder:text-ink-400 focus:border-brand-600 focus:ring-1 focus:ring-brand-600",
            rounded,
            inputClassName,
          )}
        />
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
            aria-label={clearAriaLabel}
          >
            <FiX className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    );
  },
);

SearchBar.displayName = "SearchBar";
