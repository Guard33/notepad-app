import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import Poster from "../../components/Poster";
import { ErrorNote, Spinner } from "../../components/ui";
import ProductEditor from "./ProductEditor";

// One editable row: stock and price per size, plus visibility toggles.
// Changes are local until "Save" so a half-typed number never hits the API.
// Prices are edited as text ("38.50") and only turned into cents on save.
const toDraft = (p) => ({
  active: p.active,
  featured: p.featured,
  variants: p.variants.map((v) => ({ _id: v._id, size: v.size, stock: String(v.stock), price: (v.priceCents / 100).toFixed(2) })),
});

function ProductRow({ product, readOnly, onSaved }) {
  const [draft, setDraft] = useState(() => toDraft(product));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(product));

  const setVariant = (i, field, value) =>
    setDraft((d) => ({ ...d, variants: d.variants.map((v, j) => (j === i ? { ...v, [field]: value } : v)) }));

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await api.patch(`/admin/products/${product._id}`, {
        active: draft.active,
        featured: draft.featured,
        variants: draft.variants.map(({ _id, size, price, stock }) => ({ _id, size, priceCents: Math.round(Number(price) * 100), stock: Number(stock) })),
      });
      onSaved(res.data);
    } catch (err) {
      setError(errorMessage(err, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-b border-border align-top last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 shrink-0 rounded bg-wall p-1">
            <Poster art={product.art} name={product.name} caption={false} className="w-full" />
          </div>
          <div>
            <Link to={`/p/${product.slug}`} className="font-medium hover:underline">{product.name}</Link>
            <p className="text-xs text-muted">{product.collectionName}</p>
          </div>
        </div>
        {error && <p className="mt-2 text-xs whitespace-normal text-bad">{error}</p>}
      </td>
      {draft.variants.map((v, i) => (
        <td key={v._id} className="px-2 py-3">
          <p className="mb-1 text-[11px] text-faint">{v.size}</p>
          <div className="flex gap-1">
            <input
              type="number"
              min="0"
              value={v.stock}
              onChange={(e) => setVariant(i, "stock", e.target.value)}
              disabled={readOnly}
              className={`input w-16 px-2 py-1 text-xs ${Number(v.stock) === 0 ? "text-bad" : Number(v.stock) <= 3 ? "text-warn-text" : ""}`}
              aria-label={`${product.name} ${v.size} stock`}
              title="Stock"
            />
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-faint">$</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={v.price}
                onChange={(e) => setVariant(i, "price", e.target.value)}
                disabled={readOnly}
                className="input w-20 py-1 pr-2 pl-5 text-xs"
                aria-label={`${product.name} ${v.size} price`}
                title="Price"
              />
            </div>
          </div>
        </td>
      ))}
      <td className="px-3 py-3 text-xs">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={draft.active} onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))} disabled={readOnly} />
          Listed
        </label>
        <label className="mt-1 flex items-center gap-1.5">
          <input type="checkbox" checked={draft.featured} onChange={(e) => setDraft((d) => ({ ...d, featured: e.target.checked }))} disabled={readOnly} />
          Featured
        </label>
      </td>
      <td className="px-4 py-3 text-right">
        {dirty && (
          <div className="flex justify-end gap-1">
            <button onClick={() => setDraft(toDraft(product))} className="btn btn-ghost btn-sm">Undo</button>
            <button onClick={save} disabled={saving} className="btn btn-primary btn-sm">{saving ? "Saving…" : "Save"}</button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function AdminProducts() {
  const { readOnly } = useOutletContext();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    return api
      .get("/admin/products")
      .then((res) => setProducts(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load products")));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Edit stock and prices inline, then save the row. Unlisted prints are hidden from the shop.</p>
        <button onClick={() => setCreating(true)} disabled={readOnly} className="btn btn-primary" title={readOnly ? "Disabled in the demo" : undefined}>
          + New poster
        </button>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {!products && !error && <Spinner />}
      {products && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Poster</th>
                <th className="px-2 py-2.5 font-medium" colSpan={3}>Stock · price per size</th>
                <th className="px-3 py-2.5 font-medium">Visibility</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <ProductRow
                  key={`${p._id}-${p.updatedAt}`}
                  product={p}
                  readOnly={readOnly}
                  onSaved={(saved) => setProducts((prev) => prev.map((x) => (x._id === saved._id ? saved : x)))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && (
        <ProductEditor
          collections={[...new Set((products ?? []).map((p) => p.collectionName))]}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}
