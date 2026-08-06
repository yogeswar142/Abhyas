'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { INTERVIEW_TYPES, SESSION_DURATIONS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

const T = {
  card: 'var(--v-card)', cardHov: 'var(--v-raised)', border: 'var(--v-border)',
  line: 'var(--v-line)', green: 'var(--v-accent)', greenGhost: 'var(--v-accent-ghost)',
  text0: 'var(--v-tx0)', text1: 'var(--v-tx1)', text2: 'var(--v-tx2)', text3: 'var(--v-tx3)',
  hover: 'var(--v-hover)',
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

function FieldInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</label>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
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

function FieldSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</label>
      <select
        value={value}
        onChange={onChange}
        style={{
          backgroundColor: T.cardHov, border: `1px solid ${T.border}`, borderRadius: 10,
          padding: '10px 14px', fontSize: 13, color: T.text0, outline: 'none',
          width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 14px center',
          paddingRight: 36,
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Mic level ─────────────────────────────────────────────────────────────────

function MicLevel() {
  const [vol, setVol] = useState(3);
  useEffect(() => {
    const id = setInterval(() => setVol(Math.floor(Math.random() * 6) + 1), 220);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      backgroundColor: T.cardHov, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: '8px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} style={{
            width: 3, height: `${(i + 1) * 2}px`, borderRadius: 2,
            transition: 'background 0.1s ease',
            backgroundColor: i < vol ? T.green : 'rgba(255,255,255,0.1)',
            display: 'block',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 10, fontFamily: 'monospace', color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Mic verified at session start
      </span>
    </div>
  );
}

// ── Type icons ────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ReactNode> = {
  behavioral: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  'system-design': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),
  technical: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  product: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  custom: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewInterviewPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [selectedType, setSelectedType] = useState('behavioral');
  const [company, setCompany] = useState('Google');
  const [role, setRole] = useState('Senior Software Engineer');
  const [difficulty, setDifficulty] = useState('medium');
  const [duration, setDuration] = useState('45');
  const [jobDescription, setJobDescription] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  // Calibrate to user's targeted company & role once profile resolves
  useEffect(() => {
    if (profile?.target_company) setCompany(profile.target_company);
    if (profile?.target_role) setRole(profile.target_role);
  }, [profile]);

  const handleStart = async () => {
    if (!user) {
      alert('You must be signed in to start an interview simulation.');
      return;
    }
    if (!company.trim() || !role.trim()) {
      alert('Please provide a target company and role.');
      return;
    }

    setIsStarting(true);
    try {
      const durationNum = parseInt(duration, 10);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: selectedType,
          company: company.trim(),
          role: role.trim(),
          difficulty: difficulty,
          duration: durationNum,
          jobDescription: jobDescription.trim() || undefined,
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error('Error starting session:', errData.error);
        alert(`Failed to start session: ${errData.error || res.statusText}`);
        setIsStarting(false);
      } else {
        const data = await res.json();
        router.push(`/interview/${data.id}`);
      }
    } catch (err) {
      console.error('Failed to create interview:', err);
      setIsStarting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%', paddingBottom: 64 }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.line}`, paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: T.green, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Calibrator Module
        </span>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', color: T.text0, margin: 0 }}>
          New Interview Session
        </h1>
        <p style={{ fontSize: 12, color: T.text2, marginTop: 4, lineHeight: 1.6 }}>
          Calibrate the AI persona for target company standards, custom role titles, and interview depth.
        </p>
      </div>

      {/* Step 1 — Domain */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: T.green,
            backgroundColor: T.greenGhost, padding: '4px 10px', borderRadius: 8, letterSpacing: '0.12em',
          }}>STEP 01</span>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: T.text0, margin: 0 }}>Select Interview Domain</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {INTERVIEW_TYPES.map(type => {
            const sel = selectedType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                style={{
                  textAlign: 'left', padding: 18, borderRadius: 14,
                  border: sel ? '1px solid rgba(34,197,94,0.4)' : `1px solid ${T.border}`,
                  backgroundColor: sel ? T.greenGhost : T.card,
                  cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative',
                  boxShadow: sel ? '0 0 24px -6px rgba(34,197,94,0.2)' : 'none',
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.backgroundColor = T.hover; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.backgroundColor = T.card; }}
              >
                {sel && <span style={{ position: 'absolute', top: 12, right: 12, width: 7, height: 7, borderRadius: '50%', backgroundColor: T.green, boxShadow: `0 0 8px ${T.green}` }} />}
                <div style={{
                  width: 38, height: 38, borderRadius: 10, marginBottom: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: sel ? T.green : T.hover,
                  border: sel ? 'none' : `1px solid ${T.border}`,
                  color: sel ? '#000' : T.text2,
                }}>
                  {TYPE_ICONS[type.id] ?? TYPE_ICONS.custom}
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: sel ? T.text0 : T.text1, margin: '0 0 6px' }}>
                  {type.label}
                </h3>
                <p style={{ fontSize: 11, color: T.text3, lineHeight: 1.5, margin: 0 }}>{type.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2 — Role calibration */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: T.text3,
            backgroundColor: T.cardHov, border: `1px solid ${T.border}`,
            padding: '4px 10px', borderRadius: 8, letterSpacing: '0.12em',
          }}>STEP 02</span>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: T.text0, margin: 0 }}>Role & Experience Calibration</h2>
        </div>

        <Panel style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <FieldInput label="Target Company" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google, Meta, Stripe" />
            <FieldInput label="Target Role Title" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Senior Software Engineer" />
            <FieldSelect
              label="Difficulty / Seniority"
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              options={[
                { value: 'easy', label: 'Entry Level (L3 / Junior SDE)' },
                { value: 'medium', label: 'Mid-Level (L4 / SDE II)' },
                { value: 'hard', label: 'Senior / Staff (L5+)' },
              ]}
            />
            <FieldSelect
              label="Session Duration"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              options={SESSION_DURATIONS.map(d => ({ value: d.toString(), label: `${d} minutes — voice interactive` }))}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Job Description / Target Requirements (Optional)
            </label>
            <textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the job description or specific key requirements here to calibrate interviewer questions..."
              rows={3}
              style={{
                backgroundColor: T.cardHov, border: `1px solid ${T.border}`, borderRadius: 10,
                padding: '10px 14px', fontSize: 13, color: T.text0, outline: 'none',
                width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical',
                lineHeight: 1.5,
              }}
              onFocus={e => { e.target.style.borderColor = T.green; e.target.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
              onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </Panel>
      </section>

      {/* Launch bar */}
      <Panel style={{ padding: 24, position: 'relative', overflow: 'hidden', border: '1px solid rgba(34,197,94,0.2)' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 220, height: 220, backgroundColor: 'rgba(34,197,94,0.05)', filter: 'blur(70px)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 14, color: T.text1, margin: 0 }}>
              Configured for{' '}
              <strong style={{ color: T.text0 }}>{role}</strong>
              {' '}at{' '}
              <strong style={{ color: T.text0 }}>{company}</strong>
            </p>
            <p style={{ fontSize: 10, color: T.text3, fontFamily: 'monospace', marginTop: 4 }}>
              Standard evaluation rubrics active · Voice socket calibrated
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <MicLevel />
            <button
              onClick={handleStart}
              disabled={isStarting}
              style={{
                backgroundColor: T.green, color: '#000', fontWeight: 700, fontSize: 14,
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                boxShadow: '0 0 40px -6px rgba(34,197,94,0.55)',
                opacity: isStarting ? 0.7 : 1, minWidth: 160,
                display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
              }}
            >
              {isStarting ? 'Launching…' : 'Start Simulation →'}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
