'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { mockSessions, mockStats } from '@/lib/mock-data';
import { formatRelativeTime, formatDuration, getScoreColor } from '@/lib/utils';
import { INTERVIEW_TYPES } from '@/lib/constants';

const CircularProgressMetric = ({ label, score }: { label: string; score: number }) => {
  const [offset, setOffset] = useState(150.79); // Circumference for r=24

  useEffect(() => {
    const timer = setTimeout(() => {
      const circumference = 2 * Math.PI * 24;
      setOffset(circumference - (circumference * score) / 100);
    }, 300);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex items-center justify-between p-4 bg-[var(--bg-2)] border border-[var(--border)]/40 rounded-2xl group hover:border-[var(--accent)]/20 transition-all duration-300">
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-2)]">{label}</span>
        <h4 className="text-xl font-extrabold text-[var(--text-0)] font-mono">{score}%</h4>
      </div>
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90">
          <circle cx="28" cy="28" r="24" className="stroke-[var(--border)] fill-none stroke-4" />
          <circle 
            cx="28" 
            cy="28" 
            r="24" 
            className="stroke-[var(--accent)] fill-none stroke-4 transition-all duration-[800ms] ease-out"
            strokeDasharray={2 * Math.PI * 24}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-[10px] font-mono font-bold text-[var(--text-0)]">{score}</span>
      </div>
    </div>
  );
};

const AnalyticalProgressionLine = () => {
  return (
    <div className="relative w-full h-48 bg-[var(--bg-1)] border border-[var(--border)] rounded-2xl p-6 overflow-hidden">
      <div className="absolute top-4 left-6 z-10 space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-2)]">Calibration Progression Curve</span>
        <h3 className="text-2xl font-extrabold text-[var(--text-0)] font-mono">82.5 <span className="text-xs text-[var(--text-2)] font-normal">Average score rating</span></h3>
      </div>
      
      {/* Dynamic Graph Grid Lines */}
      <div className="absolute inset-0 flex flex-col justify-between py-6 px-4 pointer-events-none opacity-[0.03]">
        <div className="border-b border-white w-full" />
        <div className="border-b border-white w-full" />
        <div className="border-b border-white w-full" />
        <div className="border-b border-white w-full" />
      </div>

      {/* SVG Liquid Line Area Graph */}
      <svg className="absolute bottom-0 left-0 right-0 w-full h-28 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Closed Gradient Path */}
        <path 
          d="M 0 90 Q 20 60 40 75 T 80 40 T 100 20 L 100 100 L 0 100 Z" 
          fill="url(#chartGlow)" 
        />
        
        {/* Line Curve */}
        <path 
          d="M 0 90 Q 20 60 40 75 T 80 40 T 100 20" 
          fill="none" 
          stroke="var(--accent)" 
          strokeWidth="1.8" 
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
        
        {/* Highlight data points */}
        <circle cx="40" cy="75" r="1.5" fill="var(--bg-0)" stroke="var(--accent)" strokeWidth="1" />
        <circle cx="80" cy="40" r="1.5" fill="var(--bg-0)" stroke="var(--accent)" strokeWidth="1" />
        <circle cx="100" cy="20" r="1.5" fill="var(--bg-0)" stroke="var(--accent)" strokeWidth="1" />
      </svg>
    </div>
  );
};

export default function ReportsPage() {
  const [filter, setFilter] = useState('All');
  
  const filteredSessions = mockSessions.filter(session => {
    if (filter === 'All') return true;
    if (filter === 'Completed') return session.status === 'completed';
    if (filter === 'This Week') return new Date(session.date).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
    return true;
  });

  return (
    <div className="space-y-10 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[var(--border)]/40">
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono tracking-widest text-[var(--accent)] uppercase font-bold">
            Analytics Console
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-0)]">
            Performance Index
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-2)] max-w-xl leading-relaxed">
            Historical breakdown of your mock practice sessions, voice evaluation metrics, and rubric progression.
          </p>
        </div>
        <Link href="/interview/new">
          <Button variant="primary" size="sm" className="h-9 px-5 text-xs font-bold shadow-[0_0_20px_-3px_rgba(34,197,94,0.4)]">
            Configure Session →
          </Button>
        </Link>
      </div>

      {/* Stripe-style progression linear curve (Hero Moment) */}
      <AnalyticalProgressionLine />

      {/* Spacing alignment: rubrics circular progress grids */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-mono uppercase tracking-wider font-bold text-[var(--text-2)]">Granular Evaluation Rubrics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <CircularProgressMetric label="Clarity Metric" score={85} />
          <CircularProgressMetric label="Structure Logic" score={82} />
          <CircularProgressMetric label="Confidence Index" score={78} />
          <CircularProgressMetric label="Subject Depth" score={72} />
        </div>
      </section>

      {/* Calibration History Feed Timeline */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-[var(--bg-1)] border border-[var(--border)] p-1 rounded-xl">
            {['All', 'Completed', 'This Week'].map(f => (
              <button 
                key={f} 
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 ${
                  filter === f 
                    ? 'bg-[var(--bg-2)] text-[var(--text-0)] border border-[var(--border)] shadow-sm' 
                    : 'text-[var(--text-2)] hover:text-[var(--text-0)]'
                }`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="text-xs text-[var(--text-2)] font-mono">{filteredSessions.length} total sessions</span>
        </div>

        {filteredSessions.length === 0 ? (
          <Card padding="lg">
            <EmptyState 
              title="No reports match filter" 
              description="You haven't completed any sessions matching this criteria yet." 
              action={{ label: 'Configure session', onClick: () => window.location.href = '/interview/new' }}
            />
          </Card>
        ) : (
          <Card padding="none" spotlight className="overflow-hidden border border-[var(--border)]">
            <div className="divide-y divide-[var(--border)]/40">
              {filteredSessions.map(session => (
                <div 
                  key={session.id} 
                  className="p-5 flex items-center justify-between hover:bg-[var(--surface-hv)] transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0 group-hover:border-[var(--accent)]/30 transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-[var(--text-0)] group-hover:text-[var(--accent)] transition-colors">{session.company} • {session.role}</p>
                        <Badge variant="muted" size="sm" className="text-[9px] font-mono uppercase tracking-wider">
                          {INTERVIEW_TYPES.find(t => t.id === session.type)?.label || session.type}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-[var(--text-2)] font-mono mt-0.5">
                        {formatRelativeTime(session.date)} • {formatDuration(session.duration)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {session.status === 'completed' ? (
                      <div className="flex items-center gap-3 w-40">
                        <span className="font-bold font-mono text-[var(--text-0)] text-xs">{session.scores.overall}/100</span>
                        <div className="flex-1 h-1 bg-[var(--bg-2)] border border-[var(--border)]/40 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ width: `${session.scores.overall}%`, backgroundColor: getScoreColor(session.scores.overall) }}
                          />
                        </div>
                      </div>
                    ) : (
                      <Badge variant={session.status === 'in-progress' ? 'warning' : 'default'} size="sm" className="font-mono text-[9px] uppercase">
                        {session.status}
                      </Badge>
                    )}
                    
                    <Link href={`/interview/${session.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hv)] gap-1">
                        <span>Review Report</span>
                        <span>→</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
