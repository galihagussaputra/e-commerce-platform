import { Minus, Plus } from 'lucide-react';

export default function QuantityControl({ value, onChange, max = 99, compact = false }) {
  const buttonClass = compact
    ? 'flex h-7 w-7 items-center justify-center border border-line text-ink hover:border-ink disabled:opacity-40'
    : 'flex h-9 w-9 items-center justify-center border border-line text-ink hover:border-ink disabled:opacity-40';
  return (
    <div className="inline-flex items-center">
      <button type="button" className={`${buttonClass} rounded-l-md`} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className={`${compact ? 'h-7 w-9 text-xs' : 'h-9 w-11 text-sm'} flex items-center justify-center border-y border-line bg-white font-semibold`}>
        {value}
      </span>
      <button type="button" className={`${buttonClass} rounded-r-md`} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
