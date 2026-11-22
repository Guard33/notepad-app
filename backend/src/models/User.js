import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Admins manage products and orders. Granted by the ADMIN_EMAILS env var,
    // never by anything the client sends.
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    isDemo: { type: Boolean, default: false },
    // Only set on throwaway demo accounts. MongoDB's TTL monitor deletes the
    // document once this time passes; real accounts never have the field.
    expiresAt: { type: Date, default: undefined },
  },
  { timestamps: true }
);

userSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("User", userSchema);
