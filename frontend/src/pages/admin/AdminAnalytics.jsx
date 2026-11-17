import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboard, fetchInventory, fetchUsers, updateUserRole } from '../../features/admin/adminSlice';
import { Input, Select } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { Badge, Price } from '../../components/ui/Display';
import { ErrorState, Spinner } from '../../components/ui/Feedback';

const isoDate = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);

export default function AdminAnalytics() {
  const dispatch = useDispatch();
  const { summary, trend, topProducts, recentTransactions, inventory, users, loading, error } = useSelector((state) => state.admin);
  const [from, setFrom] = useState(isoDate(30));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    dispatch(fetchDashboard({ from: new Date(from).toISOString(), to: new Date(`${to}T23:59:59`).toISOString() }));
    dispatch(fetchInventory());
    dispatch(fetchUsers());
  }, [dispatch, from, to]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Analytics & reports</h1>
      <p className="mt-1 text-sm text-muted">Aggregated from paid orders and live inventory — no sample data.</p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="w-40"><Input id="from-date" label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="w-40"><Input id="to-date" label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <Button variant="secondary" onClick={() => { setFrom(isoDate(30)); setTo(new Date().toISOString().slice(0, 10)); }}>Last 30 days</Button>
      </div>

      {error && <div className="mt-5"><ErrorState message={error} /></div>}
      {loading && !summary ? <Spinner label="Building report" /> : (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <section className="surface p-5">
            <h2 className="text-sm font-semibold">Period summary</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {[
                ['Revenue', summary ? <Price value={summary.totalRevenue} className="font-semibold" /> : '—'],
                ['Orders', summary?.totalOrders ?? '—'],
                ['Pending payments', summary?.pendingPayments ?? '—'],
                ['Completed', summary?.completedOrders ?? '—'],
                ['Cancelled', summary?.canceledOrders ?? '—'],
                ['Average order', summary ? <Price value={summary.averageOrderValue} className="font-semibold" /> : '—'],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-line pb-3">
                  <dt className="text-xs text-muted">{label}</dt><dd className="mt-1 text-lg font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="surface p-5">
            <h2 className="text-sm font-semibold">Daily sales</h2>
            <div className="mt-4 max-h-72 overflow-auto">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Orders</th><th>Revenue</th></tr></thead>
                <tbody>
                  {trend.map((row) => (
                    <tr key={row.date}><td>{row.date}</td><td>{row.orders}</td><td><Price value={row.revenue} /></td></tr>
                  ))}
                  {!trend.length && <tr><td colSpan={3} className="text-muted">No paid orders in this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="surface p-5">
            <h2 className="text-sm font-semibold">Best sellers</h2>
            <table className="data-table mt-4">
              <thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead>
              <tbody>
                {topProducts.map((row) => <tr key={row.productId}><td>{row.name}</td><td>{row.unitsSold}</td><td><Price value={row.revenue} /></td></tr>)}
                {!topProducts.length && <tr><td colSpan={3} className="text-muted">No sales in this period.</td></tr>}
              </tbody>
            </table>
          </section>

          <section className="surface p-5">
            <h2 className="text-sm font-semibold">Inventory position</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {[
                ['Products tracked', inventory?.totals?.products ?? '—'],
                ['Units on hand', inventory?.totals?.units ?? '—'],
                ['Reserved units', inventory?.totals?.reserved ?? '—'],
                ['Stock value', inventory ? <Price value={inventory.totals.value} /> : '—'],
              ].map(([label, value]) => <div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 text-lg font-semibold">{value}</dd></div>)}
            </dl>
          </section>

          <section className="surface p-5">
            <h2 className="text-sm font-semibold">Recent transactions</h2>
            <div className="mt-4 max-h-72 overflow-auto">
              <table className="data-table">
                <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {recentTransactions.map((row) => (
                    <tr key={row.id}><td>{row.orderNumber}</td><td className="text-muted">{row.customer}</td><td><Price value={row.total} /></td><td><Badge tone={row.status}>{row.status}</Badge></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="surface p-5">
            <h2 className="text-sm font-semibold">Users & roles</h2>
            <div className="mt-4 max-h-72 overflow-auto">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
                <tbody>
                  {users.map((user) => {
                    const id = user.id || user._id;
                    return (
                    <tr key={id}>
                      <td>{user.name}</td><td className="text-muted">{user.email}</td>
                      <td>
                        <Select
                          aria-label={`Role for ${user.name}`}
                          className="w-28 py-1.5 text-xs"
                          value={user.role}
                          onChange={(event) => dispatch(updateUserRole({ id, role: event.target.value }))}
                        >
                          <option value="user">user</option><option value="admin">admin</option>
                        </Select>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
