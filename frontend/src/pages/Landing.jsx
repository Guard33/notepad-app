import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import QuillIcon from "../components/QuillIcon";

export default function Landing() {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/notes" replace />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="pixel-panel flex max-w-md flex-col items-center px-8 py-10 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center border-[3px] border-ink bg-paper-dim text-ink">
          <QuillIcon size={32} />
        </div>

        <h1 className="font-display text-3xl leading-relaxed text-ink">Notepad</h1>
        <p className="mt-5 font-body text-xl text-ink-soft">
          Jot it down, tag it, find it later. That's kind of the whole idea —
          all tucked away under your own account.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/signup" className="pixel-btn px-6 py-3">
            Get Started
          </Link>
          <Link to="/login" className="pixel-btn pixel-btn-outline px-6 py-3">
            Log In
          </Link>
        </div>
      </div>

      <p className="mt-8 font-display text-[0.55rem] text-ink-soft">
        FREE FOREVER · NO CREDIT CARD
      </p>
    </div>
  );
}
