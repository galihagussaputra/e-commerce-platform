export function Input({ label, error, className = '', id, ...props }) {
  return (
    <div>
      {label && <label className="label" htmlFor={id}>{label}</label>}
      <input id={id} className={`field ${error ? 'border-red-400' : ''} ${className}`} {...props} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Select({ label, error, className = '', id, children, ...props }) {
  return (
    <div>
      {label && <label className="label" htmlFor={id}>{label}</label>}
      <select id={id} className={`field ${error ? 'border-red-400' : ''} ${className}`} {...props}>
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function TextArea({ label, error, className = '', id, ...props }) {
  return (
    <div>
      {label && <label className="label" htmlFor={id}>{label}</label>}
      <textarea id={id} className={`field ${error ? 'border-red-400' : ''} ${className}`} {...props} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
