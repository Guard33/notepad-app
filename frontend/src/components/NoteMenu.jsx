import { useEffect, useRef, useState } from "react";

export default function NoteMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Note options"
        className="flex h-7 w-7 items-center justify-center border-[3px] border-ink bg-paper text-ink transition hover:bg-accent-soft"
      >
        ⋯
      </button>
      {open && (
        <div className="pixel-panel absolute right-0 z-10 mt-1 w-40 overflow-hidden bg-paper py-1">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left font-body text-lg hover:bg-accent-soft ${
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
