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
        <label
          htmlFor={inputId}
          className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && iconPosition === 'left' && (
          <span className="absolute left-3 text-white/30 pointer-events-none">{icon}</span>
        )}

        <input
          id={inputId}
          className={cn(
            'w-full bg-surface-float border text-white/90 text-sm rounded-lg px-3.5 py-2.5',
            'transition-all duration-200 focus:outline-none',
            'focus:border-green-cta/50 focus:ring-1 focus:ring-green-cta/20',
            'placeholder:text-white/20',
            error
              ? 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/10'
              : 'border-surface-line hover:border-white/15',
            icon && iconPosition === 'left' && 'pl-9',
            icon && iconPosition === 'right' && 'pr-9'
          )}
          {...props}
        />

        {icon && iconPosition === 'right' && (
          <span className="absolute right-3 text-white/30 pointer-events-none">{icon}</span>
        )}
      </div>

      {error ? (
        <p className="text-xs text-red-400 font-medium mt-0.5">{error}</p>
      ) : hint ? (
        <p className="text-xs text-white/30 mt-0.5">{hint}</p>
      ) : null}
    </div>
  );
}
