import Note from "../models/Note.js";

export async function listNotes(req, res) {
  const { q, tag, archived, trash } = req.query;
  const filter = { userId: req.userId };

  if (trash === "true") {
    filter.deletedAt = { $ne: null };
  } else {
    filter.deletedAt = null;
    filter.archived = archived === "true";
  }
  if (tag) filter.tags = tag;
  if (q) filter.$text = { $search: q };

  const notes = await Note.find(filter).sort({ pinned: -1, updatedAt: -1 });
  res.json(notes);
}

export async function createNote(req, res) {
  const { title, body, tags } = req.body;
  const note = await Note.create({ userId: req.userId, title, body, tags });
  res.status(201).json(note);
}

async function findOwnedNote(id, userId) {
  return Note.findOne({ _id: id, userId });
}

export async function updateNote(req, res) {
  const note = await findOwnedNote(req.params.id, req.userId);
  if (!note) return res.status(404).json({ error: "Note not found" });

  const { title, body, tags, pinned, archived } = req.body;
  if (title !== undefined) note.title = title;
  if (body !== undefined) note.body = body;
  if (tags !== undefined) note.tags = tags;
  if (pinned !== undefined) note.pinned = pinned;
  if (archived !== undefined) note.archived = archived;

  await note.save();
  res.json(note);
}

export async function softDeleteNote(req, res) {
  const note = await findOwnedNote(req.params.id, req.userId);
  if (!note) return res.status(404).json({ error: "Note not found" });

  note.deletedAt = new Date();
  await note.save();
  res.status(204).end();
}

export async function restoreNote(req, res) {
  const note = await findOwnedNote(req.params.id, req.userId);
  if (!note) return res.status(404).json({ error: "Note not found" });

  note.deletedAt = null;
  await note.save();
  res.json(note);
}

export async function permanentlyDeleteNote(req, res) {
  const note = await findOwnedNote(req.params.id, req.userId);
  if (!note) return res.status(404).json({ error: "Note not found" });

  await note.deleteOne();
  res.status(204).end();
}
