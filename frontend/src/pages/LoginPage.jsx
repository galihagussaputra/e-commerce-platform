import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { login } from '../features/auth/authSlice';
import { syncCart } from '../features/cart/cartSlice';
import { Input } from '../components/ui/Field';
import Button from '../components/ui/Button';
import { ErrorState } from '../components/ui/Feedback';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await dispatch(login(form)).unwrap();
      await dispatch(syncCart()).unwrap();
      const destination = location.state?.from || (result.user?.role === 'admin' ? '/admin' : '/account');
      navigate(destination, { replace: true });
    } catch (error) {
      setServerError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell grid gap-12 py-14 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Welcome back</p>
        <h1 className="mt-3 text-3xl font-semibold">Sign in to your account</h1>
        <p className="mt-2 text-sm text-muted">Access your orders, addresses and a faster checkout.</p>
        <div className="mt-8 max-w-md">
          {serverError && <div className="mb-4"><ErrorState message={serverError} /></div>}
          <form className="space-y-4" onSubmit={submit} noValidate>
            <Input id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} required />
            <Input id="password" label="Password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} required />
            <Button type="submit" className="w-full" loading={submitting}>Sign in</Button>
          </form>
          <p className="mt-5 text-sm text-muted">
            New here? <Link to="/register" className="font-semibold text-brand hover:underline">Create an account</Link>
          </p>
          <div className="mt-6 rounded-md border border-line bg-white p-3 text-xs text-muted">
            Demo customer: <span className="font-semibold text-ink">customer@example.com</span> / <span className="font-semibold text-ink">Demo12345</span>
          </div>
        </div>
      </div>
      <div className="hidden items-center justify-center bg-[#eceee9] lg:flex">
        <div className="max-w-sm p-10">
          <p className="text-2xl font-semibold leading-snug">One cart. Clear pricing. A checkout you can trust.</p>
          <p className="mt-4 text-sm leading-relaxed text-muted">Your cart and addresses stay in sync between devices once you sign in.</p>
        </div>
      </div>
    </div>
  );
}
