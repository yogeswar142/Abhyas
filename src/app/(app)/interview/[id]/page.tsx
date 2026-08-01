'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

const AnimatedAcousticOrb = () => {
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulsing(prev => !prev);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Concentric ambient halos */}
      <div className={`absolute inset-0 rounded-full border border-[var(--accent)]/10 transition-transform duration-[1500ms] ease-in-out ${pulsing ? 'scale-110 opacity-30' : 'scale-90 opacity-10'}`} />
      <div className={`absolute inset-4 rounded-full border border-[var(--accent)]/20 transition-transform duration-[1200ms] ease-in-out ${pulsing ? 'scale-105 opacity-40' : 'scale-95 opacity-20'}`} />
      <div className="absolute inset-8 rounded-full border border-[var(--border)] opacity-30" />
      
      {/* Visualizer frequency spectrum circles */}
      <div className="absolute w-24 h-24 rounded-full bg-[var(--accent)]/5 blur-xl animate-pulse" />

      {/* Acoustic Orb Core */}
      <div className="relative z-10 w-20 h-20 rounded-full bg-[var(--bg-2)] border border-[var(--accent)]/30 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.15)] transition-all duration-300 hover:border-[var(--accent)] group">
        <svg width="24" height="28" viewBox="0 0 14 18" fill="none" className="text-[var(--accent)] transition-transform duration-300 group-hover:scale-115">
          <rect x="3.5" y="0.75" width="7" height="10" rx="3.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M0.75 8.5c0 3.452 2.798 6.25 6.25 6.25S13.25 11.952 13.25 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="7" y1="14.75" x2="7" y2="17.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

export default function ActiveSessionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Immersive Acoustic HUD Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]/40">
        <div className="flex items-center gap-3">
          <Badge variant="accent" className="font-mono text-[9px] uppercase tracking-widest font-bold">Acoustic Simulator Active</Badge>
          <span className="text-xs text-[var(--text-2)] font-mono">ID: {params.id || 'session_new_123'}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[var(--bg-1)] border border-[var(--border)] px-3 py-1.5 rounded-xl">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span className="font-mono text-xs font-bold text-[var(--text-0)]">{formatTime(seconds)}</span>
          </div>
          <Button variant="destructive" size="sm" onClick={() => router.push('/dashboard')} className="text-xs font-bold px-4">
            Exit Session
          </Button>
        </div>
      </div>

      {/* Centered Acoustic Soundstage (Hero Moment) */}
      <Card variant="default" padding="lg" spotlight className="flex flex-col items-center justify-center py-12 text-center bg-gradient-to-b from-[var(--bg-1)] to-[var(--bg-0)] border border-[var(--border)] relative overflow-hidden min-h-[380px]">
        {/* Faint sound grid backdrop */}
        <div className="absolute inset-0 opacity-[0.025] bg-[radial-gradient(circle_at_center,var(--accent)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        <AnimatedAcousticOrb />

        <div className="space-y-3 max-w-2xl mx-auto mt-6 relative z-10">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 rounded-full">
            Interviewer Prompt 01 of 05
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--text-0)] leading-snug tracking-tight">
            "Describe how you would design a system to resolve read volume congestion for real-time global document editing."
          </h3>
        </div>
      </Card>

      {/* Response Monitor Area (Lower Stage) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Live Speech Transcript Feed (60%) */}
        <Card padding="md" spotlight className="lg:col-span-2 flex flex-col bg-[var(--bg-1)] border border-[var(--border)] h-[280px]">
          <div className="flex justify-between items-center mb-3 pb-3 border-b border-[var(--border)]/40">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-ping" />
              <h3 className="text-[10px] font-mono font-bold text-[var(--text-1)] uppercase tracking-wider">Acoustic Audio stream</h3>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--accent)] font-bold">Audio connection active</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 text-[13px] text-[var(--text-2)] leading-relaxed font-mono pr-2">
            <p className="text-[var(--text-3)] italic">[00:12] Calibrated. AI presented document conflict resolution scenario.</p>
            <p className="text-[var(--text-0)] bg-[var(--bg-2)] p-4 rounded-xl border border-[var(--border)]/50">
              "For real-time concurrent updates, I would implement Conflict-Free Replicated Data Types (CRDTs) to handle localized character additions... At the service mesh layer, we would redirect global routing clusters closer to active client regions to minimize network write latency..."
            </p>
          </div>

          {/* Dynamic Frequency Bar Visualizer */}
          <div className="mt-4 pt-3 border-t border-[var(--border)]/40 flex items-center justify-between">
            <span className="text-[9px] font-mono text-[var(--text-3)] uppercase tracking-wider font-semibold">Sound Spectrum Analyzer</span>
            <div className="flex items-end gap-[2px] h-5 px-1 bg-[var(--bg-2)] rounded-lg">
              {[30, 60, 45, 90, 50, 20, 75, 40, 95, 60, 25, 80, 50, 70].map((h, i) => (
                <span 
                  key={i} 
                  className="w-[2px] bg-[var(--accent)] rounded-full transition-all duration-100" 
                  style={{ height: `${h}%`, opacity: 0.5 + (i % 2) * 0.25 }}
                />
              ))}
            </div>
          </div>
        </Card>

        {/* Right Column: Real-time Guidance HUD (40%) */}
        <Card padding="md" spotlight className="flex flex-col justify-between bg-[var(--bg-1)] border border-[var(--border)] h-[280px]">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]/40">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <h4 className="text-[10px] font-mono font-bold text-[var(--text-1)] uppercase tracking-wider">STAR Guideline Tip</h4>
            </div>

            <p className="text-xs text-[var(--text-2)] leading-relaxed">
              Nice definition of Conflict-Free Replicated Data Types (CRDTs). To exceed the <strong className="text-[var(--text-0)] font-semibold">Google L5 Rubric</strong> requirements, ensure you quantify scale size thresholds (e.g. read QPS limits) in your final architectural summary.
            </p>
          </div>

          <div className="pt-3 border-t border-[var(--border)]/40 flex items-center justify-between text-[10px] font-mono font-bold">
            <span className="text-[var(--text-3)] uppercase">Pace Counter</span>
            <span className="text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-full">112 wpm (Ideal)</span>
          </div>
        </Card>

      </div>
    </div>
  );
}
