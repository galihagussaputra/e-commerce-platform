const formatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function Price({ value, className = '' }) {
  return <span className={className}>{formatter.format(Number(value) || 0)}</span>;
}

const tones = {
  active: 'bg-emerald-50 text-emerald-700',
  default: 'bg-emerald-50 text-emerald-700',
  paid: 'bg-emerald-50 text-emerald-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  processing: 'bg-blue-50 text-blue-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  pending: 'bg-amber-50 text-amber-700',
  pending_payment: 'bg-amber-50 text-amber-700',
  unpaid: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
  cancelled: 'bg-neutral-100 text-neutral-600',
  draft: 'bg-neutral-100 text-neutral-600',
  archived: 'bg-neutral-100 text-neutral-600',
  low: 'bg-amber-50 text-amber-700',
};

export function Badge({ children, tone, className = '' }) {
  const key = tone || children;
  return <span className={`badge ${tones[key] || 'bg-neutral-100 text-neutral-700'} ${className}`}>{children}</span>;
}
