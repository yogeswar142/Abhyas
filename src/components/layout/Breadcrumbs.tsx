'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Breadcrumbs() {
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);
  
  return (
    <nav className="flex text-[13px] font-medium" aria-label="Breadcrumb">
      <ol className="inline-flex items-center">


        {paths.map((path, index) => {
          const href = `/${paths.slice(0, index + 1).join('/')}`;
          const isLast = index === paths.length - 1;
          
          let label = path.charAt(0).toUpperCase() + path.slice(1);
          if (path === 'new') label = 'New Session';
          if (path.startsWith('abc') || path.startsWith('ses_')) label = 'Session';
          
          return (
            <li key={path} className="inline-flex items-center">
              {index > 0 && (
                <span className="mx-2" style={{ color: 'var(--v-border)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </span>
              )}
              {isLast ? (
                <span style={{ color: 'var(--v-tx0)' }} aria-current="page">
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className="transition-colors"
                  style={{ color: 'var(--v-tx2)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--v-tx0)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--v-tx2)'}
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
