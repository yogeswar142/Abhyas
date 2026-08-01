import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  icon,
  iconPosition = 'left',
  fullWidth,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold transition-all duration-150 ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-cta/50 ' +
    'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] select-none';

  const variants = {
    // ✅ green bg → black text for proper contrast
    primary:
      'bg-green-cta text-black hover:bg-green-cta/90 ' +
      'shadow-[0_0_20px_-4px_rgba(34,197,94,0.35)] rounded-lg',
    ghost:
      'bg-transparent text-white/50 hover:bg-surface-float hover:text-white rounded-lg transition-colors',
    outline:
      'border border-surface-line bg-surface-float text-white/80 hover:border-white/20 hover:text-white shadow-sm rounded-lg',
    destructive:
      'bg-red-500/80 text-white hover:bg-red-500 shadow-sm rounded-lg',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-xs px-4 py-2 gap-2',
    lg: 'text-sm px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-3.5 w-3.5 text-current shrink-0"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon && iconPosition === 'left' ? (
        <span className="shrink-0">{icon}</span>
      ) : null}

      {children}

      {!isLoading && icon && iconPosition === 'right' && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  );
}
