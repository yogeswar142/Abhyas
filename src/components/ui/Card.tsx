'use client';

import React, { useRef } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'interactive' | 'pro';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  spotlight?: boolean;
}

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  spotlight = true,
  onClick,
  ...props
}: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!spotlight || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  const variantStyles = {
    default: 'bg-[var(--bg-1)] border border-[var(--border)] shadow-[var(--shadow-sm)]',
    outline: 'bg-transparent border border-[var(--border)]',
    ghost: 'bg-[var(--surface)] border border-transparent',
    interactive: 'bg-[var(--bg-1)] border border-[var(--border)] hover:border-[rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_-5px_rgba(34,197,94,0.15)] transition-all duration-300',
    pro: 'bg-gradient-to-br from-[var(--bg-1)] via-[var(--bg-2)] to-[var(--bg-1)] border border-[rgba(34,197,94,0.25)] shadow-[0_0_30px_-10px_rgba(34,197,94,0.15)]'
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3.5',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      className={cn(
        'relative rounded-2xl overflow-hidden transition-all duration-300',
        variantStyles[variant],
        paddingStyles[padding],
        hoverable && 'hover:-translate-y-0.5 hover:shadow-[var(--shadow)] cursor-pointer',
        className
      )}
      style={{
        background: spotlight
          ? `radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.035), transparent 80%), var(--bg-1)`
          : undefined,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
