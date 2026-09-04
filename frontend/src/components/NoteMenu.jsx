import { useEffect, useRef, useState } from "react";

export default function NoteMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function handleEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Note options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-paper text-ink transition-colors hover:bg-accent-soft"
      >
        ⋯
      </button>
      {open && (
        <div role="menu" className="pixel-panel-sm absolute right-0 z-10 mt-1.5 w-40 overflow-hidden bg-paper py-1">
          {items.map((item) => (
            <button
              key={item.key}
              role="menuitem"
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left font-body text-lg transition-colors hover:bg-accent-soft ${
                item.danger ? "text-accent" : "text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
