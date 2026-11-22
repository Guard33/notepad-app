import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import ProductCard from "../components/ProductCard";
import { EmptyState, ErrorNote, Spinner } from "../components/ui";

const SORTS = [
  ["featured", "Featured"],
  ["newest", "Newest"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
  ["name", "Name"],
];

// Filters live in the URL, so a filtered view can be shared or bookmarked.
export default function Shop() {
  const [params, setParams] = useSearchParams();
  const collection = params.get("collection") ?? "";
  const sort = params.get("sort") ?? "featured";
  const q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState(null);
  const [error, setError] = useState("");

  function update(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  useEffect(() => {
    api.get("/collections").then((res) => setCollections(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== q) update("q", search.trim());
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const query = {};
    if (collection) query.collection = collection;
    if (sort !== "featured") query.sort = sort;
    if (q) query.q = q;
    api
      .get("/products", { params: query })
      .then((res) => setProducts(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load the shop")));
  }, [collection, sort, q]);

  const total = collections.reduce((n, c) => n + c.count, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="heading text-4xl">{collection || "All prints"}</h1>

      <div className="mt-8 grid gap-8 md:grid-cols-[200px_1fr]">
        <aside className="space-y-6">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search prints…" className="input" aria-label="Search prints" />
          <nav aria-label="Collections">
            <p className="mb-2 text-xs font-medium tracking-wide text-faint uppercase">Collections</p>
            <ul className="space-y-0.5 text-sm">
              {[{ name: "", count: total }, ...collections].map((c) => (
                <li key={c.name || "all"}>
                  <button
                    onClick={() => update("collection", c.name)}
                    className={`flex w-full justify-between rounded-md px-2 py-1.5 text-left ${collection === c.name ? "bg-surface-2 font-medium" : "text-muted hover:text-text"}`}
                  >
                    {c.name || "All prints"}
                    <span className="text-faint">{c.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">{products ? `${products.length} print${products.length === 1 ? "" : "s"}` : ""}</p>
            <select value={sort} onChange={(e) => update("sort", e.target.value === "featured" ? "" : e.target.value)} className="input w-auto" aria-label="Sort">
              {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <ErrorNote>{error}</ErrorNote>
          {!products && !error && <Spinner />}
          {products?.length === 0 && <EmptyState title="No prints match">Try a different search or collection.</EmptyState>}
          {products?.length > 0 && (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-3">
              {products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
