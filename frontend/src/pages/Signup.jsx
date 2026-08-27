import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup(email, password);
      navigate("/notes");
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 block text-center font-display text-lg text-ink">
          🪶 Notepad
        </Link>

        <form onSubmit={handleSubmit} className="pixel-panel space-y-4 p-7">
          <div>
            <p className="font-display text-[0.55rem] tracking-widest text-accent">◆ NEW SCROLL ◆</p>
            <h1 className="mt-2 font-body text-2xl text-ink">Let's get you set up</h1>
            <p className="text-sm text-ink-soft">Takes about ten seconds, promise.</p>
          </div>

          {error && (
            <p className="border-[3px] border-accent bg-paper-dim px-3 py-2 text-sm text-accent">
              {error}
            </p>
          )}

          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pixel-input w-full px-3.5 py-2.5 text-lg"
            />
            <input
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="pixel-input w-full px-3.5 py-2.5 text-lg"
            />
          </div>

          <button type="submit" disabled={submitting} className="pixel-btn w-full py-3 disabled:opacity-60">
            {submitting ? "One sec…" : "Sign Up"}
          </button>

          <p className="text-center text-sm text-ink-soft">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-accent underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
