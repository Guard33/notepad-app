export default function QtyStepper({ value, onChange, min = 1, max = 10, label = "Quantity" }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border-strong" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} className="h-10 w-10 text-lg text-muted hover:text-text disabled:opacity-40" aria-label="Decrease quantity">
        −
      </button>
      <span className="w-8 text-center text-sm font-medium tabular-nums" aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} className="h-10 w-10 text-lg text-muted hover:text-text disabled:opacity-40" aria-label="Increase quantity">
        +
      </button>
    </div>
  );
}
