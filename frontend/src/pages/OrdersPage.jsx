import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders } from '../features/orders/ordersSlice';
import { Price, Badge } from '../components/ui/Display';
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback';
import { Input, Select } from '../components/ui/Field';

const formatDate = (value) => new Date(value).toLocaleDateString('en-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export default function OrdersPage() {
  const dispatch = useDispatch();
  const { orders, total, loading, error } = useSelector((state) => state.orders);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchOrders({ status, q: search }));
  }, [dispatch, status, search]);

  return (
    <div className="page-shell py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Your orders</h1>
          <p className="mt-1 text-sm text-muted">{total} order{total === 1 ? '' : 's'} found</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="w-48"><Input id="order-search" aria-label="Search orders" placeholder="Order number" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="w-44">
            <Select id="order-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="pending_payment">Awaiting payment</option>
              <option value="paid">Paid</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {error && <ErrorState message={error} onRetry={() => dispatch(fetchOrders({ status, q: search }))} />}
        {loading && !orders.length ? <Spinner /> : orders.length ? (
          <div className="surface overflow-hidden">
            <table className="data-table">
              <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td className="font-medium">{order.orderNumber}</td>
                    <td className="text-muted">{formatDate(order.createdAt)}</td>
                    <td className="text-muted">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                    <td><Price value={order.total} className="font-medium" /></td>
                    <td><Badge tone={order.status}>{order.status.replace('_', ' ')}</Badge></td>
                    <td><Link className="text-sm font-semibold text-brand hover:underline" to={`/orders/${order._id}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No orders yet" description="Your orders will appear here after checkout." action={<Link to="/products" className="btn-primary">Start shopping</Link>} />
        )}
      </div>
    </div>
  );
}
