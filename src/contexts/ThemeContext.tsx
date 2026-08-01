'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeCtxValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeCtx = createContext<ThemeCtxValue>({ theme: 'dark', toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  // Read persisted preference on mount
  useEffect(() => {
    const stored = localStorage.getItem('abhyas-theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
    }
  }, []);

  // Apply to <html> and persist whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('abhyas-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
