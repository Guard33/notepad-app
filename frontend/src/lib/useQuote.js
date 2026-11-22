import { useEffect, useState } from "react";
import api from "../api/client";

const EMPTY = { lines: [], problems: [], subtotalCents: 0, shippingCents: 0, taxCents: null, totalCents: 0 };

// Asks the server to price the cart. Re-runs whenever the cart or province
// changes; the server's answer (prices, stock problems, tax) is the truth.
export function useQuote(payload, province) {
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const key = JSON.stringify([payload, province]);

  const empty = payload.length === 0;

  useEffect(() => {
    let cancelled = false;
    const [items, prov] = JSON.parse(key);
    if (items.length === 0) return;
    api
      .post("/cart/quote", { items, ...(prov ? { province: prov } : {}) })
      .then((res) => !cancelled && (setQuote(res.data), setError("")))
      .catch(() => !cancelled && setError("Couldn't update prices. Check your connection."));
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { quote: empty ? EMPTY : quote, error };
}

export function useShopConfig() {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    api.get("/config").then((res) => setConfig(res.data)).catch(() => {});
  }, []);
  return config;
}
