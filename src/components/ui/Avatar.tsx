import React from 'react';
import { cn, getInitials } from '../../lib/utils';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away';
  src?: string;
  className?: string;
}

export function Avatar({
  name,
  size = 'md',
  status,
  src,
  className,
}: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const statusColors = {
    online: 'bg-[var(--accent)]',
    offline: 'bg-[var(--text-3)]',
    away: 'bg-amber-500',
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center bg-[var(--bg-3)] border border-[var(--border)] text-[var(--text-0)] font-medium',
          sizes[size]
        )}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          getInitials(name)
        )}
      </div>
      
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-[var(--bg-0)]',
            statusColors[status],
            size === 'sm' ? 'w-2 h-2' : size === 'xl' ? 'w-4 h-4' : 'w-3 h-3'
          )}
        />
      )}
    </div>
  );
}
