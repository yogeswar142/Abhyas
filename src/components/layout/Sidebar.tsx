'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '../../lib/utils';
import { NAV_ITEMS, APP_NAME } from '../../lib/constants';
import { Avatar } from '../ui/Avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

// ── Icon map ─────────────────────────────────────────────────────────────────

const ICONS = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  interview: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  ),
  reports: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  profile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  brand: (
    <img src="/symbol.png" alt="Abhyas" className="w-[22px] h-[22px] object-contain" />
  ),
};

// Tooltip labels per icon key
const NAV_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  interview: 'Voice Session',
  reports:   'Reports',
  profile:   'Profile',
  settings:  'Settings',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface SidebarProps {
  pinned: boolean;
  onTogglePin: (pinned: boolean) => void;
  isHovered?: boolean;
  onHoverChange?: (hovered: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Sidebar({ pinned, onTogglePin, isHovered, onHoverChange }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const isExpanded = pinned || isHovered;

  return (
    <TooltipProvider delayDuration={400}>
      <aside
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
        className={cn(
          'fixed left-0 top-0 bottom-0 z-50 flex flex-col',
          'bg-[var(--v-page)] border-r border-[var(--v-border)]',
          'transition-[width] duration-300 ease-in-out overflow-hidden',
          isExpanded ? 'w-[240px] shadow-[var(--shadow)]' : 'w-[64px]'
        )}
      >
        {/* Brand header */}
        <div className="h-14 flex items-center px-4 shrink-0 border-b border-[var(--v-border)]">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <div className="shrink-0 transition-transform duration-300">
              {ICONS.brand}
            </div>
            {isExpanded && (
              <span className="font-semibold text-[15px] text-[var(--v-tx0)] tracking-tight">
                {APP_NAME}
              </span>
            )}
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const icon = ICONS[item.icon as keyof typeof ICONS];
            const label = NAV_LABELS[item.icon] ?? item.label;

            return (
              <Tooltip key={item.href} delayDuration={400}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md transition-colors duration-150 overflow-hidden whitespace-nowrap',
                      isExpanded ? 'h-9 px-3' : 'h-10 w-10 justify-center mx-auto',
                      isActive
                        ? 'bg-[var(--v-float)] text-[var(--v-tx0)] font-medium'
                        : 'text-[var(--v-tx2)] hover:text-[var(--v-tx0)] hover:bg-[var(--v-raised)]'
                    )}
                  >
                    <div className="shrink-0 flex items-center justify-center">
                      {icon}
                    </div>
                    {isExpanded && (
                      <span className="text-[13px] flex-1">{item.label}</span>
                    )}
                    {/* "New" pulse badge — interview only */}
                    {item.href === '/interview/new' && isExpanded && (
                      <span className="shrink-0 bg-green-cta text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                        New
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                {/* Only show tooltip when collapsed */}
                {!isExpanded && (
                  <TooltipContent side="right">
                    {label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom — avatar + pin */}
        <div className="p-3 border-t border-[var(--v-border)] mt-auto flex flex-col gap-2">

          {/* User profile row */}
          <Tooltip delayDuration={400}>
            <TooltipTrigger asChild>
              <div className="group relative">
                <div
                  className={cn(
                    'flex items-center gap-2.5 p-1.5 rounded-md cursor-pointer',
                    'hover:bg-[var(--v-raised)] transition-colors overflow-hidden whitespace-nowrap',
                    isExpanded ? 'w-full' : 'w-10 h-10 justify-center mx-auto'
                  )}
                >
                  <Avatar
                    name={profile?.name || user?.email || 'User'}
                    size="sm"
                    className="shrink-0"
                  />
                  {isExpanded && (
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--v-tx0)] truncate">
                        {profile?.name || (user?.email ? user.email.split('@')[0] : 'User')}
                      </p>
                      <p className="text-[11px] text-[var(--v-tx2)] capitalize">
                        {profile?.plan || 'starter'} Tier
                      </p>
                    </div>
                  )}
                </div>

                {/* Sign out — hover reveal when expanded */}
                {isExpanded && (
                  <div className="absolute left-0 bottom-full mb-1.5 w-full opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <button
                      onClick={() => signOut().then(() => router.push('/login'))}
                      className="w-full flex items-center gap-2 p-2 rounded-md bg-[var(--v-card)] text-[var(--v-tx2)] hover:text-red-500 hover:bg-red-500/10 transition-colors text-xs font-medium border border-[var(--v-border)] shadow-md"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            {!isExpanded && (
              <TooltipContent side="right">Account</TooltipContent>
            )}
          </Tooltip>

          {/* Pin toggle */}
          <Tooltip delayDuration={400}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onTogglePin(!pinned)}
                className={cn(
                  'flex items-center rounded-md transition-colors overflow-hidden whitespace-nowrap text-[var(--v-tx2)] hover:text-[var(--v-tx0)] hover:bg-[var(--v-raised)]',
                  isExpanded ? 'h-8 px-3 w-full gap-2 text-xs font-medium' : 'h-10 w-10 justify-center mx-auto'
                )}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  {pinned ? (
                    <path d="M18 6 6 18M6 6l12 12" />
                  ) : (
                    <path d="M12 2v20M17 5l-5-3-5 3M17 19l-5 3-5-3" />
                  )}
                </svg>
                {isExpanded && (
                  <span className="text-[11px] font-medium tracking-wide">
                    {pinned ? 'Unpin Sidebar' : 'Lock Sidebar'}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            {!isExpanded && (
              <TooltipContent side="right">
                {pinned ? 'Unpin sidebar' : 'Pin sidebar'}
              </TooltipContent>
            )}
          </Tooltip>

        </div>
      </aside>
    </TooltipProvider>
  );
}
