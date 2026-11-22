import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import { useCart } from "../context/CartContext";
import Poster from "../components/Poster";
import ProductCard from "../components/ProductCard";
import QtyStepper from "../components/QtyStepper";
import { ErrorNote, Spinner } from "../components/ui";
import { money } from "../lib/money";

const DIMENSIONS = { A4: "21 × 29.7 cm", A3: "29.7 × 42 cm", A2: "42 × 59.4 cm" };

function stockNote(stock) {
  if (stock === 0) return { text: "Sold out", tone: "text-faint" };
  if (stock <= 3) return { text: `Only ${stock} left`, tone: "text-warn-text" };
  return { text: "In stock", tone: "text-good" };
}

function ProductView({ product, related }) {
  const { add } = useCart();
  const firstAvailable = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstAvailable._id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const variant = product.variants.find((v) => v._id === variantId);
  const note = stockNote(variant.stock);

  function handleAdd() {
    add(
      {
        productId: product._id,
        variantId: variant._id,
        slug: product.slug,
        name: product.name,
        size: variant.size,
        art: product.art,
        unitPriceCents: variant.priceCents,
      },
      qty
    );
    setAdded(true);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="text-sm text-muted">
        <Link to="/shop" className="hover:text-text">Shop</Link>
        {" / "}
        <Link to={`/shop?collection=${encodeURIComponent(product.collectionName)}`} className="hover:text-text">{product.collectionName}</Link>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-[1.1fr_1fr]">
        <div className="flex items-center justify-center rounded-2xl bg-wall p-[10%]">
          <Poster art={product.art} name={product.name} className="poster-shadow w-full max-w-md" />
        </div>

        <div>
          <h1 className="heading text-4xl">{product.name}</h1>
          <p className="mt-2 text-2xl">{money(variant.priceCents)}</p>
          <p className="mt-4 leading-relaxed text-muted">{product.description}</p>

          <fieldset className="mt-8">
            <legend className="label">Size</legend>
            <div className="grid grid-cols-3 gap-2">
              {product.variants.map((v) => (
                <label
                  key={v._id}
                  className={`cursor-pointer rounded-lg border p-3 text-center text-sm transition-colors ${
                    v._id === variantId ? "border-accent bg-accent-soft" : "border-border-strong hover:border-accent"
                  } ${v.stock === 0 ? "opacity-50" : ""}`}
                >
                  <input type="radio" name="size" value={v._id} checked={v._id === variantId} onChange={() => { setVariantId(v._id); setAdded(false); }} className="sr-only" />
                  <span className="block font-medium">{v.size}</span>
                  <span className="block text-xs text-muted">{money(v.priceCents)}</span>
                  {v.stock === 0 && <span className="block text-xs text-faint">Sold out</span>}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-faint">{variant.size}: {DIMENSIONS[variant.size]}</p>
          </fieldset>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QtyStepper value={qty} onChange={setQty} max={Math.max(1, Math.min(10, variant.stock))} />
            <button onClick={handleAdd} disabled={variant.stock === 0} className="btn btn-primary btn-lg flex-1">
              {variant.stock === 0 ? "Sold out" : "Add to cart"}
            </button>
          </div>
          <p className={`mt-3 text-sm font-medium ${note.tone}`}>{note.text}</p>

          {added && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-good-soft px-4 py-3 text-sm text-good" role="status">
              Added to your cart.
              <Link to="/cart" className="font-medium underline">View cart</Link>
            </div>
          )}

          <ul className="mt-8 space-y-2 border-t border-border pt-6 text-sm text-muted">
            <li>Free shipping in Canada on orders over $75, otherwise $8 flat.</li>
            <li>Printed to order on 200 gsm matte archival paper.</li>
            <li>Frame not included.</li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="heading text-2xl">More from {product.collectionName}</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3">
            {related.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

export default function ProductPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/products/${slug}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load this print")));
  }, [slug]);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <ErrorNote>{error}</ErrorNote>
        <Link to="/shop" className="btn">← Back to the shop</Link>
      </div>
    );
  }
  if (!data || data.product.slug !== slug) return <Spinner />;
  // Keyed by product so switching to a related print resets size/qty.
  return <ProductView key={data.product._id} product={data.product} related={data.related} />;
}
