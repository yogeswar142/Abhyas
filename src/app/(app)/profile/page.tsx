'use client';

import React, { useState, useEffect } from 'react';
import { mockUser, mockStats } from '@/lib/mock-data';
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton';

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

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetCompany, setTargetCompany] = useState(mockUser.targetCompany || '');
  const [targetRole, setTargetRole] = useState(mockUser.targetRole || '');

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <ProfileSkeleton />;

  const statsGrid = [
    { value: '42', label: 'Mock sessions completed', accent: false, size: '3.2rem' },
    { value: `${mockStats.avgScore}/100`, label: 'Average score', accent: false, size: '2.2rem' },
    { value: '95/100', label: 'Personal best', accent: true, size: '2.6rem' },
    { value: `${mockStats.totalHours}h`, label: 'Total practice time', accent: false, size: '2.2rem' },
  ];

  const milestones = [
    { title: '10 Voice Sessions Completed', desc: 'Consistent mock practice streak maintained.', date: '2 days ago', color: T.green },
    { title: '90+ Score Rating Achieved', desc: 'Top tier evaluation rating in STAR behavioral mock.', date: '1 week ago', color: '#f59e0b' },
    { title: 'Target Goals Calibrated', desc: 'Successfully set requirements for Google SWE role.', date: '2 weeks ago', color: T.text2 },
  ];

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
          {mockUser.name.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: T.text0, margin: 0, lineHeight: 1 }}>
            {mockUser.name}
          </h2>
          <span style={{
            display: 'inline-block', marginTop: 6,
            backgroundColor: T.greenGhost, color: T.green,
            fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600,
            padding: '3px 8px', borderRadius: 999,
          }}>Pro Calibrated</span>
          <p style={{ fontSize: 12, color: T.text3, marginTop: 6 }}>
            {mockUser.email} · Joined Oct 2023
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
                <button onClick={() => setEditingTarget(false)} style={{
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
