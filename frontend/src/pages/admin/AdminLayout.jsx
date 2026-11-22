import { NavLink, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const TABS = [
  { to: "", label: "Dashboard", end: true },
  { to: "orders", label: "Orders" },
  { to: "products", label: "Products" },
];

export default function AdminLayout() {
  const { user } = useAuth();
  if (user.role !== "admin" && !user.isDemo) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="heading text-4xl">Admin</h1>
        {user.isDemo && (
          <span className="badge bg-warn-soft text-warn-text">Read-only preview: changes are disabled for demo accounts</span>
        )}
      </div>
      <nav className="mt-6 mb-8 flex gap-6 border-b border-border">
        {TABS.map((t) => (
          <NavLink key={t.label} to={t.to} end={t.end} className={({ isActive }) => `tab ${isActive ? "active" : ""}`}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet context={{ readOnly: user.role !== "admin" }} />
    </div>
  );
}
