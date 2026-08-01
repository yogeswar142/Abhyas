'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '../../components/layout/Sidebar';
import { Topbar } from '../../components/layout/Topbar';
import { LoadingScreen } from '../../components/shared/LoadingScreen';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pinned, setPinned] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('abhyas_sidebar_pinned');
    if (saved) {
      setPinned(saved === 'true');
    }
  }, []);

  const handleTogglePin = (state: boolean) => {
    setPinned(state);
    localStorage.setItem('abhyas_sidebar_pinned', String(state));
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-0)] text-[var(--text-0)] font-sans antialiased selection:bg-[var(--accent-soft)] selection:text-[var(--accent)] overflow-x-hidden">
      {/* Background radial accent glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(34,197,94,0.03),transparent_60%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none opacity-40" />

      <Sidebar pinned={pinned} onTogglePin={handleTogglePin} />
      
      <div 
        className="transition-[margin] duration-300 ease-in-out flex flex-col min-h-screen relative z-10"
        style={{ marginLeft: pinned ? 236 : 84 }}
      >
        <Topbar sidebarCollapsed={!pinned} onToggleSidebar={() => handleTogglePin(!pinned)} />
        
        <main className="flex-1 px-8 pt-24 pb-12 transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


