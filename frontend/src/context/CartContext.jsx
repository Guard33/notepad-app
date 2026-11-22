import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const KEY = "tidewater.cart.v1";

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// The cart lives in the browser so guests can shop before signing in.
// Each line keeps a copy of the name/size/art/price for instant display,
// but checkout always re-prices from the server: the copy is never trusted.
export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      // storage full or blocked: the cart still works for this visit
    }
  }, [items]);

  const add = useCallback((line, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === line.variantId);
      if (existing) {
        return prev.map((i) => (i.variantId === line.variantId ? { ...i, qty: Math.min(10, i.qty + qty) } : i));
      }
      return [...prev, { ...line, qty: Math.min(10, qty) }];
    });
  }, []);

  const setQty = useCallback((variantId, qty) => {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => i.variantId !== variantId) : prev.map((i) => (i.variantId === variantId ? { ...i, qty: Math.min(10, qty) } : i))
    );
  }, []);

  const remove = useCallback((variantId) => setItems((prev) => prev.filter((i) => i.variantId !== variantId)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      // Just ids and quantities: what the API needs.
      payload: items.map(({ productId, variantId, qty }) => ({ productId, variantId, qty })),
      add,
      setQty,
      remove,
      clear,
    }),
    [items, add, setQty, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
