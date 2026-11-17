import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2 } from 'lucide-react';
import { fetchOrder, cancelOrder } from '../features/orders/ordersSlice';
import { Price, Badge } from '../components/ui/Display';
import Button from '../components/ui/Button';
import { ErrorState, Spinner } from '../components/ui/Feedback';

const formatDate = (value) => new Date(value).toLocaleString('en-ID', { dateStyle: 'medium', timeStyle: 'short' });

export default function OrderDetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const dispatch = useDispatch();
  const { current, loading, error } = useSelector((state) => state.orders);
  const user = useSelector((state) => state.auth.user);

  useEffect(() => { dispatch(fetchOrder(id)); }, [dispatch, id]);

  if (loading && !current) return <Spinner label="Loading order" />;
  if (error && !current) return <div className="page-shell py-10"><ErrorState message={error} /></div>;
  if (!current) return null;

  return (
    <div className="page-shell py-10">
      {params.get('payment') === 'success' && (
        <div className="mb-6 flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5" />
          Payment verified. Your order is confirmed and inventory has been updated.
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/orders" className="text-xs text-muted hover:text-ink">← All orders</Link>
          <h1 className="mt-2 text-3xl font-semibold">{current.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted">Placed {formatDate(current.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={current.status}>{current.status.replace('_', ' ')}</Badge>
          <Badge tone={current.paymentStatus}>{current.paymentStatus}</Badge>
          {user?.role === 'admin' && current.status === 'pending_payment' && (
            <Link to="/admin/orders" className="btn-secondary">Manage in admin</Link>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="surface overflow-hidden">
          <h2 className="border-b border-line px-5 py-4 text-sm font-semibold uppercase tracking-wide text-muted">Items</h2>
          <div className="divide-y divide-line">
            {current.items.map((item, index) => (
              <div key={`${item.product}-${index}`} className="flex gap-4 p-5">
                <img src={item.image || '/placeholder.svg'} alt="" className="h-16 w-16 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted">{item.quantity} × <Price value={item.unitPrice} /></p>
                </div>
                <Price value={item.lineTotal} className="font-semibold" />
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Totals</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd><Price value={current.subtotal} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd><Price value={current.shippingFee} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd><Price value={current.tax} /></dd></div>
              <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd><Price value={current.total} /></dd></div>
            </dl>
          </section>

          <section className="surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Shipping to</h2>
            <p className="mt-3 text-sm leading-relaxed">
              {current.shippingAddress?.fullName}<br />
              {current.shippingAddress?.line1}<br />
              {current.shippingAddress?.city} {current.shippingAddress?.postalCode}<br />
              {current.shippingAddress?.country}
            </p>
          </section>

          {['pending_payment'].includes(current.status) && (
            <Button
              variant="danger"
              className="w-full"
              onClick={async () => { await dispatch(cancelOrder({ id: current._id, reason: 'Cancelled by customer' })).unwrap(); dispatch(fetchOrder(id)); }}
            >
              Cancel order
            </Button>
          )}
        </div>
      </div>

      <section className="mt-8 surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Order timeline</h2>
        <ol className="mt-4 space-y-3">
          {current.timeline?.map((entry, index) => (
            <li key={index} className="flex gap-3 text-sm">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
              <span><span className="font-medium">{entry.status.replace('_', ' ')}</span> · <span className="text-muted">{formatDate(entry.at)}</span>{entry.note && <span className="text-muted"> — {entry.note}</span>}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
