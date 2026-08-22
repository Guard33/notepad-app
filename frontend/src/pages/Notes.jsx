import { useEffect, useRef, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Notes() {
  const { user, logout } = useAuth();
  const [notes, setNotes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const saveTimer = useRef(null);

  const active = notes.find((n) => n._id === activeId) || null;

  async function loadNotes(query = "") {
    const res = await api.get("/notes", { params: query ? { q: query } : {} });
    setNotes(res.data);
  }

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    if (active) {
      setTitle(active.title);
      setBody(active.body);
    } else {
      setTitle("");
      setBody("");
    }
  }, [activeId]);

  async function handleNewNote() {
    const res = await api.post("/notes", { title: "Untitled", body: "" });
    setNotes([res.data, ...notes]);
    setActiveId(res.data._id);
  }

  function scheduleSave(nextTitle, nextBody) {
    if (!active) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const res = await api.patch(`/notes/${active._id}`, { title: nextTitle, body: nextBody });
      setNotes((prev) => prev.map((n) => (n._id === res.data._id ? res.data : n)));
    }, 500);
  }

  function handleTitleChange(e) {
    setTitle(e.target.value);
    scheduleSave(e.target.value, body);
  }

  function handleBodyChange(e) {
    setBody(e.target.value);
    scheduleSave(title, e.target.value);
  }

  async function togglePin(note) {
    const res = await api.patch(`/notes/${note._id}`, { pinned: !note.pinned });
    setNotes((prev) => prev.map((n) => (n._id === res.data._id ? res.data : n)));
  }

  async function trashNote(note) {
    await api.delete(`/notes/${note._id}`);
    setNotes((prev) => prev.filter((n) => n._id !== note._id));
    if (activeId === note._id) setActiveId(null);
  }

  async function handleSearch(e) {
    const value = e.target.value;
    setSearch(value);
    loadNotes(value);
  }

  return (
    <div className="flex h-screen bg-paper">
      <aside className="flex w-72 flex-col border-r border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <span className="font-display text-lg text-ink">Notepad</span>
          <button onClick={logout} className="text-xs text-ink-soft hover:text-accent">
            Log out
          </button>
        </div>

        <div className="border-b border-line px-4 py-2 text-xs text-ink-soft">{user?.email}</div>

        <div className="p-3">
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Search notes…"
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>

        <button
          onClick={handleNewNote}
          className="mx-3 mb-3 rounded-lg bg-ink py-2 text-sm font-medium text-paper transition hover:bg-accent"
        >
          + New note
        </button>

        <div className="flex-1 overflow-y-auto">
          {notes.map((note) => (
            <div
              key={note._id}
              onClick={() => setActiveId(note._id)}
              className={`cursor-pointer border-b border-line px-4 py-3 transition hover:bg-accent-soft ${
                note._id === activeId ? "border-l-2 border-l-accent bg-accent-soft" : "border-l-2 border-l-transparent"
              }`}
            >
              <p className="truncate text-sm font-medium text-ink">
                {note.pinned ? "📌 " : ""}
                {note.title || "Untitled"}
              </p>
              <p className="mt-0.5 truncate text-xs text-ink-soft">{note.body || "No content"}</p>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-soft">No notes yet.</p>
          )}
        </div>
      </aside>

      <main className="flex-1 p-8">
        {active ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <input
                value={title}
                onChange={handleTitleChange}
                placeholder="Title"
                className="w-full font-display text-3xl text-ink outline-none placeholder:text-ink-soft/50"
              />
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => togglePin(active)}
                  className="rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-ink transition hover:border-accent hover:text-accent"
                >
                  {active.pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  onClick={() => trashNote(active)}
                  className="rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-ink-soft transition hover:border-red-300 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
            <textarea
              value={body}
              onChange={handleBodyChange}
              placeholder="Start writing…"
              className="h-full w-full resize-none text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-soft/50"
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-soft">
            <span className="text-2xl">🖊️</span>
            <p className="text-sm">Select a note, or create a new one.</p>
          </div>
        )}
      </main>
    </div>
  );
}
