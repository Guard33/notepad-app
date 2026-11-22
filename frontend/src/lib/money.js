const formatter = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

// All money is integer cents end to end; this is the only place it becomes
// dollars, purely for display.
export function money(cents) {
  return formatter.format((cents ?? 0) / 100);
}

export function shortDate(value) {
  return new Date(value).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}
