'use client';

import React from 'react';
import { Breadcrumbs } from './Breadcrumbs';
import { cn } from '@/lib/utils';
import { Avatar } from '../ui/Avatar';
import { mockUser } from '@/lib/mock-data';

interface TopbarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function Topbar({ sidebarCollapsed, onToggleSidebar }: TopbarProps) {
  return (
    <header
      className={cn(
        'fixed top-4 right-6 h-12 bg-[var(--bg-1)]/75 backdrop-blur-xl border border-[var(--border)] rounded-2xl flex items-center justify-between px-6 z-40 transition-[left,box-shadow] duration-300 ease-in-out shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)]',
        sidebarCollapsed ? 'left-[100px]' : 'left-[252px]'
      )}
    >
      {/* Left: Mobile Toggle + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-[var(--text-2)] hover:text-[var(--text-0)] hover:bg-[var(--surface-hv)] rounded-lg transition-colors lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        
        <Breadcrumbs />
      </div>

      {/* Right: Search, Notifications, User Avatar */}
      <div className="flex items-center gap-3">
        {/* AI Simulator Live Status Pill */}
        <div className="hidden sm:flex items-center gap-2 bg-[var(--surface-hv)] border border-[var(--border)] px-2.5 py-1 rounded-full text-[11px] text-[var(--text-1)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
          </span>
          <span className="font-mono text-[10px] font-bold text-[var(--text-1)] uppercase tracking-wider">AI Online</span>
        </div>

        {/* Search Command Trigger */}
        <button 
          className="hidden sm:flex items-center gap-2 h-8 px-3 bg-[var(--bg-2)] border border-[var(--border)] hover:border-[var(--border-hv)] text-[var(--text-2)] hover:text-[var(--text-1)] rounded-lg text-xs transition-colors"
          onClick={() => {}}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>Search or jump to...</span>
          <kbd className="font-mono text-[10px] bg-[var(--bg-3)] px-1.5 py-0.5 rounded text-[var(--text-1)] border border-[var(--border)] ml-2">⌘K</kbd>
        </button>

        {/* Notifications Icon */}
        <button 
          className="relative w-8 h-8 flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-0)] hover:bg-[var(--surface-hv)] rounded-lg transition-colors"
          title="Notifications"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--accent)] rounded-full ring-2 ring-[var(--bg-0)]"></span>
        </button>

        <div className="w-[1px] h-4 bg-[var(--border)]"></div>

        {/* User Pill */}
        <div className="flex items-center gap-2">
          <Avatar name={mockUser.name} size="sm" />
          <span className="hidden md:inline-block text-xs font-semibold text-[var(--text-0)]">{mockUser.name}</span>
        </div>
      </div>
    </header>
  );
}

