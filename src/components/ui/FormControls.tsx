import type {
  ChangeEvent,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import clsx from "clsx";
import UiInput from "./Input";
import UiCheckbox from "./Checkbox";

const fieldClass =
  "min-h-10 w-full rounded-lg border border-ink-300 bg-white px-4 py-2 text-xs text-ink-900 outline-none transition placeholder:text-ink-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 lg:text-sm";

export function FieldLabel({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5 text-sm font-medium text-ink-700">
      {label ? (
        <span className="pl-0.5 text-[0.65rem] font-medium text-ink-500 lg:text-[0.8rem]">
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <UiInput {...props} className={clsx("min-h-10", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(fieldClass, props.className)} {...props} />;
}

export function Checkbox(props: InputHTMLAttributes<HTMLInputElement>) {
  const { checked, disabled, onChange, className } = props;
  return (
    <UiCheckbox
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(next) =>
        onChange?.({
          target: { checked: next },
        } as ChangeEvent<HTMLInputElement>)
      }
      className={className}
    />
  );
}

export function Radio(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="radio"
      className={clsx("h-4 w-4 border-ink-100 text-brand-600", props.className)}
      {...props}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(fieldClass, "min-h-24 py-2", props.className)}
      {...props}
    />
  );
}

export function DatePicker(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input type="date" {...props} />;
}

export function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={clsx(
        "h-6 w-11 rounded-full p-1 transition",
        checked ? "bg-brand-600" : "bg-ink-100",
      )}
      aria-pressed={checked}
    >
      <span
        className={clsx(
          "block h-4 w-4 rounded-full bg-white transition",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
