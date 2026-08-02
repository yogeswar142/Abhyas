'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatRelativeTime, formatDuration } from '@/lib/utils';
import { INTERVIEW_TYPES } from '@/lib/constants';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import type { Session, InterviewType, SessionStatus } from '@/types';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  page:        'var(--v-page)',
  card:        'var(--v-card)',
  raised:      'var(--v-raised)',
  float:       'var(--v-float)',
  border:      'var(--v-border)',
  line:        'var(--v-line)',
  green:       'var(--v-accent)',
  greenGhost:  'var(--v-accent-ghost)',
  text0:       'var(--v-tx0)',
  text1:       'var(--v-tx1)',
  text2:       'var(--v-tx2)',
  text3:       'var(--v-tx3)',
  track:       'var(--v-track)',
  hover:       'var(--v-hover)',
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────
function scoreCol(s: number) {
  return s >= 85 ? T.green : s >= 70 ? '#eab308' : '#f97316';
}

const sL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: T.text2,
  letterSpacing: '0.01em',
};

// ── Panel ────────────────────────────────────────────────────────────────────
function Panel({ children, style, hoverable = false }: { children: React.ReactNode; style?: React.CSSProperties, hoverable?: boolean }) {
  return (
    <div 
      style={{
        backgroundColor: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        ...style,
      }}
      onMouseEnter={e => {
        if (hoverable) {
          e.currentTarget.style.borderColor = 'var(--v-tx3)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
        }
      }}
      onMouseLeave={e => {
        if (hoverable) {
          e.currentTarget.style.borderColor = T.border;
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {children}
    </div>
  );
}

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[], color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 -10 100 120" preserveAspectRatio="none" style={{ width: '100%', height: 32, overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Readiness Ring ───────────────────────────────────────────────────────────
function ReadinessRing({ score, circ, offset }: { score: number; circ: number; offset: number }) {
  return (
    <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
      <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="48" cy="48" r="42" fill="none" strokeWidth="6" style={{ stroke: T.track }} />
        <circle
          cx="48" cy="48" r="42"
          fill="none" strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ stroke: scoreCol(score), transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: 26, fontWeight: 700,
          lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          color: T.text0, letterSpacing: '-0.03em'
        }}>{score}</span>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
function mapInterviewToSession(row: any): Session {
  return {
    id: row.id,
    type: row.type as InterviewType,
    company: row.company,
    role: row.role,
    date: row.created_at,
    duration: row.duration,
    status: row.status as SessionStatus,
    scores: {
      clarity: row.score_clarity || 0,
      structure: row.score_structure || 0,
      confidence: row.score_confidence || 0,
      depth: row.score_depth || 0,
      overall: Number(row.score_overall || 0),
    },
    feedback: row.feedback || undefined,
    questionsAsked: row.questions_asked || 0,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [ringOff, setRingOff] = useState(0);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalHours: 0,
    activeStreak: 0,
    avgScore: 0
  });

  // Only fully scored sessions count toward skill metrics
  const completed = sessions.filter(s => s.status === 'completed' && s.scores.overall > 0);
  const recentSessions = sessions.filter(
    s => s.status === 'completed' || s.status === 'analyzing' || s.status === 'incomplete'
  );
  const avg = (key: keyof Session['scores']) => {
    if (completed.length === 0) return 0;
    return Math.round(completed.reduce((a, s) => a + s.scores[key], 0) / completed.length);
  };
  const avgOverall = stats.avgScore || avg('overall');

  const R = 42;
  const CIRC = 2 * Math.PI * R;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!user) {
      if (!authLoading) setLoadingSessions(false);
      return;
    }

    const fetchInterviews = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const res = await fetch(`${backendUrl}/api/interviews?limit=30`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          console.error('Error fetching interviews from backend:', res.statusText);
          return;
        }
        const data = await res.json();
        setSessions(data.map(mapInterviewToSession));
      } catch (err) {
        console.error('Failed to load interviews:', err);
      } finally {
        setLoadingSessions(false);
      }
    };

    const fetchStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const res = await fetch(`${backendUrl}/api/interviews/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          console.error('Error fetching stats from backend:', res.statusText);
          return;
        }
        const data = await res.json();
        if (data && data.length > 0) {
          const s = data[0];
          setStats({
            totalSessions: Number(s.total_sessions || 0),
            totalHours: Number(s.total_hours || 0),
            activeStreak: Number(s.active_streak || 0),
            avgScore: Math.round(Number(s.avg_score || 0))
          });
        }
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
    };

    fetchInterviews();
    fetchStats();
  }, [user, authLoading, supabase]);

  useEffect(() => {
    if (!mounted || loadingSessions) return;
    setRingOff(CIRC);
    const t = setTimeout(() => setRingOff(CIRC - (CIRC * avgOverall) / 100), 200);
    return () => clearTimeout(t);
  }, [mounted, loadingSessions, avgOverall, CIRC]);

  const launch = async () => {
    setLaunching(true);
    await new Promise(r => setTimeout(r, 500));
    router.push('/interview/new');
  };

  if (!mounted || authLoading || loadingSessions) return <DashboardSkeleton />;

  const targetCompany = profile?.target_company || 'your dream company';
  const targetRole = profile?.target_role || 'your target role';

  // Overall score history for the first sparkline
  const trendData1 = sessions.length > 0 
    ? sessions.map(s => s.scores.overall || 50).reverse() 
    : [50, 50, 50, 50, 50, 50, 50];

  // Streak trend: 7 days activity
  const trendData2 = sessions.length > 0 
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        return sessions.filter(s => s.date.split('T')[0] === dateStr).length;
      })
    : [0, 0, 0, 0, 0, 0, stats.activeStreak];

  // Practice hours trend: 7 days cumulative hours
  const trendData3 = sessions.length > 0 
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        const hours = sessions
          .filter(s => s.status === 'completed' && s.date.split('T')[0] === dateStr)
          .reduce((sum, s) => sum + s.duration, 0) / 60;
        return Number(hours.toFixed(1));
      })
    : [0, 0, 0, 0, 0, 0, stats.totalHours];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', paddingBottom: 64 }}>
      
      {/* ── HERO (Vercel Style) ── */}
      <Panel style={{ overflow: 'hidden', position: 'relative' }}>
        {/* Subtle dot grid pattern via radial gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(var(--v-tx3) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.15,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom right, var(--v-card) 20%, transparent, var(--v-card) 80%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 24,
          padding: '40px 32px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, flex: 1 }}>
            <h1 style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              color: T.text0,
              lineHeight: 1.1,
              margin: 0,
            }}>
              Ready for your next interview?
            </h1>
            <p style={{ fontSize: 15, color: T.text2, margin: 0, maxWidth: 500, lineHeight: 1.5 }}>
              Targeting <strong style={{ color: T.text0, fontWeight: 500 }}>{targetCompany}</strong> as a <strong style={{ color: T.text0, fontWeight: 500 }}>{targetRole}</strong>. 
              Your current readiness score is tracking in the top 12% of candidates.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, flexShrink: 0 }}>
            <button
              onClick={launch}
              disabled={launching}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                backgroundColor: T.text0,
                color: T.page,
                fontWeight: 600, fontSize: 14,
                padding: '0 24px', height: 44,
                borderRadius: 6, border: 'none', cursor: launching ? 'wait' : 'pointer',
                transition: 'transform 0.1s ease, opacity 0.2s ease',
                minWidth: 160, justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                opacity: launching ? 0.7 : 1
              }}
              onMouseEnter={e => { if (!launching) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={e => { if (!launching) e.currentTarget.style.opacity = '1'; }}
            >
              {launching ? (
                <div style={{ width: 16, height: 16, border: `2px solid ${T.page}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : 'Start Interview'}
            </button>
            <style dangerouslySetInnerHTML={{__html: `@keyframes spin { to { transform: rotate(360deg); } }`}} />
          </div>
        </div>
      </Panel>

      {/* ── METRICS STRIP ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
        <Panel style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }} hoverable>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={sL}>Total Sessions</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color: T.text0, lineHeight: 1 }}>{stats.totalSessions}</span>
            <div style={{ width: 80 }}><Sparkline data={trendData1} color={T.text3} /></div>
          </div>
        </Panel>

        <Panel style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }} hoverable>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={sL}>Readiness Score</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={scoreCol(avgOverall)} strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color: T.text0, lineHeight: 1 }}>
              {avgOverall}<span style={{ fontSize: 16, color: T.text2, fontWeight: 500 }}>%</span>
            </span>
            <div style={{ width: 80 }}><Sparkline data={trendData1} color={scoreCol(avgOverall)} /></div>
          </div>
        </Panel>

        <Panel style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }} hoverable>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={sL}>Active Streak</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M17.5 19c2.5-2 2.5-6 0-8-1.5-1.5-2-4-2-4s-1 3-3 4c-2.5 1.5-3 5-1 7.5a6.5 6.5 0 0 0 6 0z"/></svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color: T.text0, lineHeight: 1 }}>
              {stats.activeStreak}<span style={{ fontSize: 16, color: T.text2, fontWeight: 500 }}>d</span>
            </span>
            <div style={{ width: 80 }}><Sparkline data={trendData2} color="#f59e0b" /></div>
          </div>
        </Panel>

        <Panel style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }} hoverable>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={sL}>Practice Time</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color: T.text0, lineHeight: 1 }}>
              {stats.totalHours}<span style={{ fontSize: 16, color: T.text2, fontWeight: 500 }}>h</span>
            </span>
            <div style={{ width: 80 }}><Sparkline data={trendData3} color={T.text3} /></div>
          </div>
        </Panel>
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        
        {/* ── LEFT: RECENT SESSIONS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: T.text0, margin: 0 }}>Recent Simulations</h2>
            <Link href="/reports" style={{ fontSize: 13, color: T.text2, textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = T.text0} onMouseLeave={e => e.currentTarget.style.color = T.text2}>
              View all →
            </Link>
          </div>

          <Panel style={{ overflow: 'hidden' }}>
            {recentSessions.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ color: T.text2, fontSize: 14 }}>No sessions completed yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentSessions.slice(0, 5).map((session, idx) => {
                  const score = session.scores.overall;
                  const analyzing = session.status === 'analyzing';
                  const typeLabel = INTERVIEW_TYPES.find(t => t.id === session.type)?.label ?? session.type;
                  
                  return (
                    <div
                      key={session.id}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr auto auto',
                        alignItems: 'center', padding: '16px 20px', gap: 16,
                        borderBottom: idx < Math.min(recentSessions.length, 5) - 1 ? `1px solid ${T.line}` : 'none',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = T.hover)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: T.text0 }}>
                            {session.company}
                          </span>
                          <span style={{ fontSize: 13, color: T.text2 }}>· {session.role}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: T.text3 }}>{formatRelativeTime(session.date)}</span>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: T.line }} />
                          <span style={{ fontSize: 12, color: T.text3 }}>{formatDuration(session.duration)}</span>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: T.line }} />
                          <span style={{ 
                            fontSize: 11, fontWeight: 500, color: T.text2, 
                            backgroundColor: T.raised, padding: '2px 6px', borderRadius: 4 
                          }}>
                            {typeLabel}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 88, justifyContent: 'flex-end' }}>
                        {analyzing ? (
                          <span style={{
                            fontSize: 10, fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase',
                            letterSpacing: '0.06em', color: '#eab308',
                          }}>
                            Calculating…
                          </span>
                        ) : session.status === 'incomplete' ? (
                          <span style={{
                            fontSize: 10, fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase',
                            letterSpacing: '0.06em', color: '#6b7280',
                          }}>
                            Didn&apos;t Finish
                          </span>
                        ) : (
                          <span style={{ fontSize: 16, fontWeight: 600, color: scoreCol(score), fontVariantNumeric: 'tabular-nums' }}>
                            {score}
                          </span>
                        )}
                      </div>

                      <Link href={`/interview/${session.id}`}>
                        <button style={{
                          fontSize: 12, fontWeight: 500, color: T.text0,
                          backgroundColor: T.raised, border: `1px solid ${T.border}`,
                          padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = T.hover}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = T.raised}
                        >
                          {analyzing ? 'Open' : session.status === 'incomplete' ? 'View' : 'Review'}
                        </button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* ── RIGHT: ANALYSIS & QUICK ACTIONS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: T.text0, margin: 0 }}>Skill Analysis</h2>
            <Panel style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <ReadinessRing score={avgOverall} circ={CIRC} offset={ringOff} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 13, color: T.text1, fontWeight: 500 }}>Overall Readiness</span>
                  <span style={{ fontSize: 13, color: T.green, fontWeight: 500 }}>Top 12% Cohort</span>
                </div>
              </div>
              
              <div style={{ width: '100%', height: 1, backgroundColor: T.line }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Clarity',    val: avg('clarity') },
                  { label: 'Structure',  val: avg('structure') },
                  { label: 'Confidence', val: avg('confidence') },
                  { label: 'Depth',      val: avg('depth') },
                ].map(skill => (
                  <div key={skill.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: T.text1 }}>{skill.label}</span>
                      <span style={{ fontSize: 12, color: T.text2, fontVariantNumeric: 'tabular-nums' }}>{skill.val}%</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, backgroundColor: T.track, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${skill.val}%`, backgroundColor: T.text0, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: T.text0, margin: 0 }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'New Behavioral Mock', icon: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3' },
                { label: 'System Design Drill', icon: 'M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4 M14 2v6h6 M2 15h10 M2 18h10' },
                { label: 'Review Past Feedback', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8' },
              ].map(action => (
                <Panel key={action.label} hoverable style={{ padding: '12px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.text2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={action.icon} />
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.text1 }}>{action.label}</span>
                  </div>
                </Panel>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
