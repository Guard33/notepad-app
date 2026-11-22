import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Logo } from "./ui";

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 7h12l-1 13H7L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}

export default function StoreShell() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const canSeeAdmin = user && (user.role === "admin" || user.isDemo);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <Logo size={28} />
            <span className="heading text-lg">Tidewater Prints</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm sm:flex">
            <NavLink to="/shop" className={({ isActive }) => (isActive ? "font-medium text-text" : "text-muted hover:text-text")}>
              Shop all
            </NavLink>
            {canSeeAdmin && (
              <NavLink to="/admin" className={({ isActive }) => (isActive ? "font-medium text-text" : "text-muted hover:text-text")}>
                Admin
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {user ? (
              <>
                <Link to="/account/orders" className="btn btn-ghost btn-sm">
                  {user.isDemo ? <span className="badge bg-warn-soft text-warn-text">Demo</span> : "Orders"}
                </Link>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                  {user.isDemo ? "Exit demo" : "Log out"}
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
            )}
            <Link to="/cart" className="btn btn-ghost relative ml-1 px-2.5" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
              <CartIcon />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-bg">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
        {user?.isDemo && (
          <div className="border-t border-border bg-warn-soft">
            <p className="mx-auto max-w-6xl px-4 py-2 text-sm text-warn-text">
              Demo account: shop and check out for real (no payment is taken), and{" "}
              <Link to="/admin" className="font-medium underline underline-offset-2">look around the admin dashboard</Link>. It all disappears within 24 hours.
            </p>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-faint">
          <p>
            Tidewater Prints is a portfolio project. No payments are taken and no orders ship.
          </p>
          <a href="https://github.com/Guard33/notepad-app" className="hover:text-text hover:underline">Source on GitHub</a>
        </div>
      </footer>
    </div>
  );
}
