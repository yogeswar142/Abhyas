'use client';

import React, { useState } from 'react';
import { mockUser } from '@/lib/mock-data';

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

// ── Toggle ────────────────────────────────────────────────────────────────────

function ToggleRow({ label, desc, defaultOn = true }: { label: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0', borderBottom: `1px solid ${T.line}`,
    }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: T.text1, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 11, color: T.text3, marginTop: 3 }}>{desc}</p>
      </div>
      <button
        onClick={() => setOn(v => !v)}
        role="switch"
        aria-checked={on}
        style={{
          flexShrink: 0, marginLeft: 16, position: 'relative',
          width: 40, height: 22, borderRadius: 999,
          backgroundColor: on ? T.green : 'rgba(255,255,255,0.08)',
          border: on ? 'none' : `1px solid ${T.border}`,
          cursor: 'pointer', transition: 'background 0.2s ease',
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: on ? 20 : 2,
          width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff',
          transition: 'left 0.2s ease', display: 'block',
        }} />
      </button>
    </div>
  );
}

// ── Input atom ────────────────────────────────────────────────────────────────

function FieldInput({ label, type = 'text', defaultValue, placeholder }: {
  label: string; type?: string; defaultValue?: string; placeholder?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        style={{
          backgroundColor: T.cardHov, border: `1px solid ${T.border}`, borderRadius: 10,
          padding: '10px 14px', fontSize: 13, color: T.text0,
          outline: 'none', width: '100%', boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
        onFocus={e => { e.target.style.borderColor = T.green; e.target.style.boxShadow = `0 0 0 3px rgba(34,197,94,0.12)`; }}
        onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

function GreenBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      backgroundColor: T.green, color: '#000', fontWeight: 700, fontSize: 13,
      padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
    }}>
      {children}
    </button>
  );
}

function OutlineBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      backgroundColor: 'transparent', color: T.text1, fontWeight: 600, fontSize: 13,
      padding: '10px 20px', borderRadius: 10, border: `1px solid ${T.border}`, cursor: 'pointer',
    }}>
      {children}
    </button>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = ['Account', 'Notifications', 'Privacy', 'Billing'] as const;
type Tab = typeof TABS[number];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Account');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', paddingBottom: 64 }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.line}`, paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: T.green, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Control Panel
        </span>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', color: T.text0, margin: 0 }}>
          Account Settings
        </h1>
        <p style={{ fontSize: 12, color: T.text2, marginTop: 4 }}>
          Configure profile settings, active credentials, and billing plans.
        </p>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Left nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 160, flexShrink: 0 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              textAlign: 'left', fontSize: 13, fontWeight: 600, padding: '8px 12px', borderRadius: 10,
              border: 'none', cursor: 'pointer',
              backgroundColor: activeTab === tab ? T.greenGhost : 'transparent',
              color: activeTab === tab ? T.green : T.text2,
              transition: 'all 0.15s ease',
            }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Account tab */}
          {activeTab === 'Account' && (
            <>
              <Panel style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <p style={sL}>Profile Information</p>
                <FieldInput label="Full Name" defaultValue={mockUser.name} />
                <FieldInput label="Email Address" type="email" defaultValue={mockUser.email} />
                <GreenBtn>Save Profile Settings</GreenBtn>
              </Panel>

              <Panel style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <p style={sL}>Security Credentials</p>
                <FieldInput label="Current Password" type="password" placeholder="••••••••" />
                <FieldInput label="New Password" type="password" placeholder="••••••••" />
                <FieldInput label="Confirm New Password" type="password" placeholder="••••••••" />
                <OutlineBtn>Update Password</OutlineBtn>
              </Panel>

              <div style={{
                backgroundColor: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
              }}>
                <p style={{ ...sL, color: 'rgba(239,68,68,0.7)' }}>Danger Zone</p>
                <p style={{ fontSize: 12, color: T.text2, lineHeight: 1.7 }}>
                  Deleting your account will permanently purge all mock session reports,
                  voice transcripts, and evaluation score metrics.
                </p>
                <button disabled style={{
                  backgroundColor: 'rgba(239,68,68,0.1)', color: 'rgba(239,68,68,0.5)',
                  fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 10,
                  border: '1px solid rgba(239,68,68,0.2)', cursor: 'not-allowed', width: 'fit-content',
                }}>
                  Delete Account Data
                </button>
              </div>
            </>
          )}

          {/* Notifications tab */}
          {activeTab === 'Notifications' && (
            <Panel style={{ padding: '0 24px' }}>
              <p style={{ ...sL, padding: '20px 0 4px' }}>Notification Preferences</p>
              <ToggleRow label="Session reminders" desc="Get notified 30 mins before a scheduled simulation" defaultOn />
              <ToggleRow label="Score alerts" desc="Notify me when a new evaluation report is ready" defaultOn />
              <ToggleRow label="Weekly digest" desc="Summary of your progress every Monday" defaultOn={false} />
              <ToggleRow label="Marketing emails" desc="Product updates, tips, and announcements" defaultOn={false} />
              <div style={{ height: 8 }} />
            </Panel>
          )}

          {/* Privacy tab */}
          {activeTab === 'Privacy' && (
            <Panel style={{ padding: '0 24px' }}>
              <p style={{ ...sL, padding: '20px 0 4px' }}>Privacy Controls</p>
              <ToggleRow label="Voice transcript storage" desc="Store transcripts for post-session review" defaultOn />
              <ToggleRow label="Analytics participation" desc="Help improve Abhyas with anonymous usage data" defaultOn />
              <ToggleRow label="Public profile" desc="Allow others to view your milestone board" defaultOn={false} />
              <div style={{ height: 8 }} />
            </Panel>
          )}

          {/* Billing tab */}
          {activeTab === 'Billing' && (
            <Panel style={{ padding: 24, position: 'relative', overflow: 'hidden', border: `1px solid rgba(34,197,94,0.2)` }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, backgroundColor: 'rgba(34,197,94,0.05)', filter: 'blur(60px)', borderRadius: '50%', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ ...sL }}>Billing Level</span>
                    <h3 style={{ fontSize: 28, fontWeight: 900, color: T.text0, margin: '6px 0 0', textTransform: 'capitalize' }}>
                      {mockUser.plan} Plan
                    </h3>
                  </div>
                  <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.green, backgroundColor: T.greenGhost, padding: '4px 10px', borderRadius: 999 }}>
                    Active
                  </span>
                </div>
                <p style={{ fontSize: 12, color: T.text2, lineHeight: 1.7 }}>
                  Unlimited voice simulations, custom Job Description calibration,
                  and advanced evaluation criteria breakdown reports.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <GreenBtn>Manage Subscription</GreenBtn>
                  <OutlineBtn>View Invoices</OutlineBtn>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
