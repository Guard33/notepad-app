import { money } from "../lib/money";

// Subtotal / shipping / tax / total block, used by the cart, checkout and
// order pages. Works with a live quote or a saved order (same field names).
export default function Totals({ data, taxLabel }) {
  if (!data) return null;
  const remaining = data.freeShippingFromCents ? data.freeShippingFromCents - data.subtotalCents : 0;
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted">Subtotal</dt>
        <dd className="tabular-nums">{money(data.subtotalCents)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted">Shipping</dt>
        <dd className="tabular-nums">{data.shippingCents === 0 && data.subtotalCents > 0 ? "Free" : money(data.shippingCents)}</dd>
      </div>
      {remaining > 0 && data.subtotalCents > 0 && (
        <p className="text-xs text-faint">Add {money(remaining)} more for free shipping.</p>
      )}
      <div className="flex justify-between">
        <dt className="text-muted">{taxLabel ?? "Tax"}{data.taxRate != null && ` (${+(data.taxRate * 100).toFixed(3)}%)`}</dt>
        <dd className="tabular-nums">{data.taxCents == null ? "At checkout" : money(data.taxCents)}</dd>
      </div>
      <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{money(data.totalCents)}</dd>
      </div>
    </dl>
  );
}
