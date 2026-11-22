import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../api/client";
import DemoButton from "./DemoButton";
import { ErrorNote } from "./ui";

// Only follow same-site paths, never a full URL from the query string.
function safeNext(value) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

// Shared by the login and sign-up pages.
export default function AuthForm({ mode }) {
  const { user, loading, login, signup } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isSignup = mode === "signup";

  if (!loading && user && !user.isDemo) return <Navigate to={next} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await (isSignup ? signup : login)(email, password);
      navigate(next);
    } catch (err) {
      setError(errorMessage(err, isSignup ? "Sign-up failed" : "Login failed"));
    } finally {
      setSubmitting(false);
    }
  }

  const other = `${isSignup ? "/login" : "/signup"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div className="flex justify-center px-4 py-14">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <h1 className="heading text-2xl">{isSignup ? "Create an account" : "Welcome back"}</h1>
            <p className="mt-1 text-sm text-muted">
              {isSignup ? "Check out faster and keep track of your orders." : "Log in to check out and see your orders."}
            </p>
          </div>

          <ErrorNote>{error}</ErrorNote>

          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={isSignup ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
            />
            {isSignup && <p className="mt-1.5 text-xs text-faint">At least 8 characters.</p>}
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary w-full">
            {submitting ? "One sec…" : isSignup ? "Create account" : "Log in"}
          </button>

          <p className="text-center text-sm text-muted">
            {isSignup ? "Already have an account? " : "New here? "}
            <Link to={other} className="font-medium text-accent-text hover:underline">
              {isSignup ? "Log in" : "Create an account"}
            </Link>
          </p>
        </form>

        <div className="mt-6">
          <DemoButton to={next} className="text-sm font-medium text-accent-text hover:underline">
            Or try a demo account, no sign-up →
          </DemoButton>
        </div>
      </div>
    </div>
  );
}
