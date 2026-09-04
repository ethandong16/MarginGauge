import type { ReactNode } from "react";
import { Check, ChevronDown, CircleHelp } from "lucide-react";

interface BaseFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MoneyField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  required,
  disabled,
  placeholder = "0.00",
  className,
}: BaseFieldProps) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`field ${className ?? ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className={`input-shell money-shell ${error ? "is-invalid" : ""}`}>
        <span aria-hidden="true">$</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          required={required}
          disabled={disabled}
        />
      </div>
      {hint && (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  required,
  disabled,
  placeholder,
  className,
}: BaseFieldProps) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`field ${className ?? ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className={`input-shell ${error ? "is-invalid" : ""}`}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          required={required}
          disabled={disabled}
        />
      </div>
      {hint && (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

export function PercentField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  required,
  disabled,
  placeholder = "0",
  className,
}: BaseFieldProps) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`field ${className ?? ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className={`input-shell suffix-shell ${error ? "is-invalid" : ""}`}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          required={required}
          disabled={disabled}
        />
        <span aria-hidden="true">%</span>
      </div>
      {hint && (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  hint,
  error,
  disabled,
  required,
}: SelectFieldProps<T>) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`select-shell ${error ? "is-invalid" : ""}`}>
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          disabled={disabled}
          required={required}
        >
          {options.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </div>
      {hint && (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  compact?: boolean;
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  compact,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className={`segmented-field ${compact ? "is-compact" : ""}`}>
      <legend className="sr-only">{label}</legend>
      <div className="segmented-control">
        {options.map((option) => (
          <button
            type="button"
            className={value === option.value ? "is-active" : ""}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            key={option.value}
          >
            <span>{option.label}</span>
            {option.description && <small>{option.description}</small>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

interface CheckboxFieldProps {
  id: string;
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  error?: string;
  required?: boolean;
}

export function CheckboxField({
  id,
  label,
  checked,
  onChange,
  hint,
  error,
  required,
}: CheckboxFieldProps) {
  return (
    <div className="checkbox-block">
      <label className="checkbox-field" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          required={required}
        />
        <span className="custom-checkbox" aria-hidden="true">
          <Check size={14} />
        </span>
        <span>{label}</span>
      </label>
      {hint && (
        <span className="checkbox-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field-error checkbox-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

export function InfoTip({ children }: { children: ReactNode }) {
  return (
    <span className="info-tip" tabIndex={0} aria-label={typeof children === "string" ? children : undefined}>
      <CircleHelp size={15} aria-hidden="true" />
      <span role="tooltip">{children}</span>
    </span>
  );
}
