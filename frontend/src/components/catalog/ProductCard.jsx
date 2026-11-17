import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ShoppingBag } from 'lucide-react';
import { Price, Badge } from '../ui/Display';
import { addToCart } from '../../features/cart/cartSlice';

export default function ProductCard({ product }) {
  const dispatch = useDispatch();
  const [added, setAdded] = useState(false);
  const image = product.images?.[0] || '/placeholder.svg';
  const soldOut = product.available === 0 || product.stock === 0;

  const handleAdd = async () => {
    try {
      await dispatch(addToCart({ productId: product._id, quantity: 1, product })).unwrap();
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } catch {
      setAdded(false);
    }
  };

  return (
    <article className="group surface overflow-hidden transition-shadow hover:shadow-soft">
      <Link to={`/products/${product.slug || product._id}`} className="block aspect-[4/3] overflow-hidden bg-canvas">
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          onError={(event) => { event.currentTarget.src = '/placeholder.svg'; }}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{product.brand || product.category?.name}</p>
            <Link to={`/products/${product.slug || product._id}`} className="mt-1 block truncate font-semibold hover:underline">{product.name}</Link>
          </div>
          {product.featured && <Badge tone="default">Featured</Badge>}
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <Price value={product.price} className="text-base font-semibold" />
            {product.compareAtPrice > product.price && (
              <Price value={product.compareAtPrice} className="ml-2 text-xs text-muted line-through" />
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={soldOut}
            className="rounded-md border border-line p-2 text-brand hover:border-brand disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={added ? 'Added to cart' : `Add ${product.name} to cart`}
            title={added ? 'Added' : 'Add to cart'}
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          {soldOut ? 'Out of stock' : product.available <= product.lowStockThreshold ? `Only ${product.available} left` : 'In stock'}
        </p>
      </div>
    </article>
  );
}
