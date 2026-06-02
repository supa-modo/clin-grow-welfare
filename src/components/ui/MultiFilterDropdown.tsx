import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { FiChevronDown, FiFilter, FiX } from 'react-icons/fi';
export type MultiFilterValue = Record<string, string[]>;

export type MultiFilterOption = {
  value: string;
  label: string;
};

export type MultiFilterSection = {
  id: string;
  title: string;
  options: MultiFilterOption[];
  allowMultiple?: boolean;
};

export type MultiFilterDropdownProps = {
  value: MultiFilterValue;
  onChange: (next: MultiFilterValue) => void;
  sections: MultiFilterSection[];
  buttonLabel?: string;
  title?: string;
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
};

function countActive(value: MultiFilterValue): number {
  return Object.values(value).reduce((sum, arr) => sum + (arr?.length ?? 0), 0);
}

export default function MultiFilterDropdown({
  value,
  onChange,
  sections,
  buttonLabel = 'Filter',
  title = 'Select Filters',
  clearLabel = 'Clear all',
  disabled,
  className,
}: MultiFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeCount = useMemo(() => countActive(value), [value]);
  const hasActive = activeCount > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!open) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const updateSection = (section: MultiFilterSection, optionValue: string) => {
    const current = value[section.id] ?? [];
    const exists = current.includes(optionValue);

    let nextSectionValues: string[];
    if (section.allowMultiple) {
      nextSectionValues = exists ? current.filter((v) => v !== optionValue) : current.concat(optionValue);
    } else {
      nextSectionValues = exists ? [] : [optionValue];
    }

    onChange({
      ...value,
      [section.id]: nextSectionValues,
    });
  };

  const clearAll = () => {
    const next: MultiFilterValue = {};
    sections.forEach((s) => {
      next[s.id] = [];
    });
    onChange(next);
  };

  return (
    <div className={clsx('relative', className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'bg-white border rounded-[0.6rem] lg:rounded-[0.7rem] px-4 py-1.5 lg:py-2 text-[0.7rem] lg:text-[0.8rem] font-semibold focus:outline-none flex items-center transition-all duration-200',
          hasActive ? 'border-brand-600 text-brand-700' : 'border-gray-400 text-gray-700 hover:border-brand-600',
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <FiFilter className="h-3.5 w-3.5 mr-2" />
        {buttonLabel}
        {hasActive ? (
          <span className="ml-2 inline-flex items-center rounded-full bg-brand-600 text-white px-2 text-[0.65rem] lg:text-[0.7rem] font-bold">
            {activeCount}
          </span>
        ) : null}
        <FiChevronDown className={clsx('h-4 w-4 ml-2 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-300 rounded-2xl shadow-panel z-10 overflow-hidden">
          <div className="px-3 py-2 border-b border-ink-100">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[0.75rem] md:text-[0.8rem] lg:text-[0.85rem] text-primary-600">{title}</h3>
              <div className="flex items-center gap-2">
                {hasActive ? (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs text-brand-700 hover:text-brand-600 font-semibold"
                  >
                    {clearLabel}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-ink-50 transition-colors"
                  aria-label="Close filters"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="px-3 pt-2 pb-3 space-y-4">
            {sections.map((section) => {
              const selected = value[section.id] ?? [];
              return (
                <div key={section.id}>
                  <h4 className="text-[0.75rem] md:text-[0.8rem] lg:text-[0.85rem] font-bold text-secondary-700 mb-1 pl-0.5">{section.title}</h4>
                  <div className="flex flex-wrap gap-2">
                    {section.options.map((opt) => {
                      const active = selected.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateSection(section, opt.value)}
                          className={clsx(
                            'px-3 py-[0.1rem] text-[0.65rem] md:text-[0.7rem] lg:text-[0.75rem] rounded-[0.4rem] lg:rounded-[0.55rem] border transition-colors',
                            active ? 'bg-primary-500 text-white' : 'bg-gray-200/70 border-gray-300 text-gray-700 hover:bg-gray-100',
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

