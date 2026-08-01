'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { mockSessions } from '@/lib/mock-data';
import { formatRelativeTime, formatDuration, getScoreColor } from '@/lib/utils';
import { INTERVIEW_TYPES } from '@/lib/constants';

const T = {
  card: 'var(--v-card)', cardHov: 'var(--v-raised)', border: 'var(--v-border)',
  line: 'var(--v-border)', green: 'var(--v-accent)', greenGhost: 'var(--v-float)',
  text0: 'var(--v-tx0)', text1: 'var(--v-tx1)', text2: 'var(--v-tx2)', text3: 'var(--v-tx3)',
};

const sL: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.18em', color: T.text3,
};

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, ...style }}>
      {children}
    </div>
  );
}

// ── Ring metric ───────────────────────────────────────────────────────────────

function RingMetric({ label, score }: { label: string; score: number }) {
  const r = 22, circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);
  useEffect(() => {
    const t = setTimeout(() => setOffset(circ - (circ * score) / 100), 300);
    return () => clearTimeout(t);
  }, [score, circ]);
  const color = score >= 80 ? T.green : score >= 65 ? '#eab308' : '#f97316';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      backgroundColor: T.cardHov, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: '14px 18px',
    }}>
      <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
        <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="26" cy="26" r={r} strokeWidth="3" stroke="rgba(255,255,255,0.07)" fill="none" />
          <circle cx="26" cy="26" r={r} strokeWidth="3" stroke={color} fill="none"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <span style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          fontSize: 11, fontWeight: 700, color: T.text0,
          fontVariantNumeric: 'tabular-nums',
        }}>{score}</span>
      </div>
      <div>
        <p style={{ ...sL, marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 20, fontWeight: 800, color: T.text0, fontVariantNumeric: 'tabular-nums' }}>
          {score}%
        </p>
      </div>
    </div>
  );
}

// ── Filters ───────────────────────────────────────────────────────────────────

