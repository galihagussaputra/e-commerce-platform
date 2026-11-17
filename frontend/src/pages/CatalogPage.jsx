import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchProducts, fetchCategories, setFilters, setPage, resetFilters } from '../features/catalog/catalogSlice';
import ProductCard from '../components/catalog/ProductCard';
import ProductFilters from '../components/catalog/ProductFilters';
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback';

export default function CatalogPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { products, categories, filters, total, loading, error } = useSelector((state) => state.catalog);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    dispatch(setFilters({
      q: params.get('q') || '',
      category: params.get('category') || '',
      page: Number(params.get('page') || 1),
    }));
  }, [location.search, dispatch]);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch, JSON.stringify(filters)]);

  const pages = Math.max(1, Math.ceil(total / (filters.limit || 12)));

  return (
    <div className="page-shell py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Catalog</p>
        <h1 className="mt-2 text-3xl font-semibold">Shop all products</h1>
        <p className="mt-1 text-sm text-muted">Search, filter and sort — results come from the server.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <ProductFilters
          filters={filters}
          categories={categories}
          onChange={(changes) => {
            dispatch(setFilters(changes));
            const params = new URLSearchParams();
            const next = { ...filters, ...changes };
            Object.entries(next).forEach(([key, value]) => {
              if (value && key !== 'page') params.set(key, value);
            });
            window.history.replaceState(null, '', `/products${params.toString() ? `?${params}` : ''}`);
          }}
          onReset={() => { dispatch(resetFilters()); window.history.replaceState(null, '', '/products'); }}
        />

        <div>
          <div className="mb-4 flex items-center justify-between text-sm text-muted">
            <span>{total} product{total === 1 ? '' : 's'}</span>
            <span>Page {filters.page} of {pages}</span>
          </div>
          {error && <div className="mb-4"><ErrorState message={error} onRetry={() => dispatch(fetchProducts())} /></div>}
          {loading && !products.length ? <Spinner /> : products.length ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => <ProductCard key={product._id} product={product} />)}
            </div>
          ) : (
            <EmptyState title="No products found" description="Try a different keyword or clear your filters." />
          )}

          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                className="btn-secondary"
                disabled={filters.page <= 1}
                onClick={() => dispatch(setPage(filters.page - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-sm text-muted">{filters.page} / {pages}</span>
              <button
                className="btn-secondary"
                disabled={filters.page >= pages}
                onClick={() => dispatch(setPage(filters.page + 1))}
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
