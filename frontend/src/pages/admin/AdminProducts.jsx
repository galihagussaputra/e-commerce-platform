import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { productAPI } from '../../services/api';
import { fetchCategories } from '../../features/catalog/catalogSlice';
import { useSelector } from 'react-redux';
import { Input, Select, TextArea } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { Badge, Price } from '../../components/ui/Display';
import { ErrorState, Spinner } from '../../components/ui/Feedback';

const empty = { name: '', description: '', price: '', category: '', stock: '', images: '', status: 'active', featured: false };

export default function AdminProducts() {
  const dispatch = useDispatch();
  const categories = useSelector((state) => state.catalog.categories);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const result = await productAPI.list({ status: 'all', limit: 100 });
      setProducts(Array.isArray(result) ? result : result.items || []);
      setError('');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    dispatch(fetchCategories());
  }, [dispatch]);

  const save = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      category: form.category || categories[0]?._id,
      stock: Number(form.stock),
      images: form.images.split(',').map((value) => value.trim()).filter(Boolean),
      status: form.status,
      featured: form.featured,
    };
    try {
      if (editingId) await productAPI.update(editingId, payload);
      else await productAPI.create(payload);
      setNotice(editingId ? 'Product updated.' : 'Product created.');
      setForm(empty);
      setEditingId(null);
      load();
    } catch (failure) {
      setError(failure.message);
    }
  };

  const edit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      category: product.category?._id || product.category || '',
      stock: String(product.stock),
      images: (product.images || []).join(', '),
      status: product.status,
      featured: Boolean(product.featured),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await productAPI.remove(id);
      load();
    } catch (failure) {
      setError(failure.message);
    }
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="mt-1 text-sm text-muted">Create, edit and publish catalog items.</p>
        </div>
        <Button variant="secondary" onClick={() => { setForm(empty); setEditingId(null); }}><Plus className="h-4 w-4" /> New product</Button>
      </div>

      {error && <div className="mt-5"><ErrorState message={error} onRetry={load} /></div>}
      {notice && <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

      <section className="surface mt-6 p-5">
        <h2 className="text-sm font-semibold">{editingId ? 'Edit product' : 'Add product'}</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={save}>
          <Input id="p-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select id="p-category" label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">Select category</option>
            {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </Select>
          <div className="md:col-span-2">
            <TextArea id="p-description" label="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
          <Input id="p-price" label="Price (IDR)" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <Input id="p-stock" label="Stock" inputMode="numeric" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
          <div className="md:col-span-2">
            <Input id="p-images" label="Image URLs (comma separated)" value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} />
          </div>
          <Select id="p-status" label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
          </Select>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
            Featured on storefront
          </label>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit">{editingId ? 'Save changes' : 'Create product'}</Button>
            {editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(empty); }}>Cancel</Button>}
          </div>
        </form>
      </section>

      <section className="surface mt-6 overflow-x-auto">
        {loading ? <Spinner label="Loading products" /> : (
          <table className="data-table min-w-[720px]">
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td><p className="font-medium">{product.name}</p><p className="text-xs text-muted">{product.slug}</p></td>
                  <td className="text-muted">{product.category?.name || '—'}</td>
                  <td><Price value={product.price} /></td>
                  <td>{product.stock} <span className="text-muted">({product.available} free)</span></td>
                  <td><Badge tone={product.status}>{product.status}</Badge></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="text-muted hover:text-ink" onClick={() => edit(product)} aria-label={`Edit ${product.name}`}><Pencil className="h-4 w-4" /></button>
                      <button className="text-muted hover:text-red-600" onClick={() => remove(product._id)} aria-label={`Delete ${product.name}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
