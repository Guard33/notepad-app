import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import DemoButton from "../components/DemoButton";
import Poster from "../components/Poster";
import Totals from "../components/Totals";
import { ErrorNote, Spinner } from "../components/ui";
import { money } from "../lib/money";
import { useQuote, useShopConfig } from "../lib/useQuote";

function SignInFirst() {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="card p-6 text-center">
        <h1 className="heading text-2xl">Sign in to check out</h1>
        <p className="mt-2 text-sm text-muted">Your cart is saved. Log in or create an account so you can track the order.</p>
        <div className="mt-6 grid gap-2">
          <Link to="/login?next=/checkout" className="btn btn-primary">Log in</Link>
          <Link to="/signup?next=/checkout" className="btn">Create an account</Link>
        </div>
        <div className="mt-5 border-t border-border pt-5">
          <DemoButton to="/checkout" className="text-sm font-medium text-accent-text hover:underline">
            Or continue with a demo account →
          </DemoButton>
        </div>
      </div>
    </div>
  );
}

export default function Checkout() {
  const { user, loading } = useAuth();
  const { items, payload, clear } = useCart();
  const navigate = useNavigate();
  const config = useShopConfig();
  const [address, setAddress] = useState({ name: "", line1: "", line2: "", city: "", province: "NS", postalCode: "" });
  const { quote, error: quoteError } = useQuote(payload, address.province);
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  if (loading) return <Spinner />;
  if (!user) return <SignInFirst />;
  if (items.length === 0 && !placing) return <Navigate to="/cart" replace />;

  const set = (field) => (e) => setAddress((a) => ({ ...a, [field]: e.target.value }));
  const problem = quote?.problems[0]?.message;

  async function placeOrder(e) {
    e.preventDefault();
    setPlacing(true);
    setError("");
    try {
      const res = await api.post("/orders", { items: payload, shippingAddress: address });
      clear();
      navigate(`/account/orders/${res.data._id}?placed=1`, { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Couldn't place the order"));
      setPlacing(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="heading text-4xl">Checkout</h1>
      <form onSubmit={placeOrder} className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="font-semibold">Shipping address</h2>
          <p className="mt-1 text-sm text-muted">We ship anywhere in Canada.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="label">Full name</label>
              <input id="name" className="input" autoComplete="name" value={address.name} onChange={set("name")} required />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="line1" className="label">Address</label>
              <input id="line1" className="input" autoComplete="address-line1" value={address.line1} onChange={set("line1")} required />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="line2" className="label">Apartment, suite, etc. <span className="font-normal text-faint">(optional)</span></label>
              <input id="line2" className="input" autoComplete="address-line2" value={address.line2} onChange={set("line2")} />
            </div>
            <div>
              <label htmlFor="city" className="label">City</label>
              <input id="city" className="input" autoComplete="address-level2" value={address.city} onChange={set("city")} required />
            </div>
            <div>
              <label htmlFor="province" className="label">Province / territory</label>
              <select id="province" className="input" autoComplete="address-level1" value={address.province} onChange={set("province")}>
                {(config?.provinces ?? [{ code: "NS", name: "Nova Scotia" }]).map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="postal" className="label">Postal code</label>
              <input
                id="postal"
                className="input uppercase"
                autoComplete="postal-code"
                placeholder="B3H 4R2"
                pattern="[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d"
                title="A Canadian postal code, like B3H 4R2"
                value={address.postalCode}
                onChange={set("postalCode")}
                required
              />
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-border bg-surface-2 p-4 text-sm">
            <p className="font-medium">Payment</p>
            <p className="mt-1 text-muted">
              This is a portfolio store, so no payment is taken and nothing ships. Placing an order runs the real flow:
              prices are re-checked on the server, stock is checked (and reserved, for real accounts), and the order shows up in
              your history and the admin dashboard.
            </p>
          </div>
        </section>

        <aside className="card h-fit p-5">
          <h2 className="font-semibold">Order summary</h2>
          <ul className="mt-4 space-y-3">
            {(quote?.lines ?? []).map((l) => (
              <li key={l.variantId} className="flex items-center gap-3 text-sm">
                <div className="flex w-12 shrink-0 justify-center rounded bg-wall p-1.5">
                  <Poster art={l.art} name={l.name} caption={false} className="w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.name}</p>
                  <p className="text-muted">{l.size} × {l.qty}</p>
                </div>
                <p className="tabular-nums">{money(l.lineTotalCents)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-border pt-4">
            <Totals data={quote} />
          </div>
          <div className="mt-4 space-y-2">
            <ErrorNote>{error || problem || quoteError}</ErrorNote>
          </div>
          <button type="submit" disabled={placing || !quote || !!problem} className="btn btn-primary btn-lg mt-4 w-full">
            {placing ? "Placing order…" : `Place order${quote ? ` · ${money(quote.totalCents)}` : ""}`}
          </button>
          <Link to="/cart" className="mt-3 block text-center text-sm text-muted hover:text-text">Back to cart</Link>
        </aside>
      </form>
    </div>
  );
}
