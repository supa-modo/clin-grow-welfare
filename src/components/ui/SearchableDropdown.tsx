import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { FiChevronDown, FiX } from 'react-icons/fi';
import { SearchBar } from './SearchBar';
export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type SearchableDropdownProps = {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  clearable?: boolean;
  wrapperClassName?: string;
  onSearchChange?: (query: string) => void;
  searchDebounceMs?: number;
};

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  error,
  disabled = false,
  clearable = false,
  wrapperClassName,
  onSearchChange,
  searchDebounceMs = 300,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase())), [options, search]);

  useEffect(() => {
    if (!open) return;
    if (!onSearchChange) return;
    const t = window.setTimeout(() => onSearchChange(search), searchDebounceMs);
    return () => window.clearTimeout(t);
  }, [open, search, onSearchChange, searchDebounceMs]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={clsx('w-full', wrapperClassName)} ref={containerRef}>
      {label ? <label className="block text-sm font-medium text-ink-700 mb-1 pl-0.5">{label}</label> : null}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={clsx(
            "w-full flex items-center justify-between px-4 py-2 lg:py-[0.6rem] rounded-[0.6rem] border transition-all duration-200 text-xs lg:text-sm",
            "focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500",
            "disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-ink-500",
            "placeholder:text-ink-300 placeholder:font-normal truncate ",
            "disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-ink-500",
            error ? "border-red-400 bg-red-50 text-red-900 placeholder:text-red-400" : "border-gray-400/70 bg-gray-100 text-ink-900",
          )}
        >
          <span className={clsx(!selected && 'text-ink-500')}>{selected ? selected.label : placeholder}</span>
          <div className="flex items-center gap-2">
            {clearable && value ? (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="text-ink-500 hover:text-ink-700 cursor-pointer"
                aria-label="Clear selection"
              >
                <FiX className="w-4 h-4" />
              </span>
            ) : null}
            <FiChevronDown className={clsx('w-4 h-4 text-ink-500 transition-transform', open && 'rotate-180')} />
          </div>
        </button>

        {open ? (
          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-panel overflow-hidden">
            <div className="p-2 border-b border-ink-100">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search..."
              />
             
            </div>
            <ul className="max-h-56 overflow-y-auto scrollbar-kanban py-1">
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-sm text-ink-500 text-center">No options found</li>
              ) : (
                filtered.map((opt) => (
                  <li
                    key={opt.value}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value);
                        setOpen(false);
                        setSearch('');
                      }
                    }}
                    className={clsx(
                      'px-4 py-2 text-sm cursor-pointer transition-colors',
                      opt.value === value ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-700 hover:bg-gray-100',
                      opt.disabled && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {opt.label}
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-1.5 text-sm text-red-700 font-medium">{error}</p> : null}
    </div>
  );
};

export default SearchableDropdown;
