import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import OrderStatus from "../components/OrderStatus";
import Poster from "../components/Poster";
import { EmptyState, ErrorNote, Spinner } from "../components/ui";
import { money, shortDate } from "../lib/money";

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/orders")
      .then((res) => setOrders(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load your orders")));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="heading text-4xl">Your orders</h1>
      <div className="mt-8">
        <ErrorNote>{error}</ErrorNote>
        {!orders && !error && <Spinner />}
        {orders?.length === 0 && (
          <EmptyState title="No orders yet" action={<Link to="/shop" className="btn btn-primary">Start shopping</Link>} />
        )}
        {orders?.length > 0 && (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o._id}>
                <Link to={`/account/orders/${o._id}`} className="card flex flex-wrap items-center gap-4 p-4 transition-shadow hover:shadow-md hover:shadow-black/5">
                  <div className="flex -space-x-3">
                    {o.items.slice(0, 3).map((it, i) => (
                      <div key={i} className="w-11 rounded bg-wall p-1 ring-2 ring-surface">
                        <Poster art={it.art} name={it.name} caption={false} className="w-full" />
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {o.number} <span className="font-normal text-muted">· {shortDate(o.createdAt)}</span>
                    </p>
                    <p className="truncate text-sm text-muted">{o.items.map((i) => `${i.name} (${i.size})`).join(", ")}</p>
                  </div>
                  <OrderStatus status={o.status} />
                  <p className="w-24 text-right font-medium tabular-nums">{money(o.totalCents)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
