import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Boxes, ClipboardList, CreditCard, TrendingUp } from 'lucide-react';
import { fetchDashboard } from '../../features/admin/adminSlice';
import { Price, Badge } from '../../components/ui/Display';
import { ErrorState, Spinner } from '../../components/ui/Feedback';

const ranges = { 7: 7, 30: 30, 90: 90 };

const dateParams = (days) => {
  if (!days) return {};
  const to = new Date();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
};

const maxOf = (rows) => Math.max(1, ...rows.map((row) => row.revenue || row.total || 0));

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const { summary, trend, topProducts, recentTransactions, lowStock, loading, error } = useSelector((state) => state.admin);
  const [days, setDays] = useState(30);

  useEffect(() => { dispatch(fetchDashboard(dateParams(ranges[days]))); }, [dispatch, days]);

  const cards = [
    ['Revenue', summary ? <Price value={summary.totalRevenue} /> : '—', <TrendingUp className="h-4 w-4" />],
    ['Orders', summary?.totalOrders ?? '—', <ClipboardList className="h-4 w-4" />],
    ['Awaiting payment', summary?.pendingPayments ?? '—', <CreditCard className="h-4 w-4" />],
    ['Completed', summary?.completedOrders ?? '—', <Boxes className="h-4 w-4" />],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="mt-1 text-sm text-muted">Live aggregation from orders, payments and inventory.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="range" className="text-muted">Range</label>
          <select id="range" className="field w-36 py-2" value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {error && <div className="mt-5"><ErrorState message={error} onRetry={() => dispatch(fetchDashboard(dateParams(ranges[days])))} /></div>}

      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map(([label, value, icon]) => (
          <div key={label} className="surface p-4">
            <div className="flex items-center justify-between text-muted">{label}{icon}</div>
            <p className="mt-2 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {loading && !summary ? <Spinner label="Loading dashboard" /> : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Sales trend</h2>
              <Link to="/admin/analytics" className="text-xs font-semibold text-brand hover:underline">Full report →</Link>
            </div>
            {trend.length ? (
              <div className="mt-5 flex h-48 items-end gap-2">
                {trend.slice(-30).map((row) => (
                  <div key={row.date} className="group flex flex-1 flex-col items-center justify-end gap-1" title={`${row.date}: ${row.revenue}`}>
                    <span className="hidden text-[10px] text-muted group-hover:block">{row.orders}</span>
                    <div className="w-full bg-brand/80" style={{ height: `${Math.max(4, (row.revenue / maxOf(trend)) * 100)}%` }} />
                    <span className="w-full truncate text-center text-[10px] text-muted">{row.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="mt-6 text-sm text-muted">No paid orders in this range.</p>}
          </section>

          <section className="surface p-5">
            <h2 className="text-sm font-semibold">Low stock</h2>
            <div className="mt-4 divide-y divide-line">
              {lowStock.length ? lowStock.map((product) => (
                <div key={product._id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="truncate pr-2">{product.name}</span>
                  <Badge tone="low">{product.available} left</Badge>
                </div>
              )) : <p className="py-4 text-sm text-muted">All products have healthy stock.</p>}
            </div>
            <Link to="/admin/inventory" className="mt-4 inline-block text-xs font-semibold text-brand hover:underline">Manage inventory →</Link>
          </section>

          <section className="surface p-5">
            <h2 className="text-sm font-semibold">Best-selling products</h2>
            <table className="data-table mt-4">
              <thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead>
              <tbody>
                {topProducts.map((row) => (
                  <tr key={row.productId}><td>{row.name}</td><td>{row.unitsSold}</td><td><Price value={row.revenue} /></td></tr>
                ))}
                {!topProducts.length && <tr><td colSpan={3} className="text-muted">No sales in this range.</td></tr>}
              </tbody>
            </table>
          </section>

          <section className="surface p-5">
            <h2 className="text-sm font-semibold">Recent transactions</h2>
            <div className="mt-4 divide-y divide-line">
              {recentTransactions.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0"><p className="truncate font-medium">{row.orderNumber}</p><p className="truncate text-xs text-muted">{row.customer}</p></div>
                  <div className="text-right"><Price value={row.total} className="block text-xs" /><Badge tone={row.status}>{row.status}</Badge></div>
                </div>
              ))}
              {!recentTransactions.length && <p className="py-4 text-sm text-muted">No transactions yet.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
