import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import DemoButton from "../components/DemoButton";
import Poster from "../components/Poster";
import ProductCard from "../components/ProductCard";
import { Spinner } from "../components/ui";

const POINTS = [
  ["Drawn by code", "Every poster is generated from a seed and a palette. Same seed, same print, every time."],
  ["Printed to last", "200 gsm matte archival paper and pigment inks, in A4, A3 or A2."],
  ["Ships rolled", "Free shipping on orders over $75 anywhere in Canada. Tax worked out by province."],
];

export default function Home() {
  const { user } = useAuth();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    api.get("/products").then((res) => setProducts(res.data)).catch(() => setProducts([]));
  }, []);

  const featured = products?.filter((p) => p.featured) ?? [];
  const collections = products ? [...new Map(products.map((p) => [p.collectionName, p])).values()] : [];
  const hero = featured.slice(0, 3);

  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-16 md:grid-cols-2 md:pt-20">
        <div>
          <p className="text-sm font-medium tracking-wide text-accent-text uppercase">Generative art prints</p>
          <h1 className="heading mt-3 text-5xl leading-[1.05] md:text-6xl">Posters drawn by code, printed on paper.</h1>
          <p className="mt-5 max-w-md text-lg text-muted">
            Tides, sunsets and survey-map contours from the Atlantic coast, each one generated from a single number.
          </p>
          <div className="mt-8 flex flex-wrap items-start gap-3">
            <Link to="/shop" className="btn btn-primary btn-lg">Shop all prints</Link>
            {!user && (
              <DemoButton className="btn btn-lg" to="/shop">
                Try a demo account
              </DemoButton>
            )}
          </div>
        </div>
        <div className="relative mx-auto h-[420px] w-full max-w-md" aria-hidden="true">
          {hero.length === 3 && (
            <>
              <Poster art={hero[1].art} name={hero[1].name} className="poster-shadow absolute top-10 left-0 w-[46%] -rotate-6" />
              <Poster art={hero[2].art} name={hero[2].name} className="poster-shadow absolute top-14 right-0 w-[46%] rotate-6" />
              <Poster art={hero[0].art} name={hero[0].name} className="poster-shadow absolute top-0 left-1/2 w-[54%] -translate-x-1/2" />
            </>
          )}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          {POINTS.map(([title, body]) => (
            <div key={title}>
              <h2 className="font-medium">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="heading text-3xl">Collections</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {collections.map((p) => (
            <Link key={p.collectionName} to={`/shop?collection=${encodeURIComponent(p.collectionName)}`} className="group">
              <div className="flex aspect-square items-center justify-center rounded-xl bg-wall p-[14%] group-hover:bg-surface-2">
                <Poster art={p.art} name={p.name} caption={false} className="poster-shadow h-full w-auto" />
              </div>
              <p className="mt-2 font-medium group-hover:underline">{p.collectionName}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="heading text-3xl">Featured</h2>
          <Link to="/shop" className="text-sm font-medium text-accent-text hover:underline">See all →</Link>
        </div>
        {!products ? (
          <Spinner />
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {featured.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
