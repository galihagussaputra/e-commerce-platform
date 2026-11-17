import { AlertCircle, PackageOpen } from 'lucide-react';

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description, action, icon: Icon = PackageOpen }) {
  return (
    <div className="surface flex flex-col items-center justify-center px-6 py-16 text-center">
      <Icon className="mb-4 h-8 w-8 text-muted" strokeWidth={1.5} />
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>{message || 'Something went wrong.'}</span>
      </div>
      {onRetry && <button className="text-sm font-semibold underline" onClick={onRetry}>Try again</button>}
    </div>
  );
}