const FILTERS = ['All', 'Completed', 'This Week'] as const;
type Filter = typeof FILTERS[number];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [filter, setFilter] = useState<Filter>('All');

  const filteredSessions = mockSessions.filter(session => {
    if (filter === 'Completed') return session.status === 'completed';
    if (filter === 'This Week')
      return new Date(session.date).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
    return true;
  });

  const rubrics = [
    { label: 'Clarity', score: 85 }, { label: 'Structure', score: 82 },
    { label: 'Confidence', score: 78 }, { label: 'Depth', score: 72 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', paddingBottom: 64 }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.line}`, paddingBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: T.green, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Analytics Console
          </span>
          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', color: T.text0, margin: 0 }}>
            Performance Index
          </h1>
          <p style={{ fontSize: 12, color: T.text2, marginTop: 4, lineHeight: 1.6 }}>
            Historical breakdown of your mock practice sessions, voice evaluation metrics, and rubric progression.
          </p>
        </div>
        <Link href="/interview/new">
          <button style={{
            backgroundColor: T.green, color: '#000', fontWeight: 700, fontSize: 13,
            padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            boxShadow: '0 0 32px -6px rgba(34,197,94,0.5)',
          }}>
            Configure Session →
          </button>
        </Link>
      </div>

      {/* Progression chart */}
      <Panel style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 256, height: 128, backgroundColor: 'rgba(34,197,94,0.06)', filter: 'blur(60px)', pointerEvents: 'none', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={sL}>Calibration Progression</p>
              <p style={{ fontSize: 36, fontWeight: 900, color: T.text0, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                82.5 <span style={{ fontSize: 14, fontWeight: 400, color: T.text2 }}>avg score</span>
              </p>
            </div>
            <span style={{ fontSize: 10, color: T.green, fontWeight: 600, backgroundColor: T.greenGhost, padding: '4px 10px', borderRadius: 8 }}>
              ↑ +4.3 pts this week
            </span>
          </div>
          <svg width="100%" height="100%" viewBox="0 0 400 80" preserveAspectRatio="none" style={{ display: 'block', height: 96, width: '100%' }}>
            <defs>
              <linearGradient id="rf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--v-accent)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--v-accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[20, 40, 60].map(y => <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="var(--v-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
            <path d="M0 72 C40 65 80 55 120 60 S200 40 250 32 S340 18 400 10 L400 80 L0 80 Z" fill="url(#rf)" />
            <path d="M0 72 C40 65 80 55 120 60 S200 40 250 32 S340 18 400 10" fill="none" stroke="var(--v-accent)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {/* Overlay dots with HTML to avoid SVG stretch distortion */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 96, pointerEvents: 'none' }}>
            {([[120, 60], [250, 32], [400, 10]] as [number, number][]).map(([x, y]) => (
              <div key={x} style={{
                position: 'absolute',
                left: `${(x / 400) * 100}%`,
                top: `${(y / 80) * 100}%`,
                width: 8, height: 8,
                borderRadius: '50%',
                backgroundColor: T.card,
                border: `2px solid ${T.green}`,
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 0 2px var(--v-card)'
              }} />
            ))}
          </div>
        </div>
      </Panel>

      {/* Rubric rings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={sL}>Granular Evaluation Rubrics</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {rubrics.map(r => <RingMetric key={r.label} label={r.label} score={r.score} />)}
        </div>
      </div>

      {/* Session history */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: T.card, border: `1px solid ${T.border}`, padding: 4, borderRadius: 12 }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                fontSize: 12, padding: '6px 14px', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer',
                backgroundColor: filter === f ? T.cardHov : 'transparent',
                color: filter === f ? T.text0 : T.text2,
                transition: 'all 0.15s ease',
              }}>
                {f}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: T.text3, fontFamily: 'monospace' }}>
            {filteredSessions.length} sessions
          </span>
        </div>

        {/* List */}
        {filteredSessions.length === 0 ? (
          <Panel style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: T.text2 }}>No sessions match this filter.</p>
          </Panel>
        ) : (
          <Panel style={{ overflow: 'hidden' }}>
            {filteredSessions.map((session, idx) => {
              const score = session.scores.overall;
              const typeLabel = INTERVIEW_TYPES.find(t => t.id === session.type)?.label ?? session.type;
              return (
                <div key={session.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px', gap: 16,
                  borderBottom: idx < filteredSessions.length - 1 ? `1px solid ${T.line}` : undefined,
                }}>
                  {/* Left */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      backgroundColor: T.cardHov, border: `1px solid ${T.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: T.green,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: T.text1, margin: 0 }}>
                          {session.company} · {session.role}
                        </p>
                        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.text3, backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
                          {typeLabel}
                        </span>
                      </div>
                      <p style={{ fontSize: 10, color: T.text3, fontFamily: 'monospace', marginTop: 2 }}>
                        {formatRelativeTime(session.date)} · {formatDuration(session.duration)}
                      </p>
                    </div>
                  </div>

                  {/* Right */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                    {session.status === 'completed' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: score >= 80 ? T.green : score >= 65 ? '#eab308' : '#f97316',
                          backgroundColor: score >= 80 ? T.greenGhost : score >= 65 ? 'rgba(234,179,8,0.1)' : 'rgba(249,115,22,0.1)',
                          padding: '2px 8px', borderRadius: 6,
                        }}>{score}/100</span>
                        <div style={{ width: 80, height: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${score}%`, backgroundColor: getScoreColor(score), borderRadius: 999 }} />
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#eab308', backgroundColor: 'rgba(234,179,8,0.1)', padding: '4px 8px', borderRadius: 6, fontFamily: 'monospace' }}>
                        {session.status}
                      </span>
                    )}
                    <Link href={`/interview/${session.id}`}>
                      <button style={{ fontSize: 12, fontWeight: 600, color: T.green, background: 'none', border: 'none', cursor: 'pointer' }}>
                        Review →
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </Panel>
        )}
      </div>
    </div>
  );
}
