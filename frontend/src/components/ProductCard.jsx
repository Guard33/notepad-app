import { Link } from "react-router-dom";
import Poster from "./Poster";
import { money } from "../lib/money";

export default function ProductCard({ product }) {
  return (
    <Link to={`/p/${product.slug}`} className="group block">
      <div className="relative flex aspect-[4/5] items-center justify-center rounded-xl bg-wall p-[12%] transition-colors group-hover:bg-surface-2">
        <Poster art={product.art} name={product.name} className="poster-shadow h-full w-auto transition-transform duration-300 group-hover:-translate-y-1" />
        {!product.inStock && <span className="badge absolute top-3 left-3 bg-surface text-muted">Sold out</span>}
        {product.inStock && product.lowStock && <span className="badge absolute top-3 left-3 bg-warn-soft text-warn-text">Almost gone</span>}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium group-hover:underline">{product.name}</h3>
          <p className="text-sm text-muted">{product.collectionName}</p>
        </div>
        <p className="text-sm whitespace-nowrap text-muted">from {money(product.fromPriceCents)}</p>
      </div>
    </Link>
  );
}
