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
        <label
          htmlFor={selectId}
          className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          id={selectId}
          className={cn(
            'w-full bg-surface-float border text-white/90 text-sm rounded-lg pl-3.5 pr-9 py-2.5 appearance-none cursor-pointer',
            'transition-all duration-200 focus:outline-none',
            'focus:border-green-cta/50 focus:ring-1 focus:ring-green-cta/20',
            error
              ? 'border-red-500/60 focus:border-red-500/60'
              : 'border-surface-line hover:border-white/15'
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-[#1c1e23] text-white"
            >
              {opt.label}
            </option>
          ))}
        </select>

        <span className="absolute right-3.5 text-white/30 pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>

      {error && <p className="text-xs text-red-400 font-medium mt-0.5">{error}</p>}
    </div>
  );
}
