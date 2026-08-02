'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import type { Session, InterviewType, SessionStatus } from '@/types';

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

function FieldInput({ label, value, onChange }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</label>
      <input
        value={value}
        onChange={onChange}
        style={{
          backgroundColor: T.cardHov, border: `1px solid ${T.border}`, borderRadius: 10,
          padding: '10px 14px', fontSize: 13, color: T.text0, outline: 'none',
          width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
        }}
        onFocus={e => { e.target.style.borderColor = T.green; e.target.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
        onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

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

export default function ProfilePage() {
  const { user, profile, refreshProfile, isLoading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [mounted, setMounted] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetCompany, setTargetCompany] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  // Initialize targets from profile
  useEffect(() => {
    if (profile) {
      setTargetCompany(profile.target_company || '');
      setTargetRole(profile.target_role || '');
    }
  }, [profile]);

  // Fetch user interviews history for real statistics
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
        const res = await fetch(`${backendUrl}/api/interviews`, {
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
    fetchInterviews();
  }, [user, authLoading, supabase]);

  if (!mounted || authLoading || loadingSessions) return <ProfileSkeleton />;

  const completed = sessions.filter(s => s.status === 'completed');
  const avgOverall = completed.length > 0 
    ? Math.round(completed.reduce((a, s) => a + s.scores.overall, 0) / completed.length) 
    : 0;
  const bestScore = completed.length > 0 
    ? Math.max(...completed.map(s => s.scores.overall)) 
    : 0;
  const totalHours = completed.reduce((a, s) => a + s.duration, 0) / 60;

  const statsGrid = [
    { value: completed.length.toString(), label: 'Mock sessions completed', accent: false, size: '3.2rem' },
    { value: `${avgOverall}/100`, label: 'Average score', accent: false, size: '2.2rem' },
    { value: `${bestScore}/100`, label: 'Personal best', accent: true, size: '2.6rem' },
    { value: `${totalHours.toFixed(1)}h`, label: 'Total practice time', accent: false, size: '2.2rem' },
  ];

  const milestones = [
    { title: `${completed.length} Sessions Completed`, desc: 'Consistent mock practice history maintained.', date: 'Live data', color: T.green },
    { title: 'Personal Best Score', desc: `Highest mock evaluation rating of ${bestScore} points.`, date: 'Live data', color: '#f59e0b' },
    { title: 'Calibration Standard Active', desc: `Targeting ${targetCompany || 'Dream Company'} SWE targets.`, date: 'Calibrated', color: T.text2 },
  ];

  const handleSaveTarget = async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          target_company: targetCompany.trim(),
          target_role: targetRole.trim(),
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error('Error updating targets:', errData.error);
        alert(`Failed to save: ${errData.error || res.statusText}`);
      } else {
        await refreshProfile();
        setEditingTarget(false);
      }
    } catch (err) {
      console.error('Failed to save calibration:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', paddingBottom: 64 }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.line}`, paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: T.green, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Prestige Board
        </span>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', color: T.text0, margin: 0 }}>
          Candidate Profile
        </h1>
        <p style={{ fontSize: 12, color: T.text2, marginTop: 4 }}>
          Verifiable milestones, readiness index, and role target calibrations.
        </p>
      </div>

      {/* Profile card */}
      <Panel style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Avatar */}
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          backgroundColor: T.cardHov, border: `2px solid ${T.green}`,
          outline: `4px solid rgba(34,197,94,0.12)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, color: T.text0, flexShrink: 0, userSelect: 'none',
        }}>
          {(profile?.name || user?.email || 'User').charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: T.text0, margin: 0, lineHeight: 1 }}>
            {profile?.name || user?.email?.split('@')[0] || 'User'}
          </h2>
          <span style={{
            display: 'inline-block', marginTop: 6,
            backgroundColor: T.greenGhost, color: T.green,
            fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600,
            padding: '3px 8px', borderRadius: 999,
          }}>{profile?.plan || 'starter'} Calibrated</span>
          <p style={{ fontSize: 12, color: T.text3, marginTop: 6 }}>
            {user?.email}
          </p>
        </div>

        <button style={{
          fontSize: 12, fontWeight: 600, color: T.text2,
          border: `1px solid ${T.border}`, backgroundColor: 'transparent',
          padding: '8px 14px', borderRadius: 10, cursor: 'pointer', flexShrink: 0,
        }}>
          ✎ Edit profile
        </button>
      </Panel>

      {/* Stats 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {statsGrid.map(s => (
          <Panel key={s.label} style={{ padding: 24 }}>
            <p style={{ fontSize: s.size as any, fontWeight: 900, lineHeight: 1, margin: 0, color: s.accent ? T.green : T.text0, fontVariantNumeric: 'tabular-nums' }}>
              {s.value}
            </p>
            <p style={{ ...sL, marginTop: 8 }}>{s.label}</p>
          </Panel>
        ))}
      </div>

      {/* Goals + Milestones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* Target Goals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ ...sL }}>Calibrate Target Goals</p>

          {editingTarget ? (
            <Panel style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FieldInput label="Target Company" value={targetCompany} onChange={e => setTargetCompany(e.target.value)} />
              <FieldInput label="Target Role Title" value={targetRole} onChange={e => setTargetRole(e.target.value)} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditingTarget(false)} style={{
                  fontSize: 12, fontWeight: 600, color: T.text2,
                  border: `1px solid ${T.border}`, backgroundColor: 'transparent',
                  padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                }}>Cancel</button>
                <button onClick={handleSaveTarget} style={{
                  fontSize: 12, fontWeight: 700, color: '#000', backgroundColor: T.green,
                  border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                }}>Save</button>
              </div>
            </Panel>
          ) : (
            <Panel style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ ...sL, marginBottom: 8 }}>Target Role</p>
                  <p style={{ fontSize: 20, fontWeight: 600, color: T.text0, margin: 0 }}>
                    {targetCompany || 'Not set'}{' '}
                    <span style={{ color: T.text3 }}>·</span>{' '}
                    {targetRole || '—'}
                  </p>
                  <p style={{ fontSize: 12, color: T.text3, marginTop: 6 }}>Senior Software Engineer</p>
                </div>
                <button onClick={() => setEditingTarget(true)} style={{
                  fontSize: 12, color: T.text2, backgroundColor: 'transparent',
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                }}>Edit calibration</button>
              </div>
            </Panel>
          )}
        </div>

        {/* Milestones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ ...sL }}>Milestones & Verification</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {milestones.map((m, i) => (
              <Panel key={i} style={{ padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12, borderLeft: `3px solid ${m.color}` }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', backgroundColor: T.cardHov,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontSize: 14,
                }}>
                  {i === 0 ? '🏆' : i === 1 ? '⭐' : '🎯'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: T.text0, margin: 0 }}>{m.title}</p>
                  <p style={{ fontSize: 11, color: T.text2, marginTop: 3 }}>{m.desc}</p>
                </div>
                <span style={{ fontSize: 10, color: T.text3, fontFamily: 'monospace', flexShrink: 0 }}>{m.date}</span>
              </Panel>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
