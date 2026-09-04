import { useEffect, useRef, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import NoteMenu from "../components/NoteMenu";
import QuillIcon from "../components/QuillIcon";

const VIEWS = [
  { key: "active", label: "Notes" },
  { key: "archived", label: "Archived" },
  { key: "trash", label: "Trash" },
];

export default function Notes() {
  const { user, logout } = useAuth();
  const [view, setView] = useState("active");
  const [notes, setNotes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const saveTimer = useRef(null);

  const active = notes.find((n) => n._id === activeId) || null;
  const isTrash = view === "trash";
  const allTags = [...new Set(notes.flatMap((n) => n.tags || []))];

  async function loadNotes() {
    const params = {};
    if (view === "trash") params.trash = "true";
    if (view === "archived") params.archived = "true";
    if (search) params.q = search;
    if (tagFilter) params.tag = tagFilter;
    const res = await api.get("/notes", { params });
    setNotes(res.data);
  }

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setActiveId(null);
    loadNotes();
  }, [view, search, tagFilter]);

  useEffect(() => {
    if (active) {
      setTitle(active.title);
      setBody(active.body);
      setTags(active.tags || []);
    } else {
      setTitle("");
      setBody("");
      setTags([]);
    }
    setTagDraft("");
  }, [activeId]);

  async function handleNewNote() {
    const res = await api.post("/notes", { title: "Untitled", body: "" });
    setView("active");
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

  async function saveTags(nextTags) {
    if (!active) return;
    const res = await api.patch(`/notes/${active._id}`, { tags: nextTags });
    setNotes((prev) => prev.map((n) => (n._id === res.data._id ? res.data : n)));
    setTags(res.data.tags);
  }

  function addTagFromDraft() {
    const value = tagDraft.trim();
    if (!value || tags.includes(value)) {
      setTagDraft("");
      return;
    }
    setTagDraft("");
    saveTags([...tags, value]);
  }

  function removeTag(tag) {
    saveTags(tags.filter((t) => t !== tag));
  }

  async function togglePin(note) {
    const res = await api.patch(`/notes/${note._id}`, { pinned: !note.pinned });
    setNotes((prev) => prev.map((n) => (n._id === res.data._id ? res.data : n)));
  }

  async function setArchived(note, archived) {
    await api.patch(`/notes/${note._id}`, { archived });
    setNotes((prev) => prev.filter((n) => n._id !== note._id));
    if (activeId === note._id) setActiveId(null);
  }

  async function trashNote(note) {
    await api.delete(`/notes/${note._id}`);
    setNotes((prev) => prev.filter((n) => n._id !== note._id));
    if (activeId === note._id) setActiveId(null);
  }

  async function restoreNote(note) {
    await api.post(`/notes/${note._id}/restore`);
    setNotes((prev) => prev.filter((n) => n._id !== note._id));
    if (activeId === note._id) setActiveId(null);
  }

  async function deleteForever(note) {
    await api.delete(`/notes/${note._id}/permanent`);
    setNotes((prev) => prev.filter((n) => n._id !== note._id));
    if (activeId === note._id) setActiveId(null);
  }

  function menuItemsFor(note) {
    if (view === "trash") {
      return [
        { key: "restore", label: "♻️ Restore", onClick: () => restoreNote(note) },
        { key: "forever", label: "🔥 Delete forever", onClick: () => deleteForever(note), danger: true },
      ];
    }
    if (view === "archived") {
      return [
        { key: "unarchive", label: "📤 Unarchive", onClick: () => setArchived(note, false) },
        { key: "trash", label: "🗑️ Move to trash", onClick: () => trashNote(note), danger: true },
      ];
    }
    return [
      { key: "pin", label: note.pinned ? "📌 Unpin" : "📌 Pin it", onClick: () => togglePin(note) },
      { key: "archive", label: "📦 Archive", onClick: () => setArchived(note, true) },
      { key: "trash", label: "🗑️ Move to trash", onClick: () => trashNote(note), danger: true },
    ];
  }

  return (
    <div className="flex h-screen bg-paper">
      <aside className="flex w-72 flex-col border-r-[3px] border-ink bg-paper">
        <div className="flex items-center justify-between border-b-[3px] border-ink px-4 py-3.5">
          <span className="flex items-center gap-2 text-pixel-md text-ink">
            <QuillIcon size={16} />
            Notepad
          </span>
          <button onClick={logout} className="text-pixel-xs text-ink-soft transition-colors hover:text-accent">
            LOG OUT
          </button>
        </div>

        <div className="border-b-[3px] border-ink px-4 py-2 text-sm text-ink-soft">
          hey, {user?.email}
        </div>

        <div className="flex gap-1.5 p-3 pb-0">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`pixel-tab flex-1 ${view === v.key ? "active" : ""}`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="p-3">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Find something…"
            className="pixel-input w-full px-3 py-2 text-lg"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pb-3">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                className={`pixel-chip ${tagFilter === tag ? "active" : ""}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {!isTrash && view === "active" && (
          <button onClick={handleNewNote} className="pixel-btn mx-3 mb-3 py-2">
            + New Note
          </button>
        )}

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
              <div className="shrink-0 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <NoteMenu items={menuItemsFor(note)} />
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-soft">
              {view === "trash"
                ? "Trash is empty."
                : view === "archived"
                  ? "Nothing archived yet."
                  : 'Nothing here yet — hit "+ New Note" to get going.'}
            </p>
          )}
        </div>
      </aside>

      <main className="flex-1 p-8">
        {active ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <input
                value={title}
                onChange={handleTitleChange}
                placeholder="Give it a title"
                readOnly={isTrash}
                className="w-full text-pixel-lg text-ink outline-none placeholder:text-ink-soft/50"
              />
              <NoteMenu items={menuItemsFor(active)} />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="pixel-chip">
                  #{tag}
                  {!isTrash && (
                    <button onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`} className="text-accent">
                      ×
                    </button>
                  )}
                </span>
              ))}
              {!isTrash && (
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTagFromDraft();
                    }
                  }}
                  onBlur={addTagFromDraft}
                  placeholder="+ tag"
                  className="w-20 bg-transparent font-body text-lg text-ink-soft outline-none placeholder:text-ink-soft/60"
                />
              )}
            </div>

            <textarea
              value={body}
              onChange={handleBodyChange}
              placeholder="What's on your mind?"
              readOnly={isTrash}
              className="ruled-paper h-full w-full resize-none px-1 pt-2 font-body text-2xl leading-8 text-ink outline-none placeholder:text-ink-soft/50"
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-soft">
            <QuillIcon size={32} />
            <p className="text-pixel-sm">Pick a note, or start something new.</p>
          </div>
        )}
      </main>
    </div>
  );
}
