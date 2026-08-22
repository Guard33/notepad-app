import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listNotes,
  createNote,
  updateNote,
  softDeleteNote,
  restoreNote,
  permanentlyDeleteNote,
} from "../controllers/noteController.js";

const router = Router();
router.use(requireAuth);

router.get("/", listNotes);
router.post("/", createNote);
router.patch("/:id", updateNote);
router.delete("/:id", softDeleteNote);
router.post("/:id/restore", restoreNote);
router.delete("/:id/permanent", permanentlyDeleteNote);

export default router;
