import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Spins up a throwaway demo account and drops the visitor straight into it.
// The backend is on a free tier that sleeps, so if the request is slow we
// say why instead of leaving a silent spinner.
export default function DemoButton({ className = "", children = "Try the Demo" }) {
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
      navigate("/notes");
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't start the demo. Try again in a moment.");
      setState("error");
    }
  }

  const busy = state === "loading" || state === "slow";

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={handleClick} disabled={busy} className={`${className} disabled:opacity-60`}>
        {busy ? "Setting it up…" : children}
      </button>
      {state === "slow" && (
        <p className="max-w-xs text-center text-sm text-ink-soft" role="status">
          Waking up the server. It naps when nobody's around, so the first visit can take up to a minute.
        </p>
      )}
      {error && (
        <p className="max-w-xs text-center text-sm text-accent" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
