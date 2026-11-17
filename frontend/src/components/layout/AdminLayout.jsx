import { Outlet, NavLink, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { LayoutDashboard, Package, Boxes, ClipboardList, ChartNoAxesCombined, Store, LogOut } from 'lucide-react';
import { logout } from '../../features/auth/authSlice';

const links = [
  ['Overview', '/admin', LayoutDashboard],
  ['Products', '/admin/products', Package],
  ['Inventory', '/admin/inventory', Boxes],
  ['Orders', '/admin/orders', ClipboardList],
  ['Analytics', '/admin/analytics', ChartNoAxesCombined],
];

export default function AdminLayout() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  return (
    <div className="min-h-screen bg-[#f5f6f4] lg:flex">
      <aside className="bg-ink text-white lg:w-60 lg:shrink-0">
        <div className="flex items-center justify-between px-5 py-5 lg:block">
          <Link to="/" className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 bg-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Katalog</span>
          </Link>
          <span className="rounded bg-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-white/70">Admin</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-0.5 lg:px-3 lg:pb-6">
          {links.map(([label, to, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 px-5 py-4 lg:block">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs text-white/50">{user?.email}</p>
          <button
            className="mt-3 flex items-center gap-2 text-xs text-white/60 hover:text-white"
            onClick={() => dispatch(logout())}
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-between border-b border-line bg-white px-5">
          <p className="text-sm font-semibold">Operations console</p>
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-xs text-muted hover:text-ink">
              <Store className="h-4 w-4" /> View store
            </Link>
            <button className="text-xs text-muted lg:hidden" onClick={() => dispatch(logout())}>Sign out</button>
          </div>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
