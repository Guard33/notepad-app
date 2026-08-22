import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Landing() {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/notes" replace />;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper px-4">
      <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--color-line)_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

      <div className="relative flex flex-col items-center text-center">
        <div
          aria-hidden
          className="mb-8 flex h-14 w-14 -rotate-6 items-center justify-center rounded-xl border border-line bg-white text-xl shadow-sm"
        >
          📝
        </div>

        <p className="mb-3 text-sm font-medium tracking-wide text-ink-soft uppercase">
          Your notes, wherever you go
        </p>
        <h1 className="font-display text-6xl font-medium text-ink">Notepad</h1>
        <p className="mt-5 max-w-md text-balance text-ink-soft">
          A quiet place to write things down. Tag it, search it, find it again —
          all tied to your account.
        </p>

        <div className="mt-9 flex gap-3">
          <Link
            to="/signup"
            className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper shadow-sm transition hover:bg-accent"
          >
            Get started
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-line bg-white px-6 py-2.5 text-sm font-medium text-ink transition hover:border-ink"
          >
            Log in
          </Link>
        </div>
      </div>

      <p className="relative mt-16 text-xs text-ink-soft">
        Free to use. No credit card required.
      </p>
    </div>
  );
}
