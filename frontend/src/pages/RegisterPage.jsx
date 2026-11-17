import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { register } from '../features/auth/authSlice';
import { syncCart } from '../features/cart/cartSlice';
import { Input } from '../components/ui/Field';
import Button from '../components/ui/Button';
import { ErrorState } from '../components/ui/Feedback';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm) next.confirm = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await dispatch(register({ name: form.name, email: form.email, password: form.password })).unwrap();
      await dispatch(syncCart()).unwrap();
      navigate('/account');
    } catch (error) {
      setServerError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell max-w-xl py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Create account</p>
      <h1 className="mt-3 text-3xl font-semibold">Join Katalog</h1>
      <p className="mt-2 text-sm text-muted">Check out faster and keep your addresses in one place.</p>
      {serverError && <div className="mt-6"><ErrorState message={serverError} /></div>}
      <form className="mt-8 space-y-4" onSubmit={submit} noValidate>
        <Input id="name" label="Full name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <Input id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
        <Input id="password" label="Password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
        <Input id="confirm" label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={errors.confirm} />
        <Button type="submit" className="w-full" loading={submitting}>Create account</Button>
      </form>
      <p className="mt-5 text-sm text-muted">Already registered? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link></p>
    </div>
  );
}
