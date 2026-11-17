import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, ShieldCheck, PackageCheck, RefreshCcw } from 'lucide-react';
import { fetchFeatured, fetchCategories } from '../features/catalog/catalogSlice';
import ProductCard from '../components/catalog/ProductCard';
import { Price } from '../components/ui/Display';
import { Spinner } from '../components/ui/Feedback';

export default function HomePage() {
  const dispatch = useDispatch();
  const { featured, categories, loading } = useSelector((state) => state.catalog);

  useEffect(() => {
    dispatch(fetchFeatured());
    dispatch(fetchCategories());
  }, [dispatch]);

  const heroProduct = featured[0];

  return (
    <div>
      <section className="page-shell grid items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">New season · 2026</p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
            Good things, chosen well.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
            A small, deliberate catalog of audio, wearables and workspace essentials. Clear pricing, honest stock, and a checkout that just works.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/products" className="btn-primary">Shop the catalog <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/products?category=workspace" className="btn-secondary">Explore workspace</Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-line pt-6 text-xs text-muted">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand" /> Secure Stripe checkout</span>
            <span className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-brand" /> Live inventory</span>
            <span className="flex items-center gap-2"><RefreshCcw className="h-4 w-4 text-brand" /> Simple returns</span>
          </div>
        </div>
        <div className="relative">
          {heroProduct ? (
            <Link to={`/products/${heroProduct.slug || heroProduct._id}`} className="group block">
              <div className="aspect-[4/5] overflow-hidden bg-white">
                <img
                  src={heroProduct.images?.[0] || '/placeholder.svg'}
                  alt={heroProduct.name}
                  onError={(event) => { event.currentTarget.src = '/placeholder.svg'; }}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">{heroProduct.brand}</p>
                  <p className="font-semibold">{heroProduct.name}</p>
                </div>
                <Price value={heroProduct.price} className="font-semibold" />
              </div>
            </Link>
          ) : (
            <div className="aspect-[4/5] bg-white" />
          )}
        </div>
      </section>

      <section className="border-y border-line bg-white py-10">
        <div className="page-shell grid grid-cols-2 gap-4 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category._id}
              to={`/products?category=${category.slug}`}
              className="flex items-center justify-between border border-line px-4 py-4 text-sm font-medium hover:border-brand hover:text-brand"
            >
              {category.name}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ))}
        </div>
      </section>

      <section className="page-shell py-14">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Editors' picks</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Featured products</h2>
          </div>
          <Link to="/products" className="hidden text-sm font-semibold text-brand hover:underline sm:block">View all products →</Link>
        </div>
        {loading && !featured.length ? <Spinner /> : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featured.map((product) => <ProductCard key={product._id} product={product} />)}
          </div>
        )}
      </section>
    </div>
  );
}
