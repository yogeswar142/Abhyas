'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Breadcrumbs() {
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);
  
  if (paths.length === 0) return null;

  return (
    <nav className="flex text-sm font-medium" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        {paths.map((path, index) => {
          const href = `/${paths.slice(0, index + 1).join('/')}`;
          const isLast = index === paths.length - 1;
          
          // Format label
          let label = path.charAt(0).toUpperCase() + path.slice(1);
          if (path === 'new') label = 'New Session';
          if (path.startsWith('abc') || path.startsWith('ses_')) label = 'Session';
          
          return (
            <li key={path} className="inline-flex items-center">
              {index > 0 && (
                <span className="text-[var(--text-3)] mx-1">/</span>
              )}
              {isLast ? (
                <span className="text-[var(--text-0)]" aria-current="page">
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
