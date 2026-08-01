import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export function Input({
  label,
  hint,
  error,
  icon,
  iconPosition = 'left',
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || React.useId();

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-[var(--text-2)]">
          {label}
        </label>
      )}
      
      <div className="relative flex items-center">
        {icon && iconPosition === 'left' && (
          <span className="absolute left-3 text-[var(--text-2)] pointer-events-none">
            {icon}
          </span>
        )}
        
        <input
          id={inputId}
          className={cn(
            'w-full bg-[var(--bg-2)] border text-[var(--text-0)] text-sm rounded-lg px-3.5 py-2.5',
            'transition-all duration-200 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] shadow-sm',
            'placeholder:text-[var(--text-3)]',
            error ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-red-500/20' : 'border-[var(--border)] hover:border-[var(--border-hv)]',
            !!icon && iconPosition === 'left' && 'pl-9',
            !!icon && iconPosition === 'right' && 'pr-9'
          )}
          {...props}
        />
        
        {icon && iconPosition === 'right' && (
          <span className="absolute right-3 text-[var(--text-2)] pointer-events-none">
            {icon}
          </span>
        )}
      </div>

      {error ? (
        <p className="text-xs text-[var(--error)] font-medium mt-0.5">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--text-3)] mt-0.5">{hint}</p>
      ) : null}
    </div>
  );
}

