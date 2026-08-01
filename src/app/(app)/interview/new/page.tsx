'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { INTERVIEW_TYPES, SESSION_DURATIONS } from '@/lib/constants';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  behavioral: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  'system-design': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
      <line x1="6" y1="6" x2="6.01" y2="6"></line>
      <line x1="6" y1="18" x2="6.01" y2="18"></line>
    </svg>
  ),
  technical: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  ),
  product: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    </svg>
  ),
  custom: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
    </svg>
  )
};

const MicTester = () => {
  const [vol, setVol] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVol(Math.floor(Math.random() * 6) + 1);
    }, 250);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-xl px-4 py-2">
      <div className="flex items-center gap-1 h-3 shrink-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <span 
            key={i} 
            className="w-1 rounded-full transition-all duration-150"
            style={{ 
              height: `${(i + 1) * 2}px`, 
              backgroundColor: i < vol ? 'var(--accent)' : 'var(--text-3)' 
            }}
          />
        ))}
      </div>
      <span className="text-[10px] font-mono text-[var(--text-2)] uppercase font-semibold">Mic Level Check</span>
    </div>
  );
};

export default function NewInterviewPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string>('behavioral');
  const [company, setCompany] = useState('Google');
  const [role, setRole] = useState('Senior Software Engineer');
  const [difficulty, setDifficulty] = useState('medium');
  const [duration, setDuration] = useState('45');

  const handleStart = () => {
    router.push('/interview/new_session_123');
  };

  return (
    <div className="space-y-12 pb-24">
      {/* Editorial Header */}
      <div className="border-b border-[var(--border)]/40 pb-6 space-y-1.5">
        <span className="text-[10px] font-mono tracking-widest text-[var(--accent)] uppercase font-bold">
          Calibrator Module
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-0)]">
          Configure Interview Simulator
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-2)] max-w-2xl leading-relaxed">
          Calibrate the AI persona for target company standards, custom role titles, and specific interview depth.
        </p>
      </div>

      {/* Step 1: Select Interview Domain */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-[var(--accent)] bg-[var(--accent-dim)] border border-[rgba(34,197,94,0.2)] px-2.5 py-1 rounded-lg">
            STEP 01
          </span>
          <h2 className="text-base font-bold text-[var(--text-0)] tracking-tight">Select Interview Domain</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {INTERVIEW_TYPES.map(type => {
            const isSelected = selectedType === type.id;
            return (
              <Card 
                key={type.id} 
                spotlight
                padding="lg" 
                hoverable 
                className={`cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                  isSelected 
                    ? 'border-[var(--accent)] bg-[var(--accent-dim)] shadow-[0_0_40px_-5px_rgba(34,197,94,0.15)]' 
                    : 'border-[var(--border)] bg-[var(--bg-1)] hover:border-[var(--border-hv)]'
                }`}
                onClick={() => setSelectedType(type.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl transition-all duration-200 ${isSelected ? 'bg-[var(--accent)] text-white shadow-md' : 'bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-2)] group-hover:text-[var(--accent)]'}`}>
                    {TYPE_ICONS[type.id] || TYPE_ICONS.custom}
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                  )}
                </div>
                <h3 className="font-bold text-sm text-[var(--text-0)] mb-1 group-hover:text-[var(--accent)] transition-colors">{type.label}</h3>
                <p className="text-xs text-[var(--text-2)] leading-relaxed">{type.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Step 2: Parameter Sliders */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-[var(--text-1)] bg-[var(--bg-2)] border border-[var(--border)] px-2.5 py-1 rounded-lg">
            STEP 02
          </span>
          <h2 className="text-base font-bold text-[var(--text-0)] tracking-tight">Role & Experience Calibration</h2>
        </div>

        <Card spotlight padding="lg" className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[var(--bg-1)] border border-[var(--border)]">
          <Input 
            label="Target Company" 
            placeholder="e.g. Google, Meta, Stripe" 
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <Input 
            label="Target Role Title" 
            placeholder="e.g. Senior Software Engineer" 
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <Select 
            label="Difficulty Seniority"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            options={[
              { value: 'easy', label: 'Entry Level (L3 / Junior SDE)' },
              { value: 'medium', label: 'Mid-Level (L4 / SDE II)' },
              { value: 'hard', label: 'Senior / Staff (L5+ Architect)' }
            ]}
          />
          <Select 
            label="Interactive Session Duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            options={SESSION_DURATIONS.map(d => ({ value: d.toString(), label: `${d} Minutes (Voice Interactive)` }))}
          />
        </Card>
      </section>

      {/* Bottom Action Soundstage Launcher */}
      <Card variant="pro" spotlight className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-[var(--accent)]/5 blur-[50px] pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <p className="text-xs sm:text-sm text-[var(--text-1)]">
            Configured for <strong className="text-[var(--text-0)] font-semibold">{role}</strong> at <strong className="text-[var(--text-0)] font-semibold">{company}</strong>.
          </p>
          <p className="text-[10px] text-[var(--text-2)] font-mono">
            Standard simulation evaluation rubrics active • Voice socket calibration calibrated.
          </p>
        </div>
        <div className="flex items-center gap-4 relative z-10 shrink-0">
          <MicTester />
          <Button size="lg" variant="primary" onClick={handleStart} className="h-11 px-8 font-bold text-xs shadow-[0_0_35px_-5px_rgba(34,197,94,0.4)]">
            Start Simulation →
          </Button>
        </div>
      </Card>
    </div>
  );
}
