import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ShoppingBag, Check } from 'lucide-react';
import { fetchProduct, fetchFeatured } from '../features/catalog/catalogSlice';
import { addToCart } from '../features/cart/cartSlice';
import { Price, Badge } from '../components/ui/Display';
import Button from '../components/ui/Button';
import QuantityControl from '../components/cart/QuantityControl';
import { Spinner, ErrorState } from '../components/ui/Feedback';

export default function ProductDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current, featured, loading, error } = useSelector((state) => state.catalog);
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState('/placeholder.svg');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    dispatch(fetchProduct(id));
    dispatch(fetchFeatured());
  }, [dispatch, id]);

  useEffect(() => {
    setQuantity(1);
    setImage(current?.images?.[0] || '/placeholder.svg');
  }, [current?._id]);

  if (loading && !current) return <Spinner label="Loading product" />;
  if (error && !current) return <div className="page-shell py-10"><ErrorState message={error} /></div>;
  if (!current) return null;

  const max = Math.min(current.available ?? 0, 99);
  const images = current.images?.length ? current.images : ['/placeholder.svg'];

  const handleAdd = async () => {
    try {
      await dispatch(addToCart({ productId: current._id, quantity, product: current })).unwrap();
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    } catch {
      setAdded(false);
    }
  };

  return (
    <div className="page-shell py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link to="/" className="hover:text-ink">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-ink">Catalog</Link>
        <span>/</span>
        <span className="truncate text-ink">{current.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <div className="aspect-[4/3] overflow-hidden bg-white">
            <img src={image} alt={current.name} onError={(event) => { event.currentTarget.src = '/placeholder.svg'; }} className="h-full w-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((source) => (
                <button key={source} onClick={() => setImage(source)} className={`h-16 w-16 overflow-hidden border ${image === source ? 'border-brand' : 'border-line'}`}>
                  <img src={source} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{current.brand || current.category?.name}</p>
          <h1 className="mt-3 text-3xl font-semibold">{current.name}</h1>
          <div className="mt-4 flex items-center gap-3">
            <Price value={current.price} className="text-2xl font-semibold" />
            {current.compareAtPrice > current.price && <Price value={current.compareAtPrice} className="text-sm text-muted line-through" />}
          </div>
          <div className="mt-4">
            {current.available > 0 ? (
              current.available <= current.lowStockThreshold
                ? <Badge tone="low">Only {current.available} left</Badge>
                : <Badge tone="active">In stock</Badge>
            ) : <Badge tone="cancelled">Out of stock</Badge>}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-muted">{current.description}</p>

          {current.variants?.length > 0 && (
            <div className="mt-6">
              <p className="label">Options</p>
              {current.variants.map((variant) => (
                <div key={variant.sku} className="mb-2 text-sm">
                  <span className="font-medium">{variant.name}:</span>{' '}
                  <span className="text-muted">{variant.options.join(' · ')}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <QuantityControl value={quantity} onChange={(value) => setQuantity(Math.max(1, Math.min(value, max || 1)))} max={max || 1} />
            <Button onClick={handleAdd} disabled={!max}>
              {added ? <><Check className="h-4 w-4" /> Added</> : <><ShoppingBag className="h-4 w-4" /> Add to cart</>}
            </Button>
          </div>
          <div className="mt-6 border-t border-line pt-5 text-xs text-muted">
            <p>Free collection · Flat-rate shipping at checkout.</p>
            <p className="mt-1">Prices are confirmed from the database at checkout.</p>
          </div>
        </div>
      </div>

      {featured.filter((item) => item._id !== current._id).length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 text-xl font-semibold">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featured.filter((item) => item._id !== current._id).slice(0, 4).map((product) => (
              <Link key={product._id} to={`/products/${product.slug || product._id}`} className="surface flex items-center gap-3 p-3">
                <img src={product.images?.[0] || '/placeholder.svg'} alt="" className="h-14 w-14 rounded object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <Price value={product.price} className="text-xs text-muted" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
