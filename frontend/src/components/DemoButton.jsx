import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../api/client";

// Spins up a throwaway demo account. The backend is on a free tier that
// sleeps, so if the request is slow we say why instead of leaving a silent
// spinner. `to` is where to land afterwards (e.g. back to checkout).
export default function DemoButton({ className = "btn btn-primary", children = "Try the demo", to = "/" }) {
  const { tryDemo } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState("idle"); // idle | loading | slow | error
  const [error, setError] = useState("");

  useEffect(() => {
    if (state !== "loading") return;
    const timer = setTimeout(() => setState("slow"), 3000);
    return () => clearTimeout(timer);
  }, [state]);

  async function handleClick() {
    setError("");
    setState("loading");
    try {
      await tryDemo();
      navigate(to);
    } catch (err) {
      setError(errorMessage(err, "Couldn't start the demo. Try again in a moment."));
      setState("error");
    }
  }

  const busy = state === "loading" || state === "slow";

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={handleClick} disabled={busy} className={className}>
        {busy ? "Setting up your demo…" : children}
      </button>
      {state === "slow" && (
        <p className="max-w-xs text-center text-sm text-muted" role="status">
          Waking up the server. It sleeps when idle, so the first visit can take up to a minute.
        </p>
      )}
      {error && (
        <p className="max-w-xs text-center text-sm text-bad" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
