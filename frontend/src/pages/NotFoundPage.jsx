import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page-shell py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">404</p>
      <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted">The page you were looking for does not exist.</p>
      <Link to="/" className="btn-primary mt-6">Back to home</Link>
    </div>
  );
}
