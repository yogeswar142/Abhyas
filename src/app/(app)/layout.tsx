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
  const [isHovered, setIsHovered] = useState(false);
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

  const sidebarExpanded = pinned || isHovered;

  return (
    <div className="min-h-screen font-sans antialiased overflow-x-hidden">
      <Sidebar 
        pinned={pinned} 
        onTogglePin={handleTogglePin} 
        isHovered={isHovered}
        onHoverChange={setIsHovered}
      />
      
      <div 
        className="transition-[margin] duration-300 ease-in-out flex flex-col min-h-screen relative z-10"
        style={{ marginLeft: pinned ? 240 : 64 }}
      >
        <Topbar 
          sidebarCollapsed={!sidebarExpanded} 
          onToggleSidebar={() => handleTogglePin(!pinned)} 
        />
        
        <main 
          className="flex-1 min-h-screen pb-12 transition-all duration-300"
          style={{ paddingTop: 96, paddingLeft: 32, paddingRight: 32 }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}


