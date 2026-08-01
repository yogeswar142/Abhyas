'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { mockUser, mockStats } from '@/lib/mock-data';

const ACHIEVEMENT_ICONS = {
  trophy: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
      <path d="M4 22h16"></path>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
    </svg>
  ),
  star: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  ),
  target: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="6"></circle>
      <circle cx="12" cy="12" r="2"></circle>
    </svg>
  )
};

export default function ProfilePage() {
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetCompany, setTargetCompany] = useState(mockUser.targetCompany || '');
  const [targetRole, setTargetRole] = useState(mockUser.targetRole || '');

  return (
    <div className="space-y-10 pb-16">
      {/* Editorial Header */}
      <div className="border-b border-[var(--border)]/40 pb-6 space-y-1.5">
        <span className="text-[10px] font-mono tracking-widest text-[var(--accent)] uppercase font-bold">
          Prestige Board
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-0)]">
          Candidate Profile
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-2)] max-w-xl">
          Verifiable milestones, readiness index, and role target calibrations.
        </p>
      </div>

      {/* Signature Profile Banner Card (Hero Moment) */}
      <Card variant="pro" spotlight padding="lg" className="relative overflow-hidden group">
        {/* Background glow radial */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-[var(--accent)]/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar name={mockUser.name} size="xl" className="ring-4 ring-[var(--accent)]/20 shadow-2xl transition-transform duration-300 hover:scale-105" />
            <div className="text-center md:text-left space-y-2">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-0)]">{mockUser.name}</h2>
                <Badge variant="accent" className="font-mono text-[9px] uppercase tracking-wider font-bold">Pro Calibrated</Badge>
              </div>
              <p className="text-xs text-[var(--text-2)] font-mono">{mockUser.email} • Joined Oct 2023</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 text-xs font-semibold h-9 px-5">
            Edit Account Profile
          </Button>
        </div>
      </Card>

      {/* Stats KPI Board */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Completed Mock Sessions', value: '42' },
          { label: 'Avg Overall Score', value: `${mockStats.avgScore}/100` },
          { label: 'Personal Best Mock', value: '95/100' },
          { label: 'Total Hours Practiced', value: '24.5h' }
        ].map((stat, i) => (
          <Card key={i} spotlight variant="interactive" padding="md" className="flex flex-col justify-between min-h-[110px]">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--text-2)]">{stat.label}</span>
            <p className="text-3xl font-extrabold font-mono text-[var(--text-0)] mt-2">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Calibrator Goals & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Target Goals Card */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-mono uppercase tracking-wider font-bold text-[var(--text-1)]">Calibrate Target Goals</h2>
            <Button variant="ghost" size="sm" className="text-xs text-[var(--accent)] font-semibold" onClick={() => setIsEditingTarget(!isEditingTarget)}>
              {isEditingTarget ? 'Cancel' : 'Edit Calibration'}
            </Button>
          </div>

          <Card spotlight padding="md" className="space-y-4 bg-[var(--bg-1)] border border-[var(--border)]">
            {isEditingTarget ? (
              <div className="space-y-4">
                <Input 
                  label="Target Company" 
                  value={targetCompany}
                  onChange={e => setTargetCompany(e.target.value)}
                />
                <Input 
                  label="Target Role Title" 
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                />
                <div className="flex justify-end pt-2">
                  <Button variant="primary" size="sm" onClick={() => setIsEditingTarget(false)}>
                    Save Target Calibration
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl bg-[var(--bg-2)] border border-[var(--border)]/40 hover:border-[var(--accent)]/15 transition-all duration-300">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-2)] font-semibold mb-1">Company Target</p>
                  <p className="text-lg font-bold text-[var(--text-0)]">{targetCompany || 'Not set'}</p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-2)] border border-[var(--border)]/40 hover:border-[var(--accent)]/15 transition-all duration-300">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-2)] font-semibold mb-1">Role & Seniority Target</p>
                  <p className="text-lg font-bold text-[var(--text-0)]">{targetRole || 'Not set'}</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Milestone Verification Timeline */}
        <div className="space-y-4">
          <h2 className="text-[11px] font-mono uppercase tracking-wider font-bold text-[var(--text-1)]">Milestones & Verification</h2>
          
          <Card spotlight padding="md" className="space-y-3 bg-[var(--bg-1)] border border-[var(--border)]">
            {[
              { title: '10 Voice Sessions Completed', desc: 'Consistent mock practice streak maintained.', date: '2 days ago', iconKey: 'trophy' },
              { title: '90+ Score Rating Achieved', desc: 'Top tier evaluation rating in STAR behavioral mock.', date: '1 week ago', iconKey: 'star' },
              { title: 'Target Goals Calibrated', desc: 'Successfully set requirements for Google SWE role.', date: '2 weeks ago', iconKey: 'target' }
            ].map((ach, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-xl bg-[var(--bg-2)] border border-[var(--border)]/40 hover:border-[var(--border-hv)] transition-all duration-300 items-center">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  {ACHIEVEMENT_ICONS[ach.iconKey as keyof typeof ACHIEVEMENT_ICONS]}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-[var(--text-0)] truncate">{ach.title}</h4>
                  <p className="text-[11px] text-[var(--text-2)] mt-0.5 leading-tight">{ach.desc}</p>
                </div>
                <span className="text-[10px] text-[var(--text-2)] font-mono shrink-0">{ach.date}</span>
              </div>
            ))}
          </Card>
        </div>

      </div>
    </div>
  );
}
