'use client';

import React from 'react';
import { Breadcrumbs } from './Breadcrumbs';
import { cn } from '@/lib/utils';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

// Sun icon
function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

// Moon icon
function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

interface TopbarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function Topbar({ sidebarCollapsed, onToggleSidebar }: TopbarProps) {
  const { theme, toggle } = useTheme();
  const { user, profile } = useAuth();

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-14 backdrop-blur-xl flex items-center justify-between px-6 z-40 transition-[left] duration-300 ease-in-out',
        sidebarCollapsed ? 'left-[64px]' : 'left-[240px]'
      )}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--v-page) 85%, transparent)',
        borderBottom: '1px solid var(--v-border)',
      }}
    >
      {/* Left: Mobile Toggle + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg transition-colors lg:hidden"
          style={{ color: 'var(--v-tx2)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Breadcrumbs />
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">



        {/* Search */}
        <button
          className="hidden sm:flex items-center justify-between h-8 px-3 rounded-md transition-colors group"
          style={{ 
            backgroundColor: 'var(--v-raised)', 
            border: '1px solid var(--v-border)', 
            width: 200,
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--v-raised)'}
        >
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--v-tx2)' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span style={{ fontSize: 13, color: 'var(--v-tx2)', fontWeight: 400 }}>Search...</span>
          </div>
          <kbd
            className="font-mono rounded"
            style={{ fontSize: 10, backgroundColor: 'var(--v-page)', padding: '1px 4px', border: '1px solid var(--v-border)', color: 'var(--v-tx2)' }}
          >⌘K</kbd>
        </button>

        <div style={{ width: 1, height: 20, backgroundColor: 'var(--v-border)', margin: '0 4px' }} />

        {/* Notifications */}
        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--v-tx1)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--v-hover)'; e.currentTarget.style.color = 'var(--v-tx0)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--v-tx1)'; }}
          title="Notifications"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--v-accent)' }} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-8 h-8 flex items-center justify-center rounded-md transition-all"
          style={{ color: 'var(--v-tx1)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--v-hover)'; e.currentTarget.style.color = 'var(--v-tx0)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--v-tx1)'; }}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* User Profile */}
        <button 
          className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-md transition-colors ml-1"
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Avatar name={profile?.name || user?.email || 'User'} size="sm" />
          <div className="hidden md:flex items-center gap-1">
            <span className="text-[13px] font-medium" style={{ color: 'var(--v-tx0)' }}>
              {(profile?.name || user?.email?.split('@')[0] || 'User').split(' ')[0]}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--v-tx2)' }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </button>
      </div>
    </header>
  );
}
