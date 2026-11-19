import { useId, type ReactNode } from 'react';
import { cx } from '../cx';

// Every field follows the editing model: pass `readOnly` until the user presses Edit.
// Read-only fields look like plain text (no box), as in the legacy "locked" page.

interface BaseFieldProps {
  label: ReactNode;
  /** Small grey text under the field. */
  hint?: ReactNode;
  /** Read-only until Edit (shows as plain text). */
  readOnly?: boolean;
  /** Greyed out and not editable even in Edit mode. */
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
}

/** Label + control + hint. Use directly only to wrap a custom control. */
export function Field({
  label,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx('ui-field', className)}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="ui-field__hint">{hint}</span>}
    </div>
  );
}

/** Two-column grid of fields (one column on phones). */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="ui-fieldgrid">{children}</div>;
}

const inputClass = (readOnly?: boolean, extra?: string) =>
  cx('ui-input', readOnly && 'ui-input--locked', extra);

// ---------------------------------------------------------------- text / number / email
export interface TextFieldProps extends BaseFieldProps {
  value: string | number | null | undefined;
  onChange?: (value: string) => void;
  type?: 'text' | 'number' | 'email' | 'tel' | 'url' | 'password' | 'search';
  placeholder?: string;
}
export function TextField({
  label,
  hint,
  value,
  onChange,
  type = 'text',
  placeholder,
  readOnly,
  disabled,
  required,
  name,
  className,
}: TextFieldProps) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <input
        id={id}
        name={name}
        type={type}
        className={inputClass(readOnly)}
        value={value ?? ''}
        placeholder={readOnly ? undefined : placeholder}
        readOnly={readOnly}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </Field>
  );
}

// ---------------------------------------------------------------- select
export interface SelectOption {
  value: string;
  label: string;
}
export interface SelectFieldProps extends BaseFieldProps {
  value: string | null | undefined;
  onChange?: (value: string) => void;
  options: SelectOption[];
  /** Label of the empty choice (e.g. "—"). Leave out for no empty choice. */
  placeholder?: string;
}
export function SelectField({
  label,
  hint,
  value,
  onChange,
  options,
  placeholder,
  readOnly,
  disabled,
  required,
  name,
  className,
}: SelectFieldProps) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <select
        id={id}
        name={name}
        className={inputClass(readOnly)}
        value={value ?? ''}
        // a <select> has no readOnly; disable it but keep the plain-text look
        disabled={readOnly || disabled}
        required={required}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {placeholder != null && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

// ---------------------------------------------------------------- checkbox
export interface CheckboxFieldProps extends Omit<BaseFieldProps, 'hint'> {
  checked: boolean;
  onChange?: (checked: boolean) => void;
}
export function CheckboxField({
  label,
  checked,
  onChange,
  readOnly,
  disabled,
  name,
  className,
}: CheckboxFieldProps) {
  return (
    <label className={cx('ui-check', readOnly && 'ui-check--locked', className)}>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={readOnly || disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      {label}
    </label>
  );
}

// ---------------------------------------------------------------- date
export interface DateFieldProps extends BaseFieldProps {
  /** ISO date, yyyy-mm-dd. */
  value: string | null | undefined;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
}
export function DateField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  readOnly,
  disabled,
  required,
  name,
  className,
}: DateFieldProps) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <input
        id={id}
        name={name}
        type="date"
        className={inputClass(readOnly)}
        value={value ?? ''}
        min={min}
        max={max}
        readOnly={readOnly}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </Field>
  );
}

// ---------------------------------------------------------------- colour
export interface ColorFieldProps extends BaseFieldProps {
  /** Hex colour, #rrggbb. */
  value: string | null | undefined;
  onChange?: (value: string) => void;
}
export function ColorField({
  label,
  hint,
  value,
  onChange,
  readOnly,
  disabled,
  name,
  className,
}: ColorFieldProps) {
  const id = useId();
  const v = value || '#03ad86';
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          id={id}
          name={name}
          type="color"
          className={inputClass(false, 'ui-input--color')}
          value={v}
          disabled={readOnly || disabled}
          onChange={(e) => onChange?.(e.target.value)}
        />
        <span className="ui-muted">{v.toUpperCase()}</span>
      </span>
    </Field>
  );
}

// ---------------------------------------------------------------- file
export interface FileFieldProps extends BaseFieldProps {
  accept?: string;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
  /** Name of the file already stored, shown when read-only. */
  current?: string;
}
export function FileField({
  label,
  hint,
  accept,
  multiple,
  onFiles,
  current,
  readOnly,
  disabled,
  name,
  className,
}: FileFieldProps) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      {readOnly ? (
        <span className={inputClass(true)} style={{ display: 'flex', alignItems: 'center' }}>
          {current || '—'}
        </span>
      ) : (
        <input
          id={id}
          name={name}
          type="file"
          className={inputClass(false, 'ui-input--file')}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => onFiles?.(Array.from(e.target.files ?? []))}
        />
      )}
    </Field>
  );
}
