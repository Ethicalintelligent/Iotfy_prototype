// Pickers from the approved GPS Vehicle Tracking design (Desktop/vs, Manage > Geo Configuration
// and Geo Association): MultiSelectField (a drop-down with a checkbox per choice, "Mon, Tue, Wed")
// and TimeRange (a from–to pair of time boxes with an optional remove button).
// The multi-select's list opens in place (not in a portal), so it also works inside a Drawer.
import { useEffect, useId, useRef, useState } from 'react';
import '../styles/pickers.css';
import { cx } from '../cx';
import { Icon } from './basics';
import { Field } from './fields';

// ---------------------------------------------------------------- MultiSelectField
export interface MultiSelectFieldProps {
  label: string;
  /** The chosen values, in any order (shown in the options' order). */
  value: string[];
  onChange?: (value: string[]) => void;
  options: { value: string; label: string }[];
  /** Shown when nothing is chosen. */
  placeholder?: string;
  /** Shown instead of the list when every choice is ticked (e.g. "Every day"). */
  allLabel?: string;
  hint?: string;
  required?: boolean;
  /** Read-only until Edit (shows as plain text). */
  readOnly?: boolean;
  disabled?: boolean;
}

/** A drop-down with a checkbox per choice; the box lists the ticked ones ("Mon, Tue, Wed"). */
export function MultiSelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Choose…',
  allLabel,
  hint,
  required,
  readOnly,
  disabled,
}: MultiSelectFieldProps) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const chosen = options.filter((o) => value.includes(o.value));
  const text =
    allLabel && options.length > 1 && chosen.length === options.length
      ? allLabel
      : chosen.map((o) => o.label).join(', ');

  // A click anywhere else closes the list.
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const toggle = (v: string) => {
    const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
    onChange?.(options.map((o) => o.value).filter((x) => next.includes(x)));
  };
  const locked = readOnly || disabled;
  return (
    <Field label={label} hint={hint} htmlFor={id} required={required}>
      <div
        ref={box}
        className="ui-mselect"
        onKeyDown={(e) => {
          // Esc closes only the list (not a drawer or dialog around it).
          if (e.key === 'Escape' && open) {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      >
        <button
          id={id}
          type="button"
          className={cx('ui-input', 'ui-mselect__btn', readOnly && 'ui-input--locked')}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={locked}
          onClick={() => {
            const r = box.current?.getBoundingClientRect();
            setUp(!!r && r.bottom + 300 > window.innerHeight && r.top > 300);
            setOpen(!open);
          }}
        >
          <span className={cx(!text && 'ui-mselect__placeholder')}>{text || placeholder}</span>
          {!readOnly && <Icon name={open ? 'up' : 'down'} size={14} />}
        </button>
        {open && (
          <div
            className={cx('ui-mselect__panel', up && 'is-up')}
            role="listbox"
            aria-multiselectable="true"
            aria-label={label}
          >
            {options.map((o) => (
              <label key={o.value} className="ui-mselect__item">
                <input
                  type="checkbox"
                  checked={value.includes(o.value)}
                  onChange={() => toggle(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
        )}
      </div>
    </Field>
  );
}

// ---------------------------------------------------------------- TimeRange
export interface TimeRangeProps {
  /** "HH:MM" or empty. */
  from: string;
  to: string;
  onChange?: (from: string, to: string) => void;
  /** Accessible name of the pair, e.g. "Interval 1". */
  label: string;
  /** Shows a red bin button after the pair. */
  onRemove?: () => void;
  readOnly?: boolean;
}

/** A from–to pair of time boxes ("08:00 – 18:00"), e.g. a geofence's time intervals. */
export function TimeRange({ from, to, onChange, label, onRemove, readOnly }: TimeRangeProps) {
  const cls = cx('ui-input', readOnly && 'ui-input--locked');
  return (
    <span className="ui-trange" role="group" aria-label={label}>
      <input
        type="time"
        className={cls}
        value={from}
        readOnly={readOnly}
        aria-label={`${label} from`}
        onChange={(e) => onChange?.(e.target.value, to)}
      />
      <span aria-hidden="true">–</span>
      <input
        type="time"
        className={cls}
        value={to}
        readOnly={readOnly}
        aria-label={`${label} to`}
        onChange={(e) => onChange?.(from, e.target.value)}
      />
      {onRemove && !readOnly && (
        <button
          type="button"
          className="ui-trange__remove"
          aria-label={`Remove ${label}`}
          title={`Remove ${label}`}
          onClick={onRemove}
        >
          <Icon name="trash" size={15} />
        </button>
      )}
    </span>
  );
}
