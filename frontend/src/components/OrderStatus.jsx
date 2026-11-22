const STYLES = {
  paid: ["bg-accent-soft text-accent-text", "Paid · preparing"],
  fulfilled: ["bg-good-soft text-good", "Shipped"],
  cancelled: ["bg-surface-2 text-muted", "Cancelled"],
};

export default function OrderStatus({ status }) {
  const [cls, label] = STYLES[status] ?? STYLES.paid;
  return <span className={`badge ${cls}`}>{label}</span>;
}
