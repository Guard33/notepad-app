import { useEffect, useRef, useState } from "react";

export default function NoteMenu({ pinned, onTogglePin, onDelete }) {
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
    <div
      ref={ref}
      className="relative"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Note options"
        className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition hover:bg-accent-soft hover:text-ink"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-md">
          <button
            onClick={() => {
              onTogglePin();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-accent-soft"
          >
            {pinned ? "📌 Unpin" : "📌 Pin it"}
          </button>
          <button
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}
