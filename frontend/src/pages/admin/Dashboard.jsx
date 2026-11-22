import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import OrderStatus from "../../components/OrderStatus";
import Poster from "../../components/Poster";
import { ErrorNote, Spinner } from "../../components/ui";
import { money, shortDate } from "../../lib/money";

function Stat({ label, value, sub }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-faint">{sub}</p>}
    </div>
  );
}

// 14-day revenue: one series, so no legend; the title names it. Each bar
// has a hover/focus tooltip, and the table below the chart is the
// accessible fallback for the exact numbers.
function RevenueChart({ days }) {
  const [active, setActive] = useState(null);
  // Round the scale up to a whole $100 so the gridlines land on clean values.
  const max = Math.max(100, Math.ceil(Math.max(...days.map((d) => d.revenueCents), 1) / 10000) * 10000);
  const ticks = [max, max / 2, 0];
  const label = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric" });

  return (
    <div>
      <div className="relative flex h-48 gap-0.5 pl-14" onMouseLeave={() => setActive(null)}>
        {ticks.map((t, i) => (
          <div key={i} className="pointer-events-none absolute right-0 left-14 border-t border-border" style={{ top: `${i * 50}%` }}>
            <span className="absolute -top-2 -left-14 w-12 text-right text-[11px] text-faint tabular-nums">{money(t).replace(/\.00$/, "")}</span>
          </div>
        ))}
        {days.map((d, i) => (
          <button
            key={d.date}
            type="button"
            className="relative flex h-full flex-1 items-end focus:outline-none"
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            aria-label={`${label(d.date)}: ${money(d.revenueCents)} from ${d.orders} orders`}
          >
            <div
              className="w-full rounded-t-[4px] transition-opacity"
              style={{
                height: `${(d.revenueCents / max) * 100}%`,
                minHeight: d.revenueCents ? 2 : 0,
                background: "var(--series-1)",
                opacity: active === null || active === i ? 1 : 0.45,
              }}
            />
            {active === i && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left text-xs whitespace-nowrap shadow-lg">
                <p className="font-medium">{label(d.date)}</p>
                <p className="text-muted">{money(d.revenueCents)} · {d.orders} order{d.orders === 1 ? "" : "s"}</p>
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between pl-14 text-[11px] text-faint">
        <span>{label(days[0].date)}</span>
        <span>{label(days[days.length - 1].date)}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/stats")
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load the dashboard")));
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Spinner />;
  const { last30, toFulfil, days, topProducts, lowStock, recent } = data;
  const topMax = Math.max(...topProducts.map((p) => p.revenueCents), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Revenue · 30 days" value={money(last30.revenueCents)} sub="excludes cancelled orders" />
        <Stat label="Orders · 30 days" value={last30.orders} sub={`${last30.units} prints sold`} />
        <Stat label="Average order" value={money(last30.averageOrderCents)} />
        <Stat label="To fulfil" value={toFulfil} sub={<Link to="orders?status=paid" className="hover:underline">View open orders →</Link>} />
      </div>

      <section className="card p-5">
        <h2 className="font-semibold">Revenue, last 14 days</h2>
        <div className="mt-6">
          <RevenueChart days={days} />
        </div>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted">Show as table</summary>
          <table className="mt-2 w-full max-w-sm text-left">
            <thead><tr className="text-xs text-muted"><th className="py-1 font-medium">Day</th><th className="font-medium">Orders</th><th className="text-right font-medium">Revenue</th></tr></thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date} className="border-t border-border"><td className="py-1">{d.date}</td><td>{d.orders}</td><td className="text-right tabular-nums">{money(d.revenueCents)}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">Top sellers · 30 days</h2>
          <ul className="mt-4 space-y-3">
            {topProducts.map((p) => (
              <li key={p._id} className="flex items-center gap-3">
                <div className="w-9 shrink-0 rounded bg-wall p-1">
                  <Poster art={p.art} name={p.name} caption={false} className="w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="tabular-nums">{money(p.revenueCents)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${(p.revenueCents / topMax) * 100}%`, background: "var(--series-1)" }} />
                  </div>
                  <p className="mt-0.5 text-xs text-faint">{p.units} sold</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Low stock</h2>
          {lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Everything is well stocked.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border text-sm">
              {lowStock.map((v) => (
                <li key={`${v._id}-${v.size}`} className="flex items-center justify-between py-2">
                  <span>{v.name} <span className="text-muted">· {v.size}</span></span>
                  <span className={`badge ${v.stock === 0 ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn-text"}`}>
                    {v.stock === 0 ? "Sold out" : `${v.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="products" className="mt-4 inline-block text-sm font-medium text-accent-text hover:underline">Restock in Products →</Link>
        </section>
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent orders</h2>
          <Link to="orders" className="text-sm font-medium text-accent-text hover:underline">All orders →</Link>
        </div>
        <ul className="mt-3 divide-y divide-border text-sm">
          {recent.map((o) => (
            <li key={o._id} className="flex flex-wrap items-center gap-3 py-2.5">
              <span className="w-24 font-mono text-xs">{o.number}</span>
              <span className="flex-1 truncate text-muted">{o.userId?.email ?? "deleted user"}</span>
              <span className="text-xs text-faint">{shortDate(o.createdAt)}</span>
              <OrderStatus status={o.status} />
              <span className="w-20 text-right tabular-nums">{money(o.totalCents)}</span>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-faint">Includes seeded sample orders (marked “sample” on the Orders tab) so the dashboard has history on a fresh database.</p>
    </div>
  );
}
