import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, Menu, X, UserRound, LayoutDashboard } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import { selectCartCount } from '../../features/cart/cartSlice';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { user } = useSelector((state) => state.auth);
  const count = useSelector(selectCartCount);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(query.trim() ? `/products?q=${encodeURIComponent(query.trim())}` : '/products');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="page-shell flex h-16 items-center gap-4 lg:gap-8">
        <Link to="/" className="flex shrink-0 items-center gap-2" onClick={() => setMenuOpen(false)}>
          <span className="h-4 w-4 bg-brand" />
          <span className="text-sm font-bold uppercase tracking-[0.2em]">Katalog</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <Link className="hover:text-ink" to="/products">Shop all</Link>
          <Link className="hover:text-ink" to="/products?category=audio">Audio</Link>
          <Link className="hover:text-ink" to="/products?category=wearables">Wearables</Link>
          <Link className="hover:text-ink" to="/products?category=workspace">Workspace</Link>
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden max-w-xs flex-1 items-center sm:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              aria-label="Search products"
              placeholder="Search products"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="field py-2 pl-9"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          {user?.role === 'admin' && (
            <Link to="/admin" className="hidden rounded-md p-2 text-muted hover:bg-canvas hover:text-ink lg:block" aria-label="Admin dashboard">
              <LayoutDashboard className="h-5 w-5" />
            </Link>
          )}
          <div className="relative">
            <button
              onClick={() => setAccountOpen((open) => !open)}
              className="rounded-md p-2 text-muted hover:bg-canvas hover:text-ink"
              aria-label="Account menu"
              aria-expanded={accountOpen}
            >
              <UserRound className="h-5 w-5" />
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-11 w-48 overflow-hidden rounded-md border border-line bg-white py-1 shadow-soft">
                {user ? (
                  <>
                    <div className="border-b border-line px-3 py-2 text-xs text-muted">Signed in as<br /><span className="font-semibold text-ink">{user.name}</span></div>
                    <Link className="block px-3 py-2 text-sm hover:bg-canvas" to="/account" onClick={() => setAccountOpen(false)}>Account</Link>
                    <Link className="block px-3 py-2 text-sm hover:bg-canvas" to="/orders" onClick={() => setAccountOpen(false)}>Orders</Link>
                    <button
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-canvas"
                      onClick={() => { dispatch(logout()); setAccountOpen(false); }}
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link className="block px-3 py-2 text-sm hover:bg-canvas" to="/login" onClick={() => setAccountOpen(false)}>Sign in</Link>
                    <Link className="block px-3 py-2 text-sm hover:bg-canvas" to="/register" onClick={() => setAccountOpen(false)}>Create account</Link>
                  </>
                )}
              </div>
            )}
          </div>
          <Link to="/cart" className="relative rounded-md p-2 text-muted hover:bg-canvas hover:text-ink" aria-label={`Cart with ${count} items`}>
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          <button
            className="rounded-md p-2 text-muted hover:bg-canvas hover:text-ink md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-white px-4 py-4 md:hidden">
          <form onSubmit={submitSearch} className="mb-3">
            <input
              aria-label="Search products"
              placeholder="Search products"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="field"
            />
          </form>
          <nav className="grid gap-1 text-sm">
            {[
              ['Shop all', '/products'],
              ['Audio', '/products?category=audio'],
              ['Wearables', '/products?category=wearables'],
              ['Workspace', '/products?category=workspace'],
              ['Orders', '/orders'],
              ['Account', '/account'],
            ].map(([label, to]) => (
              <Link key={to} to={to} className="rounded-md px-2 py-2 hover:bg-canvas" onClick={() => setMenuOpen(false)}>{label}</Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
