import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Info, LockKeyhole } from 'lucide-react';
import { addAddress } from '../features/auth/authSlice';
import { createCheckout } from '../features/orders/ordersSlice';
import { fetchCart, selectCartItems, selectCartSubtotal } from '../features/cart/cartSlice';
import { Input, TextArea } from '../components/ui/Field';
import Button from '../components/ui/Button';
import { Price } from '../components/ui/Display';
import { EmptyState, ErrorState } from '../components/ui/Feedback';

const emptyAddress = { label: 'Home', fullName: '', phone: '', line1: '', line2: '', city: '', postalCode: '', country: 'Indonesia', isDefault: false };

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const [params] = useSearchParams();
  const user = useSelector((state) => state.auth.user);
  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const { loading, error } = useSelector((state) => state.orders);
  const addresses = user?.addresses || [];
  const [addressId, setAddressId] = useState(addresses.find((address) => address.isDefault)?._id || addresses[0]?._id || '');
  const [address, setAddress] = useState(emptyAddress);
  const [showForm, setShowForm] = useState(addresses.length === 0);
  const idempotencyKey = useMemo(() => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, []);

  useEffect(() => { dispatch(fetchCart()); }, [dispatch]);
  useEffect(() => {
    if (addresses.length && !addressId) setAddressId(addresses[0]._id);
  }, [addresses, addressId]);

  const saveAddress = async (event) => {
    event.preventDefault();
    try {
      const result = await dispatch(addAddress(address)).unwrap();
      setAddressId(result[result.length - 1]?._id || '');
      setShowForm(false);
    } catch {
      setShowForm(true);
    }
  };

  const placeOrder = async () => {
    if (!addressId) return;
    try {
      const result = await dispatch(createCheckout({ addressId, idempotencyKey })).unwrap();
      if (result.url) window.location.assign(result.url);
    } catch {
      setShowForm(false);
    }
  };

  if (!items.length) {
    return (
      <div className="page-shell py-10">
        <h1 className="text-3xl font-semibold">Checkout</h1>
        <div className="mt-8">
          <EmptyState
            title="Nothing to check out"
            description="Add products to your cart first."
            action={<Link to="/products" className="btn-primary">Browse products</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell py-10">
      <h1 className="text-3xl font-semibold">Checkout</h1>
      <p className="mt-1 text-sm text-muted">Confirm your address, then continue to secure payment.</p>

      {params.get('payment') === 'cancelled' && (
        <div className="mt-6 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="h-4 w-4" /> Payment was cancelled. Your stock reservation has been released.
        </div>
      )}
      {error && <div className="mt-6"><ErrorState message={error} /></div>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">1 · Shipping address</h2>
              <button className="text-sm font-semibold text-brand hover:underline" onClick={() => setShowForm((value) => !value)}>
                {showForm ? 'Use saved address' : 'Add new address'}
              </button>
            </div>

            {showForm ? (
              <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={saveAddress}>
                <Input id="fullName" label="Full name" required value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} />
                <Input id="phone" label="Phone" required value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
                <div className="sm:col-span-2">
                  <TextArea id="line1" label="Street address" rows={2} required value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
                </div>
                <Input id="city" label="City" required value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                <Input id="postalCode" label="Postal code" required value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} />
                <div className="sm:col-span-2">
                  <Button type="submit" variant="secondary">Save address</Button>
                </div>
              </form>
            ) : addresses.length ? (
              <div className="mt-4 space-y-2">
                {addresses.map((entry) => (
                  <label key={entry._id} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${addressId === entry._id ? 'border-brand bg-brand-soft/40' : 'border-line'}`}>
                    <input type="radio" name="address" className="mt-1" checked={addressId === entry._id} onChange={() => setAddressId(entry._id)} />
                    <span className="text-sm">
                      <span className="font-semibold">{entry.fullName}</span> · {entry.phone}<br />
                      <span className="text-muted">{entry.line1}, {entry.city} {entry.postalCode}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">Add a shipping address to continue.</p>
            )}
          </section>

          <section className="surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">2 · Review items</h2>
            <div className="mt-4 divide-y divide-line">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span className="min-w-0 truncate">{item.name} <span className="text-muted">× {item.quantity}</span></span>
                  <Price value={item.price * item.quantity} className="shrink-0 font-medium" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit surface p-5 lg:sticky lg:top-24">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Summary</h2>
          <div className="mt-5 flex justify-between text-sm"><span>Subtotal</span><Price value={subtotal} className="font-semibold" /></div>
          <p className="mt-2 text-xs text-muted">Shipping and tax are added by the server.</p>
          <Button className="mt-6 w-full" loading={loading} onClick={placeOrder} disabled={!addressId}>
            <LockKeyhole className="h-4 w-4" /> Continue to Stripe
          </Button>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Payment is completed on Stripe. Order confirmation is only shown after a signed server-side webhook verifies the payment.
          </p>
        </aside>
      </div>
    </div>
  );
}
