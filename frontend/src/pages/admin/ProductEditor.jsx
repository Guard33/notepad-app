import { useState } from "react";
import api, { errorMessage } from "../../api/client";
import Poster from "../../components/Poster";
import { ErrorNote, Modal } from "../../components/ui";

const STYLES = [
  ["waves", "Waves"],
  ["bauhaus", "Bauhaus grid"],
  ["sun", "Sunset"],
  ["contours", "Contours"],
];

const PALETTES = [
  ["#0b2545", "#13315c", "#134074", "#8da9c4", "#eef4ed"],
  ["#f2e8cf", "#e63946", "#1d3557", "#f4a261", "#2a9d8f"],
  ["#ffcdb2", "#ffb4a2", "#e5989b", "#b5838d", "#6d6875"],
  ["#14213d", "#fca311", "#e5e5e5", "#243b6b", "#000000"],
  ["#fefae0", "#dda15e", "#bc6c25", "#606c38", "#283618"],
  ["#f1faee", "#a8dadc", "#457b9d", "#1d3557", "#e63946"],
];

const newSeed = () => Math.floor(Math.random() * 10000);

// Create a poster with a live preview: pick a style and palette, reroll the
// seed until you like it, set prices and stock.
export default function ProductEditor({ collections, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    collectionName: collections[0] ?? "",
    style: "waves",
    palette: PALETTES[0],
    seed: newSeed(),
    variants: [
      { size: "A4", price: "24", stock: "20" },
      { size: "A3", price: "38", stock: "10" },
      { size: "A2", price: "58", stock: "5" },
    ],
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const art = { style: form.style, seed: form.seed, palette: form.palette };

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/admin/products", {
        name: form.name,
        tagline: form.tagline,
        description: form.tagline,
        collectionName: form.collectionName,
        art,
        variants: form.variants.map((v) => ({ size: v.size, priceCents: Math.round(Number(v.price) * 100), stock: Number(v.stock) })),
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err, "Couldn't create the poster"));
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New poster" width="max-w-3xl">
      <form onSubmit={submit} className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div>
          <div className="flex justify-center rounded-xl bg-wall p-5">
            <Poster art={art} name={form.name || "Untitled"} className="poster-shadow w-full" />
          </div>
          <button type="button" onClick={() => set({ seed: newSeed() })} className="btn btn-sm mt-3 w-full">↻ New variation</button>
        </div>
        <div className="space-y-4">
          <ErrorNote>{error}</ErrorNote>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pe-name" className="label">Name</label>
              <input id="pe-name" className="input" value={form.name} onChange={(e) => set({ name: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="pe-col" className="label">Collection</label>
              <input id="pe-col" className="input" list="pe-cols" value={form.collectionName} onChange={(e) => set({ collectionName: e.target.value })} required />
              <datalist id="pe-cols">{collections.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div>
            <label htmlFor="pe-tag" className="label">One-line description</label>
            <input id="pe-tag" className="input" value={form.tagline} onChange={(e) => set({ tagline: e.target.value })} />
          </div>
          <div>
            <p className="label">Style</p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map(([value, label]) => (
                <button key={value} type="button" onClick={() => set({ style: value })} className={`btn btn-sm ${form.style === value ? "btn-primary" : ""}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label">Palette</p>
            <div className="flex flex-wrap gap-2">
              {PALETTES.map((p) => (
                <button
                  key={p.join()}
                  type="button"
                  onClick={() => set({ palette: p })}
                  className={`flex overflow-hidden rounded-md border-2 ${form.palette === p ? "border-accent" : "border-transparent"}`}
                  aria-label={`Palette ${p.join(", ")}`}
                >
                  {p.map((c) => <span key={c} className="h-6 w-4" style={{ background: c }} />)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label">Sizes</p>
            <div className="grid grid-cols-3 gap-2">
              {form.variants.map((v, i) => (
                <div key={v.size} className="rounded-lg border border-border p-2 text-xs">
                  <p className="mb-1.5 font-medium">{v.size}</p>
                  <label className="text-faint">Price ($)
                    <input type="number" min="1" step="0.01" className="input mt-0.5 py-1 text-xs" value={v.price} onChange={(e) => set({ variants: form.variants.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)) })} required />
                  </label>
                  <label className="mt-1.5 block text-faint">Stock
                    <input type="number" min="0" className="input mt-0.5 py-1 text-xs" value={v.stock} onChange={(e) => set({ variants: form.variants.map((x, j) => (j === i ? { ...x, stock: e.target.value } : x)) })} required />
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving ? "Creating…" : "Create poster"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
