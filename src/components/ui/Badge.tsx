import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'muted' | 'accent';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-[var(--bg-2)] text-[var(--text-0)] border-[var(--border)]',
    success: 'bg-[var(--accent-soft)] text-[var(--accent)] border-[rgba(34,197,94,0.2)]',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    muted: 'bg-[var(--bg-2)] text-[var(--text-1)] border-[var(--border)]',
    accent: 'bg-[var(--accent)] text-white border-transparent shadow-sm',
  };

  const dotColors = {
    default: 'bg-[var(--text-2)]',
    success: 'bg-[var(--accent)] animate-pulse',
    warning: 'bg-amber-400',
    error: 'bg-red-400',
    muted: 'bg-[var(--text-3)]',
    accent: 'bg-white',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md font-semibold tracking-tight',
    md: 'text-xs px-2.5 py-1 rounded-md font-semibold tracking-tight',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center border font-medium select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'mr-1.5 h-1.5 w-1.5 rounded-full shrink-0',
            dotColors[variant]
          )}
        />
      )}
      {children}
    </span>
  );
}

