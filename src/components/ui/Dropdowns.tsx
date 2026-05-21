import { useMemo, useState } from 'react';
import { FiCheck, FiChevronDown, FiSearch } from 'react-icons/fi';
import { Input } from './FormControls';
import { Button } from './Button';

export type Option = { label: string; value: string };

export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select option'
}: {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );
  return (
    <div className="relative">
      <Button type="button" variant="secondary" className="w-full justify-between" onClick={() => setOpen(!open)}>
        {selected?.label ?? placeholder}
        <FiChevronDown size={16} />
      </Button>
      {open ? (
        <div className="absolute z-30 mt-2 w-full rounded-lg border border-ink-100 bg-white p-2 shadow-panel">
          <div className="relative">
            <FiSearch className="absolute left-2 top-2.5 text-ink-500" size={16} />
            <Input className="pl-8" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="mt-2 max-h-56 overflow-auto">
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-ink-50"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
                {option.value === value ? <FiCheck size={16} /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MultiSelect({
  options,
  values,
  onChange
}: {
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-ink-100 bg-white p-3">
      {options.map((option) => {
        const checked = values.includes(option.value);
        return (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked}
              onChange={() =>
                onChange(checked ? values.filter((value) => value !== option.value) : [...values, option.value])
              }
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

