import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center px-4',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 text-[var(--text-3)] flex items-center justify-center">
          {React.isValidElement(icon) ? (
            React.cloneElement(icon as React.ReactElement, {
              width: 40,
              height: 40,
              strokeWidth: 1.5
            } as any)
          ) : (
            icon
          )}
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-[var(--text-0)] mb-1">{title}</h3>
      <p className="text-[var(--text-2)] max-w-md mb-6">{description}</p>
      
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  );
}
