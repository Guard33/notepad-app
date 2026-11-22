import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import OrderStatus from "../components/OrderStatus";
import Poster from "../components/Poster";
import Totals from "../components/Totals";
import { ErrorNote, Spinner } from "../components/ui";
import { money, shortDate } from "../lib/money";

export default function OrderDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load this order")));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-10">
        <ErrorNote>{error}</ErrorNote>
        <Link to="/account/orders" className="btn">← Your orders</Link>
      </div>
    );
  }
  if (!order) return <Spinner />;
  const a = order.shippingAddress;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/account/orders" className="text-sm text-muted hover:text-text">← Your orders</Link>

      {params.get("placed") && (
        <div className="card mt-4 border-good/40 bg-good-soft p-5" role="status">
          <p className="heading text-2xl text-good">Thanks, your order is in.</p>
          <p className="mt-1 text-sm text-good">
            Order {order.number} is confirmed. (Portfolio store: nothing will actually ship.)
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="heading text-3xl">Order {order.number}</h1>
          <p className="mt-1 text-sm text-muted">Placed {shortDate(order.createdAt)}</p>
        </div>
        <OrderStatus status={order.status} />
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_300px]">
        <ul className="divide-y divide-border border-y border-border">
          {order.items.map((it, i) => (
            <li key={i} className="flex items-center gap-4 py-4">
              <Link to={`/p/${it.slug}`} className="w-16 shrink-0 rounded-lg bg-wall p-2">
                <Poster art={it.art} name={it.name} caption={false} className="poster-shadow w-full" />
              </Link>
              <div className="flex-1">
                <p className="font-medium">{it.name}</p>
                <p className="text-sm text-muted">{it.size} · {money(it.unitPriceCents)} × {it.qty}</p>
              </div>
              <p className="tabular-nums">{money(it.unitPriceCents * it.qty)}</p>
            </li>
          ))}
        </ul>
        <aside className="space-y-6">
          <div className="card p-5">
            <Totals data={order} />
          </div>
          <div className="card p-5 text-sm">
            <p className="font-medium">Shipping to</p>
            <address className="mt-2 leading-relaxed text-muted not-italic">
              {a.name}<br />
              {a.line1}{a.line2 && <>, {a.line2}</>}<br />
              {a.city}, {a.province} {a.postalCode}
            </address>
          </div>
        </aside>
      </div>
    </div>
  );
}
