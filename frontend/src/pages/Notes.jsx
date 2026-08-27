import { useEffect, useRef, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import NoteMenu from "../components/NoteMenu";

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
      <aside className="flex w-72 flex-col border-r-[3px] border-ink bg-paper">
        <div className="flex items-center justify-between border-b-[3px] border-ink px-4 py-3.5">
          <span className="font-display text-xs text-ink">🪶 Notepad</span>
          <button onClick={logout} className="font-display text-[0.5rem] text-ink-soft hover:text-accent">
            LOG OUT
          </button>
        </div>

        <div className="border-b-[3px] border-ink px-4 py-2 text-sm text-ink-soft">
          hey, {user?.email}
        </div>

        <div className="p-3">
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Find something…"
            className="pixel-input w-full px-3 py-2 text-lg"
          />
        </div>

        <button onClick={handleNewNote} className="pixel-btn mx-3 mb-3 py-2">
          + New Note
        </button>

        <div className="flex-1 overflow-y-auto">
          {notes.map((note) => (
            <div
              key={note._id}
              onClick={() => setActiveId(note._id)}
              className={`group flex cursor-pointer items-start justify-between gap-1 border-b-[3px] border-ink px-4 py-3 transition hover:bg-accent-soft ${
                note._id === activeId ? "border-l-[6px] border-l-accent bg-accent-soft" : "border-l-[6px] border-l-transparent"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-medium text-ink">
                  {note.pinned ? "📌 " : ""}
                  {note.title || "Untitled"}
                </p>
                <p className="mt-0.5 truncate text-sm text-ink-soft">{note.body || "Empty for now"}</p>
              </div>
              <div className="shrink-0 opacity-0 transition group-hover:opacity-100">
                <NoteMenu
                  pinned={note.pinned}
                  onTogglePin={() => togglePin(note)}
                  onDelete={() => trashNote(note)}
                />
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-soft">
              Nothing here yet — hit "+ New Note" to get going.
            </p>
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
                placeholder="Give it a title"
                className="w-full font-display text-lg text-ink outline-none placeholder:text-ink-soft/50"
              />
              <NoteMenu
                pinned={active.pinned}
                onTogglePin={() => togglePin(active)}
                onDelete={() => trashNote(active)}
              />
            </div>
            <textarea
              value={body}
              onChange={handleBodyChange}
              placeholder="What's on your mind?"
              className="ruled-paper h-full w-full resize-none px-1 pt-2 font-body text-2xl leading-8 text-ink outline-none placeholder:text-ink-soft/50"
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-soft">
            <span className="text-3xl">🪶</span>
            <p className="font-display text-[0.6rem]">Pick a note, or start something new.</p>
          </div>
        )}
      </main>
    </div>
  );
}
