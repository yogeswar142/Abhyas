import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circle' | 'rect';
}

export function Skeleton({
  width,
  height,
  variant = 'text',
  className,
  ...props
}: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-[var(--surface-hv)]';
  
  const variants = {
    text: 'rounded-md h-4 w-full',
    circle: 'rounded-full',
    rect: 'rounded-[var(--radius)]',
  };

  return (
    <div
      className={cn(baseStyles, variants[variant], className)}
      style={{ width, height, ...props.style }}
      {...props}
    />
  );
}
