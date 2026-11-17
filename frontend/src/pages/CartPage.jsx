import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import { fetchCart, updateCartItem, removeFromCart } from '../features/cart/cartSlice';
import { selectCartSubtotal } from '../features/cart/cartSlice';
import QuantityControl from '../components/cart/QuantityControl';
import { Price } from '../components/ui/Display';
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback';

export default function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading, error } = useSelector((state) => state.cart);
  const subtotal = useSelector(selectCartSubtotal);

  useEffect(() => { dispatch(fetchCart()); }, [dispatch]);

  if (loading && !items.length) return <Spinner label="Loading cart" />;

  return (
    <div className="page-shell py-10">
      <h1 className="text-3xl font-semibold">Your cart</h1>
      <p className="mt-1 text-sm text-muted">Review your items before checkout.</p>

      {error && <div className="mt-5"><ErrorState message={error} onRetry={() => dispatch(fetchCart())} /></div>}

      {!items.length ? (
        <div className="mt-8">
          <EmptyState
            title="Your cart is empty"
            description="Browse the catalog and add something you like."
            action={<Link to="/products" className="btn-primary">Shop products <ArrowRight className="h-4 w-4" /></Link>}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="surface divide-y divide-line">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-4 p-4">
                <img
                  src={item.image || '/placeholder.svg'}
                  alt={item.name}
                  onError={(event) => { event.currentTarget.src = '/placeholder.svg'; }}
                  className="h-24 w-20 shrink-0 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/products/${item.slug || item.productId}`} className="block truncate font-semibold hover:underline">{item.name}</Link>
                      <Price value={item.price} className="mt-1 block text-sm text-muted" />
                    </div>
                    <button
                      className="text-muted hover:text-red-600"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => dispatch(removeFromCart(item.productId))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <QuantityControl
                      compact
                      value={item.quantity}
                      max={item.available || 99}
                      onChange={(value) => dispatch(updateCartItem({ productId: item.productId, quantity: value }))}
                    />
                    <Price value={item.price * item.quantity} className="text-sm font-semibold" />
                  </div>
                  {item.available < item.quantity && <p className="mt-2 text-xs text-amber-700">Only {item.available} available — adjust before checkout.</p>}
                </div>
              </div>
            ))}
          </div>

          <aside className="h-fit surface p-5 lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Order summary</h2>
            <div className="mt-5 flex justify-between text-sm">
              <span>Subtotal</span><Price value={subtotal} className="font-semibold" />
            </div>
            <p className="mt-2 text-xs text-muted">Shipping and tax are calculated on the server during checkout.</p>
            <button className="btn-primary mt-6 w-full" onClick={() => navigate('/checkout')}>
              Continue to checkout <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Secured by Stripe test mode
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
