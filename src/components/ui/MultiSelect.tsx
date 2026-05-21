import React from 'react';
import clsx from 'clsx';
import Checkbox from './Checkbox';

export type MultiSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type MultiSelectProps = {
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  className?: string;
};

const MultiSelect: React.FC<MultiSelectProps> = ({ options, values, onChange, className }) => {
  return (
    <div className={clsx('grid gap-2 rounded-lg border border-ink-100 bg-white p-3', className)}>
      {options.map((option) => {
        const checked = values.includes(option.value);
        return (
          <div key={option.value} className={clsx(option.disabled && 'opacity-60')}>
            <Checkbox
              checked={checked}
              disabled={option.disabled}
              onChange={() => {
                if (option.disabled) return;
                onChange(checked ? values.filter((v) => v !== option.value) : [...values, option.value]);
              }}
              label={option.label}
            />
          </div>
        );
      })}
    </div>
  );
};

export default MultiSelect;
