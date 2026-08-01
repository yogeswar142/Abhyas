import React from 'react';
import { cn } from '../../lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
}

export function Select({
  label,
  options,
  placeholder,
  error,
  className,
  id,
  ...props
}: SelectProps) {
  const selectId = id || React.useId();

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wider text-[var(--text-2)]">
          {label}
        </label>
      )}
      
      <div className="relative flex items-center">
        <select
          id={selectId}
          className={cn(
            'w-full bg-[var(--bg-2)] border text-[var(--text-0)] text-sm rounded-lg pl-3.5 pr-9 py-2.5 appearance-none',
            'transition-all duration-200 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] shadow-sm cursor-pointer',
            error ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-red-500/20' : 'border-[var(--border)] hover:border-[var(--border-hv)]'
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden className="bg-[var(--bg-1)] text-[var(--text-2)]">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[var(--bg-1)] text-[var(--text-0)] py-1">
              {opt.label}
            </option>
          ))}
        </select>
        
        <span className="absolute right-3.5 text-[var(--text-2)] pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </div>

      {error && <p className="text-xs text-[var(--error)] font-medium mt-0.5">{error}</p>}
    </div>
  );
}

