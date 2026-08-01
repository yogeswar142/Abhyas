'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// ── Provider ─────────────────────────────────────────────────────────────────

interface ProviderCtx { delayDuration: number }
const ProviderContext = React.createContext<ProviderCtx>({ delayDuration: 400 });

export function TooltipProvider({
  children,
  delayDuration = 400,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) {
  return (
    <ProviderContext.Provider value={{ delayDuration }}>
      {children}
    </ProviderContext.Provider>
  );
}

// ── Item context ─────────────────────────────────────────────────────────────

interface ItemCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  delay: number;
}
const ItemContext = React.createContext<ItemCtx | null>(null);

export function Tooltip({
  children,
  delayDuration,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) {
  const provider = React.useContext(ProviderContext);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  return (
    <ItemContext.Provider
      value={{ open, setOpen, triggerRef, delay: delayDuration ?? provider.delayDuration }}
    >
      {children}
    </ItemContext.Provider>
  );
}

// ── Trigger ───────────────────────────────────────────────────────────────────

export function TooltipTrigger({
  children,
}: {
  children: React.ReactElement;
  asChild?: boolean;
}) {
  const ctx = React.useContext(ItemContext)!;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return React.cloneElement(children, {
    ref: (el: HTMLElement | null) => {
      ctx.triggerRef.current = el;
      const childRef = (children as any).ref;
      if (typeof childRef === 'function') childRef(el);
      else if (childRef) childRef.current = el;
    },
    onMouseEnter: (e: React.MouseEvent) => {
      timerRef.current = setTimeout(() => ctx.setOpen(true), ctx.delay);
      (children.props as any).onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ctx.setOpen(false);
      (children.props as any).onMouseLeave?.(e);
    },
  } as any);
}

// ── Content ───────────────────────────────────────────────────────────────────

const TRANSFORMS: Record<string, string> = {
  right:  'translateY(-50%)',
  left:   'translateY(-50%) translateX(-100%)',
  bottom: 'translateX(-50%)',
  top:    'translateX(-50%) translateY(-100%)',
};

export function TooltipContent({
  children,
  side = 'top',
  className,
}: {
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}) {
  const ctx = React.useContext(ItemContext)!;
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!ctx.open || !ctx.triggerRef.current) return;
    const r = ctx.triggerRef.current.getBoundingClientRect();
    const G = 8;
    const scroll = { x: window.scrollX, y: window.scrollY };
    if (side === 'right')  setPos({ top: r.top + r.height / 2 + scroll.y, left: r.right + G + scroll.x });
    else if (side === 'left')   setPos({ top: r.top + r.height / 2 + scroll.y, left: r.left - G + scroll.x });
    else if (side === 'bottom') setPos({ top: r.bottom + G + scroll.y,          left: r.left + r.width / 2 + scroll.x });
    else                        setPos({ top: r.top - G + scroll.y,             left: r.left + r.width / 2 + scroll.x });
  }, [ctx.open, side]);

  if (!mounted || !ctx.open) return null;

  return createPortal(
    <div
      role="tooltip"
      style={{ position: 'absolute', top: pos.top, left: pos.left, transform: TRANSFORMS[side], zIndex: 9999, pointerEvents: 'none' }}
      className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap bg-[var(--surface-float)] border border-[var(--border)] text-white/80 shadow-[var(--shadow)] backdrop-blur-sm ${className ?? ''}`}
    >
      {children}
    </div>,
    document.body
  );
}
