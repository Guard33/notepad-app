import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "", trim: true },
    body: { type: String, default: "" },
    tags: { type: [String], default: [] },
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    // Only set on notes owned by demo accounts — expires with the account.
    expiresAt: { type: Date, default: undefined },
  },
  { timestamps: true }
);

noteSchema.index({ userId: 1, deletedAt: 1 });
noteSchema.index({ title: "text", body: "text" });
noteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Note", noteSchema);
