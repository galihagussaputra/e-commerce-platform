import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { adjustStock, fetchInventory, fetchMovements } from '../../features/admin/adminSlice';
import { Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { Badge, Price } from '../../components/ui/Display';
import { ErrorState, Spinner } from '../../components/ui/Feedback';

export default function AdminInventory() {
  const dispatch = useDispatch();
  const { inventory, movements, loading, error } = useSelector((state) => state.admin);
  const [form, setForm] = useState({ productId: '', delta: '', reason: '' });
  const [notice, setNotice] = useState('');

  useEffect(() => {
    dispatch(fetchInventory());
    dispatch(fetchMovements({ limit: 50 }));
  }, [dispatch]);

  const submit = async (event) => {
    event.preventDefault();
    setNotice('');
    try {
      await dispatch(adjustStock({ productId: form.productId, delta: Number(form.delta), reason: form.reason })).unwrap();
      setForm({ productId: '', delta: '', reason: '' });
      setNotice('Stock adjusted and movement recorded.');
      dispatch(fetchInventory());
      dispatch(fetchMovements({ limit: 50 }));
    } catch {
      setNotice('');
    }
  };

  const rows = inventory?.rows || [];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <p className="mt-1 text-sm text-muted">Stock, reservations and every movement are tracked per product.</p>

      {error && <div className="mt-5"><ErrorState message={error} /></div>}
      {notice && <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Products', inventory?.totals?.products ?? '—'],
          ['Units in stock', inventory?.totals?.units ?? '—'],
          ['Reserved', inventory?.totals?.reserved ?? '—'],
          ['Stock value', inventory ? <Price value={inventory.totals.value} /> : '—'],
        ].map(([label, value]) => (
          <div key={label} className="surface p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>
        ))}
      </div>

      <section className="surface mt-6 p-5">
        <h2 className="text-sm font-semibold">Stock adjustment</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-[1.5fr_0.7fr_1.5fr_auto] md:items-end" onSubmit={submit}>
          <Input id="adj-product" label="Product ID" placeholder="Paste product id from the table" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required />
          <Input id="adj-delta" label="Delta" inputMode="numeric" placeholder="+10 or -3" value={form.delta} onChange={(e) => setForm({ ...form, delta: e.target.value })} required />
          <Input id="adj-reason" label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <Button type="submit">Adjust</Button>
        </form>
      </section>

      <section className="surface mt-6 overflow-x-auto">
        {loading && !rows.length ? <Spinner label="Loading inventory" /> : (
          <table className="data-table min-w-[720px]">
            <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Reserved</th><th>Available</th><th>Value</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <td><p className="font-medium">{row.name}</p><p className="text-xs text-muted">{row.sku || '—'}</p></td>
                  <td className="text-muted">{row.category || '—'}</td>
                  <td>{row.stock}</td>
                  <td>{row.reserved}</td>
                  <td>{row.available <= row.lowStockThreshold ? <Badge tone="low">{row.available}</Badge> : row.available}</td>
                  <td><Price value={row.value} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="surface mt-6 overflow-x-auto">
        <h2 className="px-5 pt-5 text-sm font-semibold">Stock movements</h2>
        <table className="data-table mt-3 min-w-[720px]">
          <thead><tr><th>Time</th><th>Product</th><th>Type</th><th>Qty</th><th>Balance</th><th>Reason</th></tr></thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement._id}>
                <td className="whitespace-nowrap text-xs text-muted">{new Date(movement.createdAt).toLocaleString('en-ID')}</td>
                <td>{movement.product?.name || '—'}</td>
                <td><Badge tone={movement.type === 'out' ? 'default' : movement.type === 'reserve' ? 'pending' : 'active'}>{movement.type}</Badge></td>
                <td>{movement.quantity}</td>
                <td>{movement.balanceAfter}</td>
                <td className="max-w-xs truncate text-muted">{movement.reason}</td>
              </tr>
            ))}
            {!movements.length && <tr><td colSpan={6} className="text-muted">No movements recorded.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
