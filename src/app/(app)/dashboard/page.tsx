'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { mockUser, mockStats, mockSessions } from '@/lib/mock-data';
import { formatRelativeTime, formatDuration, getScoreColor } from '@/lib/utils';
import { INTERVIEW_TYPES } from '@/lib/constants';

const SoundstageWaveform = () => {
  const [activeBars, setActiveBars] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBars(
        Array.from({ length: 18 }).map(() => Math.floor(Math.random() * 26) + 6)
      );
    }, 180);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1 h-12 px-4 bg-[var(--accent-soft)] rounded-2xl border border-[rgba(34,197,94,0.12)]">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-ping shrink-0" />
      <div className="flex items-end gap-[3px] h-8 w-44 px-2 overflow-hidden">
        {activeBars.map((height, idx) => (
          <span
            key={idx}
            className="w-[3px] bg-gradient-to-t from-[var(--accent)] to-emerald-400 rounded-full transition-all duration-150"
            style={{ height: `${height}px` }}
          />
        ))}
      </div>
      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--accent)] shrink-0 hidden sm:inline">AI Calibrated</span>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [ringOffset, setRingOffset] = useState(376.99); // Circumference for r=60
  
  // Calculate average scores across mockSessions
  const completedSessions = mockSessions.filter(s => s.status === 'completed');
  const avgOverall = Math.round(
    completedSessions.reduce((acc, s) => acc + s.scores.overall, 0) / completedSessions.length
  );

  useEffect(() => {
    // Smooth transition trigger for SVG circular ring
    const timer = setTimeout(() => {
      const circumference = 2 * Math.PI * 60;
      setRingOffset(circumference - (circumference * avgOverall) / 100);
    }, 400);
    return () => clearTimeout(timer);
  }, [avgOverall]);

  return (
    <div className="space-y-12 pb-16">
      {/* Editorial Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border)]/40 pb-6">
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono tracking-widest text-[var(--accent)] uppercase font-bold">
            Dashboard HUD • Calibrated
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-0)]">
            Good morning, Yogeswar.
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-2)] max-w-xl">
            Targeting <span className="text-[var(--text-0)] font-semibold">{mockUser.targetCompany}</span> • <span className="text-[var(--text-0)] font-semibold">{mockUser.targetRole}</span> track.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/interview/new">
            <Button variant="primary" size="sm" className="h-9 px-5 text-xs font-bold shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)] gap-1.5">
              <span>Start Voice Session</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Button>
          </Link>
        </div>
      </div>

      {/* Asymmetric Core Workspace Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Primary Workspace (70%) */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Interactive Soundstage Hero Banner */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--bg-1)] via-[var(--bg-2)] to-[var(--bg-1)] border border-[var(--border)] p-6 sm:p-8 group shadow-[var(--shadow)]">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--accent)]/5 blur-[100px] rounded-full pointer-events-none transition-opacity duration-500 group-hover:opacity-80" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4 max-w-xl">
                <span className="inline-flex items-center gap-2 bg-[var(--accent-soft)] border border-[rgba(34,197,94,0.2)] rounded-full px-3 py-1 text-[10px] text-[var(--accent)] font-semibold tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-ping" />
                  Recommended Practice Stage
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-0)] tracking-tight leading-tight">
                  Master System Architecture for <span className="italic font-serif text-[var(--accent)] font-normal">Google L5</span> Rounds
                </h2>
                <p className="text-xs sm:text-sm text-[var(--text-2)] leading-relaxed">
                  Practice scalability trade-offs, database replication bottlenecks, and caching topologies. Receive instant transcript feedback.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                <SoundstageWaveform />
                <Link href="/interview/new">
                  <Button variant="primary" size="md" className="h-10 px-6 text-xs font-bold shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                    Launch Simulator
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Readiness Index & Metric Rings */}
          <section className="space-y-4">
            <h2 className="text-[11px] font-mono uppercase tracking-wider font-bold text-[var(--text-2)]">Readiness Index Evaluation</h2>
            
            <Card variant="default" padding="lg" spotlight className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-[var(--bg-1)]">
              {/* Circular Gauge Ring */}
              <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[var(--border)]/40 pb-6 md:pb-0 md:pr-8">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="72" cy="72" r="60" className="stroke-[var(--border)] fill-none stroke-8" />
                    <circle 
                      cx="72" 
                      cy="72" 
                      r="60" 
                      className="stroke-[var(--accent)] fill-none stroke-8 transition-all duration-1000 ease-out" 
                      strokeDasharray={2 * Math.PI * 60}
                      strokeDashoffset={ringOffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center space-y-0.5">
                    <span className="text-3xl font-extrabold text-[var(--text-0)] font-mono tracking-tighter">{avgOverall}%</span>
                    <p className="text-[10px] font-mono text-[var(--text-2)] uppercase font-semibold">Readiness</p>
                  </div>
                </div>
              </div>

              {/* Rubric Benchmark feedback */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-[var(--text-0)]">Top 12% Candidate Benchmark</h3>
                  <p className="text-xs text-[var(--text-2)] leading-relaxed">
                    Based on your mock history, your answers match Google L5 engineering rubric metrics. Focus on deepening depth score parameter to exceed target thresholds.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-[var(--accent-soft)] border border-[rgba(34,197,94,0.15)] px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-[var(--accent)]">
                    +4.2% Growth Velocity
                  </div>
                  <div className="bg-[var(--bg-2)] border border-[var(--border)] px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-[var(--text-1)]">
                    12 Active Streak 🔥
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Minimalist Simulation Timeline History */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-mono uppercase tracking-wider font-bold text-[var(--text-2)]">Simulation Timeline History</h2>
              <Link href="/reports" className="text-xs text-[var(--accent)] font-semibold hover:underline flex items-center gap-1">
                Full analytics hub <span>→</span>
              </Link>
            </div>

            <Card padding="none" spotlight className="overflow-hidden border border-[var(--border)]">
              <div className="divide-y divide-[var(--border)]/40">
                {mockSessions.slice(0, 3).map(session => (
                  <div 
                    key={session.id} 
                    className="p-5 flex items-center justify-between hover:bg-[var(--surface-hv)] transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Circle Status indicator */}
                      <span 
                        className="w-2.5 h-2.5 rounded-full ring-4 ring-black/40" 
                        style={{ backgroundColor: getScoreColor(session.scores.overall) }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-[var(--text-0)] group-hover:text-[var(--accent)] transition-colors">
                            {session.company} • {session.role}
                          </p>
                          <Badge variant="muted" size="sm" className="text-[9px] uppercase tracking-wider font-mono">
                            {INTERVIEW_TYPES.find(t => t.id === session.type)?.label || session.type}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-[var(--text-2)] font-mono mt-0.5">
                          {formatRelativeTime(session.date)} • {formatDuration(session.duration)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-[var(--text-0)]">{session.scores.overall}/100</span>
                      </div>
                      <Link 
                        href={`/interview/${session.id}`} 
                        className="text-xs text-[var(--text-1)] group-hover:text-[var(--accent)] transition-colors flex items-center gap-1 font-semibold"
                      >
                        <span>Review</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>

        </div>

        {/* Right Sidebar Stage (30%) */}
        <div className="space-y-8">
          
          {/* Calibrated Criteria Details */}
          <section className="space-y-4">
            <h2 className="text-[11px] font-mono uppercase tracking-wider font-bold text-[var(--text-2)]">Calibrated Criteria</h2>
            
            <Card spotlight padding="md" className="space-y-5 bg-[var(--bg-1)] border border-[var(--border)]">
              {['clarity', 'structure', 'confidence', 'depth'].map(skill => {
                const avg = Math.round(completedSessions.reduce((acc, s) => acc + (s.scores as any)[skill], 0) / completedSessions.length);
                return (
                  <div key={skill} className="space-y-2">
                    <div className="flex justify-between text-xs font-mono font-medium">
                      <span className="capitalize text-[var(--text-1)]">{skill}</span>
                      <span className="font-bold text-[var(--text-0)]">{avg}%</span>
                    </div>
                    <div className="h-1 bg-[var(--bg-2)] border border-[var(--border)]/40 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-700 ease-out" 
                        style={{ width: `${avg}%`, backgroundColor: getScoreColor(avg) }}
                      />
                    </div>
                  </div>
                );
              })}
            </Card>
          </section>

          {/* Quick Domain Launcher Dock */}
          <section className="space-y-4">
            <h2 className="text-[11px] font-mono uppercase tracking-wider font-bold text-[var(--text-2)]">Practice Soundstage Dock</h2>
            
            <div className="flex flex-col gap-3">
              {[
                { title: 'Behavioral STAR', desc: 'Situational & leadership stories.', color: 'border-l-emerald-500' },
                { title: 'System Architecture', desc: 'Trade-off & scalability structures.', color: 'border-l-indigo-500' },
                { title: 'Custom JD calibration', desc: 'Calibrate via job requirements.', color: 'border-l-amber-500' }
              ].map((mod, i) => (
                <Card 
                  key={i} 
                  spotlight 
                  padding="sm" 
                  hoverable 
                  className={`border-l-2 ${mod.color} bg-[var(--bg-1)] hover:border-r hover:border-r-[var(--border-hv)] transition-all duration-200`}
                  onClick={() => router.push('/interview/new')}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-0)]">{mod.title}</h4>
                      <p className="text-[10px] text-[var(--text-2)] leading-tight mt-0.5">{mod.desc}</p>
                    </div>
                    <svg className="w-4 h-4 text-[var(--text-3)]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Card>
              ))}
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}
