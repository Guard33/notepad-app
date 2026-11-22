import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import Poster from "../components/Poster";
import QtyStepper from "../components/QtyStepper";
import Totals from "../components/Totals";
import { EmptyState, ErrorNote } from "../components/ui";
import { money } from "../lib/money";
import { useQuote } from "../lib/useQuote";

export default function Cart() {
  const { items, payload, setQty, remove } = useCart();
  const { quote, error } = useQuote(payload);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <EmptyState title="Your cart is empty" action={<Link to="/shop" className="btn btn-primary">Browse prints</Link>} />
      </div>
    );
  }

  const live = new Map((quote?.lines ?? []).map((l) => [l.variantId, l]));
  const problems = new Map((quote?.problems ?? []).map((p) => [p.variantId, p.message]));
  const blocked = (quote?.problems.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="heading text-4xl">Your cart</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <ul className="divide-y divide-border border-y border-border">
          {items.map((item) => {
            const line = live.get(item.variantId);
            const price = line?.unitPriceCents ?? item.unitPriceCents;
            const problem = problems.get(item.variantId);
            return (
              <li key={item.variantId} className="flex gap-4 py-5">
                <Link to={`/p/${item.slug}`} className="flex w-24 shrink-0 items-center justify-center rounded-lg bg-wall p-2.5">
                  <Poster art={item.art} name={item.name} caption={false} className="poster-shadow w-full" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div>
                      <Link to={`/p/${item.slug}`} className="font-medium hover:underline">{item.name}</Link>
                      <p className="text-sm text-muted">{item.size} · {money(price)}</p>
                    </div>
                    <p className="font-medium tabular-nums">{money(price * item.qty)}</p>
                  </div>
                  {problem && <p className="mt-1 text-sm text-bad">{problem}</p>}
                  <div className="mt-auto flex items-center gap-3 pt-3">
                    <QtyStepper value={item.qty} onChange={(q) => setQty(item.variantId, q)} max={Math.min(10, line?.stock ?? 10)} />
                    <button onClick={() => remove(item.variantId)} className="text-sm text-muted hover:text-bad">Remove</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="card h-fit p-5">
          <h2 className="font-semibold">Order summary</h2>
          <div className="mt-4">
            <ErrorNote>{error}</ErrorNote>
            <Totals data={quote} taxLabel="Estimated tax" />
          </div>
          {blocked && <p className="mt-4 text-sm text-bad">Fix the items marked above to check out.</p>}
          <Link
            to="/checkout"
            aria-disabled={blocked}
            className={`btn btn-primary btn-lg mt-5 w-full ${blocked ? "pointer-events-none opacity-50" : ""}`}
          >
            Check out
          </Link>
          <Link to="/shop" className="mt-3 block text-center text-sm text-muted hover:text-text">Keep shopping</Link>
        </aside>
      </div>
    </div>
  );
}
