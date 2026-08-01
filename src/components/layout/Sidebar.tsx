'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '../../lib/utils';
import { NAV_ITEMS, APP_NAME } from '../../lib/constants';
import { Avatar } from '../ui/Avatar';
import { mockUser } from '../../lib/mock-data';

const ICONS = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1"></rect>
      <rect x="14" y="3" width="7" height="5" rx="1"></rect>
      <rect x="14" y="12" width="7" height="9" rx="1"></rect>
      <rect x="3" y="16" width="7" height="5" rx="1"></rect>
    </svg>
  ),
  interview: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="22"></line>
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
  ),
  profile: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  ),
  brand: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
    </svg>
  )
};

interface SidebarProps {
  pinned: boolean;
  onTogglePin: (pinned: boolean) => void;
}

export function Sidebar({ pinned, onTogglePin }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  // Expanded if pinned OR if mouse is hovering over the sidebar (Vercel / Supabase behavior)
  const isExpanded = pinned || isHovered;

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'fixed left-4 top-4 bottom-4 z-50 flex flex-col bg-[var(--bg-1)]/75 backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)] transition-[width,box-shadow] duration-300 ease-in-out overflow-hidden',
        isExpanded ? 'w-[220px]' : 'w-[68px]'
      )}
    >
      {/* Brand Header */}
      <div className="h-[56px] flex items-center px-4 shrink-0 border-b border-[var(--border)]/30">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <div className="shrink-0 transition-transform duration-300 hover:rotate-12">{ICONS.brand}</div>
          {isExpanded && (
            <span className="font-extrabold text-base text-[var(--text-0)] tracking-tight">
              {APP_NAME}
            </span>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-5 flex flex-col gap-1.5 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 h-9 px-2.5 rounded-xl transition-all duration-200 overflow-hidden whitespace-nowrap group relative',
                isActive
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold border border-[rgba(34,197,94,0.15)]'
                  : 'text-[var(--text-2)] hover:bg-[var(--surface-hv)] hover:text-[var(--text-0)] font-medium border border-transparent'
              )}
              title={!isExpanded ? item.label : undefined}
            >
              <div className={cn('shrink-0 transition-colors duration-200', isActive ? 'text-[var(--accent)]' : 'text-[var(--text-2)] group-hover:text-[var(--text-0)]')}>
                {ICONS[item.icon as keyof typeof ICONS]}
              </div>
              {isExpanded && (
                <span className="text-xs flex-1 transition-colors duration-200">{item.label}</span>
              )}
              {item.href === '/interview/new' && isExpanded && (
                <span className="shrink-0 bg-[var(--accent)] text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-[0_0_10px_-2px_var(--accent)] animate-pulse">
                  New
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Profile & Pin Control */}
      <div className="p-3 border-t border-[var(--border)]/30 mt-auto flex flex-col gap-2">
        <div className="group relative">
          <div className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[var(--surface-hv)] cursor-pointer transition-colors overflow-hidden whitespace-nowrap border border-transparent hover:border-[var(--border)]/20">
            <Avatar name={user?.email || mockUser.name} size="sm" className="shrink-0 ring-2 ring-[var(--accent)]/10" />
            {isExpanded && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[var(--text-0)] truncate">
                  {user?.email ? user.email.split('@')[0] : mockUser.name}
                </p>
                <p className="text-[10px] text-[var(--text-2)] capitalize font-medium font-mono">
                  {mockUser.plan} Tier
                </p>
              </div>
            )}
          </div>

          {/* Sign Out Button - Appears on hover */}
          {isExpanded && (
            <div className="absolute left-0 bottom-full mb-1.5 w-full opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <button
                onClick={() => signOut().then(() => router.push('/login'))}
                className="w-full flex items-center gap-2 p-2 rounded-xl bg-[var(--bg-2)] text-[var(--text-1)] hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs font-semibold border border-[var(--border)] shadow-md"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Pin / Lock Toggle */}
        <button
          onClick={() => onTogglePin(!pinned)}
          title={pinned ? 'Unpin sidebar (hover to expand)' : 'Pin sidebar expanded'}
          className="flex items-center justify-center h-8 text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-hv)] rounded-xl transition-colors w-full gap-2 text-xs font-medium border border-transparent hover:border-[var(--border)]/20"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {pinned ? (
              <path d="M18 6 6 18M6 6l12 12"></path>
            ) : (
              <path d="M12 2v20M17 5l-5-3-5 3M17 19l-5 3-5-3"></path>
            )}
          </svg>
          {isExpanded && (
            <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-3)]">
              {pinned ? 'Unpin' : 'Lock Sidebar'}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

