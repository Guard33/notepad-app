import { useCallback, useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import OrderStatus from "../../components/OrderStatus";
import { EmptyState, ErrorNote, Modal, Spinner } from "../../components/ui";
import { money, shortDate } from "../../lib/money";

const FILTERS = [
  ["", "All"],
  ["paid", "To fulfil"],
  ["fulfilled", "Shipped"],
  ["cancelled", "Cancelled"],
];

export default function AdminOrders() {
  const { readOnly } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);

  const load = useCallback(() => {
    return api
      .get("/admin/orders", { params: status ? { status } : {} })
      .then((res) => setOrders(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load orders")));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function setOrderStatus(order, next) {
    setError("");
    try {
      await api.patch(`/admin/orders/${order._id}`, { status: next });
      setConfirmCancel(null);
      setOpen(null);
      load();
    } catch (err) {
      setError(errorMessage(err, "Couldn't update the order"));
      setConfirmCancel(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <button
            key={label}
            onClick={() => setParams(value ? { status: value } : {}, { replace: true })}
            className={`btn btn-sm ${status === value ? "btn-primary" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
      <ErrorNote>{error}</ErrorNote>
      {!orders && !error && <Spinner />}
      {orders?.length === 0 && <EmptyState title="No orders here" />}
      {orders?.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Order</th>
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Customer</th>
                <th className="px-3 py-2.5 font-medium">Items</th>
                <th className="px-3 py-2.5 text-right font-medium">Total</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
                  <td className="px-4 py-2.5">
                    <button onClick={() => setOpen(o)} className="font-mono text-xs font-medium hover:underline">{o.number}</button>
                    {o.sample && <span className="badge ml-2 bg-surface-2 text-faint">sample</span>}
                    {o.demo && <span className="badge ml-2 bg-warn-soft text-warn-text">demo</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted">{shortDate(o.createdAt)}</td>
                  <td className="max-w-48 truncate px-3 py-2.5 text-muted">{o.userId?.email ?? "deleted user"}</td>
                  <td className="px-3 py-2.5 text-muted">{o.items.reduce((n, i) => n + i.qty, 0)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(o.totalCents)}</td>
                  <td className="px-3 py-2.5"><OrderStatus status={o.status} /></td>
                  <td className="px-4 py-2.5 text-right">
                    {o.status === "paid" && (
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setOrderStatus(o, "fulfilled")} disabled={readOnly} className="btn btn-sm" title={readOnly ? "Disabled in the demo" : undefined}>Mark shipped</button>
                        <button onClick={() => setConfirmCancel(o)} disabled={readOnly} className="btn btn-ghost btn-sm" title={readOnly ? "Disabled in the demo" : undefined}>Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `Order ${open.number}` : ""}>
        {open && (
          <div className="space-y-4 text-sm">
            <ul className="divide-y divide-border">
              {open.items.map((it, i) => (
                <li key={i} className="flex justify-between py-2">
                  <span>{it.name} · {it.size} × {it.qty}</span>
                  <span className="tabular-nums">{money(it.unitPriceCents * it.qty)}</span>
                </li>
              ))}
            </ul>
            <p className="text-muted">
              Subtotal {money(open.subtotalCents)} · shipping {money(open.shippingCents)} · tax {money(open.taxCents)} ·{" "}
              <span className="font-medium text-text">total {money(open.totalCents)}</span>
            </p>
            <p className="text-muted">
              Ship to {open.shippingAddress.name}, {open.shippingAddress.city}, {open.shippingAddress.province} {open.shippingAddress.postalCode}
            </p>
          </div>
        )}
      </Modal>

      <Modal open={!!confirmCancel} onClose={() => setConfirmCancel(null)} title="Cancel this order?">
        <p className="text-sm text-muted">
          {confirmCancel?.number} will be marked cancelled and its prints go back into stock. The customer isn't charged (no payment is taken in this store).
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setConfirmCancel(null)} className="btn">Keep it</button>
          <button onClick={() => setOrderStatus(confirmCancel, "cancelled")} className="btn btn-danger">Cancel order</button>
        </div>
      </Modal>
    </div>
  );
}
