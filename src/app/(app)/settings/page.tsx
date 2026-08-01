'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { mockUser } from '@/lib/mock-data';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account');

  return (
    <div className="space-y-10 pb-16">
      {/* Editorial Header */}
      <div className="border-b border-[var(--border)]/40 pb-6 space-y-1.5">
        <span className="text-[10px] font-mono tracking-widest text-[var(--accent)] uppercase font-bold">
          Control Panel
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-0)]">Account Settings</h1>
        <p className="text-xs sm:text-sm text-[var(--text-2)] mt-1 max-w-xl">Configure profile settings, active credentials, and billing plans.</p>
      </div>

      {/* Control Deck Flex Stage */}
      <div className="flex flex-col lg:flex-row gap-10 items-start">
        
        {/* Left Settings Sidebar Tabs (25%) */}
        <div className="w-full lg:w-48 flex lg:flex-col gap-1.5 shrink-0 overflow-x-auto pb-2 lg:pb-0">
          {['Account', 'Notifications', 'Privacy', 'Billing'].map(tab => {
            const isTabActive = activeTab === tab.toLowerCase();
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`flex items-center text-xs font-mono font-bold px-3 py-2 rounded-xl transition-all duration-200 border border-transparent shrink-0 ${
                  isTabActive
                    ? 'bg-[var(--surface-hv)] text-[var(--accent)] border-[var(--border)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-2)] hover:text-[var(--text-0)]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Right Settings Form Stage (75%) */}
        <div className="flex-1 w-full space-y-8">
          
          {/* Account Profile Forms */}
          {activeTab === 'account' && (
            <div className="space-y-8 max-w-2xl">
              <section className="space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--text-1)]">Profile Information</h3>
                <Card spotlight padding="lg" className="space-y-4 bg-[var(--bg-1)] border border-[var(--border)]">
                  <Input label="Full Name" defaultValue={mockUser.name} />
                  <Input label="Email Address" defaultValue={mockUser.email} type="email" />
                  <div className="pt-2">
                    <Button variant="primary" size="sm" className="text-xs font-bold shadow-[0_0_15px_-3px_rgba(34,197,94,0.4)]">
                      Save Profile Settings
                    </Button>
                  </div>
                </Card>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--text-1)]">Security Credentials</h3>
                <Card spotlight padding="lg" className="space-y-4 bg-[var(--bg-1)] border border-[var(--border)]">
                  <Input label="Current Password" type="password" placeholder="••••••••" />
                  <Input label="New Password" type="password" placeholder="••••••••" />
                  <Input label="Confirm New Password" type="password" placeholder="••••••••" />
                  <div className="pt-2">
                    <Button variant="outline" size="sm" className="text-xs font-semibold">
                      Update Password
                    </Button>
                  </div>
                </Card>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-red-400">Danger Zone</h3>
                <Card spotlight padding="lg" className="border-red-500/20 bg-red-500/[0.02]">
                  <p className="text-xs text-[var(--text-2)] mb-4 leading-relaxed">
                    Deleting your user account will permanently purge all mock session reports, recorded voice transcripts, and evaluation score index metrics.
                  </p>
                  <Button variant="destructive" size="sm" disabled className="text-xs font-semibold">
                    Delete Account Data
                  </Button>
                </Card>
              </section>
            </div>
          )}

          {/* Billing subscription card */}
          {activeTab === 'billing' && (
            <section className="space-y-4 max-w-2xl">
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--text-1)]">Subscription Status</h3>
              <Card variant="pro" spotlight padding="lg" className="relative overflow-hidden group">
                <div className="absolute top-6 right-6">
                  <Badge variant="accent" className="font-mono text-[9px] uppercase tracking-wider">Pro Active</Badge>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-2)]">Billing Level</span>
                  <h3 className="text-2xl font-extrabold text-[var(--text-0)] capitalize">{mockUser.plan} Plan</h3>
                </div>

                <p className="text-xs text-[var(--text-2)] mt-4 leading-relaxed">
                  You have full access to unlimited voice simulations, custom Job Description calibration, and advanced evaluation criteria breakdown reports.
                </p>

                <div className="mt-6 flex items-center gap-3">
                  <Button variant="primary" size="sm" className="text-xs font-bold shadow-[0_0_20px_-3px_rgba(34,197,94,0.4)]">
                    Manage Subscription
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs font-semibold">
                    View Invoice History
                  </Button>
                </div>
              </Card>
            </section>
          )}

          {/* Notifications and Privacy Placeholders */}
          {(activeTab === 'notifications' || activeTab === 'privacy') && (
            <Card spotlight padding="lg" className="text-center max-w-2xl py-16 bg-[var(--bg-1)] border border-[var(--border)]">
              <p className="text-xs text-[var(--text-2)] font-mono">Notification settings are synced with global soundstage alerts.</p>
            </Card>
          )}

        </div>

      </div>
    </div>
  );
}
