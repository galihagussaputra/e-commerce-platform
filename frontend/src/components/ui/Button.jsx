const variants = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'border border-line bg-white text-ink hover:border-ink',
  ghost: 'text-muted hover:bg-white hover:text-ink',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
};

export default function Button({
  variant = 'primary',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}) {
  return (
    <button
      className={`btn ${variants[variant] || variants.primary} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}
