import { useEffect, useRef } from "react";

export function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#1f3a5f" />
      <path d="M4 18c3-3 5-3 8 0s5 3 8 0 5-3 8 0v10H4z" fill="#8da9c4" />
      <path d="M4 23c3-3 5-3 8 0s5 3 8 0 5-3 8 0v5H4z" fill="#eef4ed" />
      <circle cx="21" cy="10" r="4" fill="#fca311" />
    </svg>
  );
}

// Native <dialog>: focus trapping, Esc to close and the backdrop for free.
export function Modal({ open, onClose, title, children, width = "max-w-lg" }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-2rem)] ${width} rounded-xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/50`}
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="btn btn-ghost btn-sm -mr-2 -mt-1" aria-label="Close">
              ✕
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function ProgressBar({ value, max, className = "" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-surface-2 ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">
      {children}
    </p>
  );
}

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border-strong border-t-accent" />
      {label}
    </div>
  );
}
