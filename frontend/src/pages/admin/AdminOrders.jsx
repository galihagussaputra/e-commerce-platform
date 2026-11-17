import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { cancelOrder, fetchOrders, updateOrderStatus } from '../../features/orders/ordersSlice';
import { Input, Select } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { Badge, Price } from '../../components/ui/Display';
import { ErrorState, Spinner } from '../../components/ui/Feedback';

const nextStatuses = {
  pending_payment: ['paid'],
  paid: ['processing'],
  processing: ['shipped'],
  shipped: ['delivered'],
};

export default function AdminOrders() {
  const dispatch = useDispatch();
  const { orders, loading, error } = useSelector((state) => state.orders);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchOrders({ status, q: search, limit: 100 }));
  }, [dispatch, status, search]);

  const changeStatus = async (id, next) => {
    await dispatch(updateOrderStatus({ id, status: next, note: `Updated by admin` })).unwrap();
    dispatch(fetchOrders({ status, q: search, limit: 100 }));
  };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this order and release or restock inventory?')) return;
    await dispatch(cancelOrder({ id, reason: 'Cancelled by administrator' })).unwrap();
    dispatch(fetchOrders({ status, q: search, limit: 100 }));
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Orders</h1>
      <p className="mt-1 text-sm text-muted">Track fulfillment, payments and cancellation.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <div className="w-56"><Input id="admin-order-search" aria-label="Search orders" placeholder="Order number or customer" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="w-48">
          <Select id="admin-order-status" value={status} onChange={(e) => setStatus(e.target.value)}>
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

      {error && <div className="mt-5"><ErrorState message={error} /></div>}
      <section className="surface mt-6 overflow-x-auto">
        {loading && !orders.length ? <Spinner label="Loading orders" /> : (
          <table className="data-table min-w-[900px]">
            <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td><Link className="font-medium hover:underline" to={`/orders/${order._id}`}>{order.orderNumber}</Link></td>
                  <td className="text-muted">{order.user?.name || '—'}<br /><span className="text-xs">{order.user?.email}</span></td>
                  <td className="whitespace-nowrap text-muted">{new Date(order.createdAt).toLocaleDateString('en-ID')}</td>
                  <td><Price value={order.total} className="font-medium" /></td>
                  <td><Badge tone={order.status}>{order.status.replace('_', ' ')}</Badge></td>
                  <td><Badge tone={order.paymentStatus}>{order.paymentStatus}</Badge></td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {(nextStatuses[order.status] || []).map((next) => (
                        <Button key={next} variant="secondary" className="px-2.5 py-1.5 text-xs" onClick={() => changeStatus(order._id, next)}>
                          Mark {next}
                        </Button>
                      ))}
                      {['pending_payment', 'paid', 'processing'].includes(order.status) && (
                        <Button variant="danger" className="px-2.5 py-1.5 text-xs" onClick={() => cancel(order._id)}>Cancel</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!orders.length && <tr><td colSpan={7} className="text-muted">No orders found.</td></tr>}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
