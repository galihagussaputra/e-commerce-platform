import { Outlet, Link } from 'react-router-dom';
import Header from './Header';

export default function CustomerLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-line bg-white">
        <div className="page-shell grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 bg-brand" />
              <span className="text-sm font-bold uppercase tracking-[0.2em]">Katalog</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              Considered goods for everyday life. Curated audio, wearables and workspace essentials.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide">Shop</h3>
            <div className="mt-3 grid gap-2 text-sm text-muted">
              <Link to="/products" className="hover:text-ink">All products</Link>
              <Link to="/products?category=audio" className="hover:text-ink">Audio</Link>
              <Link to="/products?category=wearables" className="hover:text-ink">Wearables</Link>
              <Link to="/products?category=workspace" className="hover:text-ink">Workspace</Link>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide">Account</h3>
            <div className="mt-3 grid gap-2 text-sm text-muted">
              <Link to="/account" className="hover:text-ink">Profile & addresses</Link>
              <Link to="/orders" className="hover:text-ink">Order history</Link>
              <Link to="/cart" className="hover:text-ink">Cart</Link>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide">Payments</h3>
            <p className="mt-3 text-sm text-muted">Secure checkout powered by Stripe. Test mode only in this environment.</p>
          </div>
        </div>
        <div className="border-t border-line py-5 text-center text-xs text-muted">© {new Date().getFullYear()} Katalog. Portfolio demonstration store.</div>
      </footer>
    </div>
  );
}
