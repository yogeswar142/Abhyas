'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import type { OrbProps, OrbState } from './types';

// ─── Simplex-like noise via smooth hash (no deps) ────────────────────────────
function hash(n: number): number {
  n = Math.sin(n) * 43758.5453123;
  return n - Math.floor(n);
}
function noise2(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix + iy * 57);
  const b = hash(ix + 1 + iy * 57);
  const c = hash(ix + (iy + 1) * 57);
  const d = hash(ix + 1 + (iy + 1) * 57);
  return a + (b - a) * ux + (c - a) * uy + (d - a + a - b - c + b) * ux * uy;
}
function fbm(x: number, y: number, octaves: number): number {
  let v = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += noise2(x * freq, y * freq) * amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return v;
}

// ─── State parameter targets ──────────────────────────────────────────────────
interface Params {
  noiseScale: number;      // spatial freq of displacement
  noiseSpeed: number;      // time speed of noise
  octaves: number;         // detail level
  displacement: number;    // max px distortion on the rim
  particleCount: number;   // orbiting dots
  particleSpeed: number;   // how fast they orbit
  tendrilOpacity: number;  // outer filament alpha
  innerGlow: number;       // core brightness 0-1
  audioScale: number;      // audio amplitude multiplier
  breathe: boolean;        // subtle scale oscillation
}

const STATE_PARAMS: Record<OrbState, Params> = {
  idle: {
    noiseScale: 1.8, noiseSpeed: 0.18, octaves: 3,
    displacement: 10, particleCount: 28, particleSpeed: 0.25,
    tendrilOpacity: 0.12, innerGlow: 0.25, audioScale: 0, breathe: true,
  },
  listening: {
    noiseScale: 2.2, noiseSpeed: 0.35, octaves: 3,
    displacement: 18, particleCount: 45, particleSpeed: 0.45,
    tendrilOpacity: 0.3, innerGlow: 0.45, audioScale: 0.8, breathe: false,
  },
  thinking: {
    noiseScale: 3.0, noiseSpeed: 0.75, octaves: 4,
    displacement: 22, particleCount: 65, particleSpeed: 0.85,
    tendrilOpacity: 0.25, innerGlow: 0.55, audioScale: 0.1, breathe: false,
  },
  speaking: {
    noiseScale: 2.4, noiseSpeed: 0.55, octaves: 3,
    displacement: 26, particleCount: 55, particleSpeed: 0.6,
    tendrilOpacity: 0.35, innerGlow: 0.7, audioScale: 0.9, breathe: false,
  },
  finished: {
    noiseScale: 1.4, noiseSpeed: 0.1, octaves: 2,
    displacement: 6, particleCount: 18, particleSpeed: 0.12,
    tendrilOpacity: 0.06, innerGlow: 0.15, audioScale: 0, breathe: true,
  },
};

// ─── Per-particle stable data ─────────────────────────────────────────────────
interface Particle {
  angle: number;
  orbitRadius: number;
  speed: number;
  size: number;
  phase: number;
  layer: number; // 0 = close, 1 = mid, 2 = far
}

function makeParticles(n: number): Particle[] {
  return Array.from({ length: n }, (_, i) => ({
    angle: (i / n) * Math.PI * 2 + Math.random() * 0.4,
    orbitRadius: 0.62 + Math.random() * 0.32,
    speed: (0.5 + Math.random() * 0.8) * (Math.random() < 0.5 ? 1 : -1),
    size: 0.8 + Math.random() * 1.8,
    phase: Math.random() * Math.PI * 2,
    layer: Math.floor(Math.random() * 3),
  }));
}

// ─── lerp helper ─────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ─── Main component ───────────────────────────────────────────────────────────
export function InterviewOrb({
  state = 'idle',
  audioLevel = 0,
  active = true,
  height = 220,
}: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>(makeParticles(80));

  // Smoothly interpolated live params
  const liveRef = useRef<Params>({ ...STATE_PARAMS.idle });
  const smoothAudioRef = useRef(0);
  const stateRef = useRef<OrbState>(state);
  const audioRef = useRef(audioLevel);

  // Keep refs in sync with props without restarting the loop
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { audioRef.current = audioLevel; }, [audioLevel]);

  const draw = useCallback((t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const baseR = Math.min(W, H) * 0.28; // core radius

    const target = STATE_PARAMS[stateRef.current];
    const SLOW = 0.025, FAST = 0.08;

    // Lerp live params toward target
    const lp = liveRef.current;
    lp.noiseScale  = lerp(lp.noiseScale,  target.noiseScale,  SLOW);
    lp.noiseSpeed  = lerp(lp.noiseSpeed,  target.noiseSpeed,  SLOW);
    lp.octaves     = lerp(lp.octaves,     target.octaves,     SLOW);
    lp.displacement= lerp(lp.displacement,target.displacement, SLOW);
    lp.particleSpeed= lerp(lp.particleSpeed,target.particleSpeed, SLOW);
    lp.tendrilOpacity= lerp(lp.tendrilOpacity,target.tendrilOpacity, SLOW);
    lp.innerGlow   = lerp(lp.innerGlow,   target.innerGlow,   SLOW);
    lp.audioScale  = lerp(lp.audioScale,  target.audioScale,  FAST);
    lp.particleCount= lerp(lp.particleCount,target.particleCount, SLOW);

    // Smooth audio
    smoothAudioRef.current = lerp(smoothAudioRef.current, audioRef.current, 0.12);
    const audio = smoothAudioRef.current;

    // Breathing oscillation (idle / finished)
    const breathScale = (target.breathe)
      ? 1 + Math.sin(t * 1.4) * 0.025
      : 1 + audio * lp.audioScale * 0.18;

    const R = baseR * breathScale;

    // ── Clear ──────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, W, H);

    // ── 1. Outer haze ring (depth atmosphere) ──────────────────────────────
    const hazeR = R * 1.85;
    const hazeG = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, hazeR);
    hazeG.addColorStop(0, `rgba(34,197,94,${lp.innerGlow * 0.12})`);
    hazeG.addColorStop(0.6, `rgba(16,185,129,${lp.innerGlow * 0.04})`);
    hazeG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, hazeR, 0, Math.PI * 2);
    ctx.fillStyle = hazeG;
    ctx.fill();

    // ── 2. Tendrils (noise-distorted radial lines) ─────────────────────────
    const TENDRIL_N = 18;
    for (let i = 0; i < TENDRIL_N; i++) {
      const baseAngle = (i / TENDRIL_N) * Math.PI * 2;
      const nVal = fbm(
        Math.cos(baseAngle) * lp.noiseScale + t * lp.noiseSpeed * 0.5,
        Math.sin(baseAngle) * lp.noiseScale + t * lp.noiseSpeed * 0.3,
        Math.round(lp.octaves)
      );
      const angleJitter = (nVal - 0.5) * 0.6;
      const ang = baseAngle + angleJitter;
      const reach = R * (1.1 + nVal * 0.55 * (lp.tendrilOpacity + audio * lp.audioScale * 0.4));

      const x0 = cx + Math.cos(ang) * R * 0.95;
      const y0 = cy + Math.sin(ang) * R * 0.95;
      const x1 = cx + Math.cos(ang) * reach;
      const y1 = cy + Math.sin(ang) * reach;

      const tGrad = ctx.createLinearGradient(x0, y0, x1, y1);
      tGrad.addColorStop(0, `rgba(52,211,153,${lp.tendrilOpacity * 0.85})`);
      tGrad.addColorStop(1, 'rgba(34,197,94,0)');
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = tGrad;
      ctx.lineWidth = 0.7 + nVal * 0.9;
      ctx.stroke();
    }

    // ── 3. Displaced orb silhouette ────────────────────────────────────────
    const SEGMENTS = 128;
    ctx.beginPath();
    for (let i = 0; i <= SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2;
      const nx = Math.cos(angle) * lp.noiseScale + t * lp.noiseSpeed;
      const ny = Math.sin(angle) * lp.noiseScale + t * lp.noiseSpeed * 0.7;
      const n = fbm(nx, ny, Math.round(lp.octaves));
      const disp = (n - 0.5) * lp.displacement * (1 + audio * lp.audioScale);
      const r = R + disp;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Core fill — emerald-obsidian radial gradient
    const coreGrad = ctx.createRadialGradient(cx, cy * 0.9, 0, cx, cy, R * 1.05);
    const glow = lp.innerGlow;
    coreGrad.addColorStop(0,   `rgba(${15 + glow*35},${45 + glow*60},${30 + glow*45},1)`);
    coreGrad.addColorStop(0.45,`rgba(${10 + glow*20},${28 + glow*32},${20 + glow*25},1)`);
    coreGrad.addColorStop(0.8, `rgba(${8 + glow*12},${18 + glow*18},${14 + glow*14},1)`);
    coreGrad.addColorStop(1,   `rgba(6,12,10,0.96)`);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // Fresnel rim — emerald/mint edge
    ctx.save();
    ctx.clip(); // clip to orb shape
    const rimGrad = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 1.08);
    rimGrad.addColorStop(0,   'rgba(0,0,0,0)');
    rimGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
    rimGrad.addColorStop(0.88,`rgba(52,211,153,${0.12 + glow * 0.20})`);
    rimGrad.addColorStop(1,   `rgba(110,231,183,${0.35 + glow * 0.30})`);
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.restore();

    // Orb outline stroke
    ctx.beginPath();
    for (let i = 0; i <= SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2;
      const nx = Math.cos(angle) * lp.noiseScale + t * lp.noiseSpeed;
      const ny = Math.sin(angle) * lp.noiseScale + t * lp.noiseSpeed * 0.7;
      const n = fbm(nx, ny, Math.round(lp.octaves));
      const disp = (n - 0.5) * lp.displacement * (1 + audio * lp.audioScale);
      const r = R + disp;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(52,211,153,${0.18 + glow * 0.25})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // ── 4. Internal structure (moving noise layer inside orb) ─────────────
    const visibleCount = Math.round(lp.particleCount);
    const allParticles = particlesRef.current;
    while (allParticles.length < 80) {
      allParticles.push(...makeParticles(10));
    }

    for (let i = 0; i < Math.min(visibleCount, allParticles.length); i++) {
      const p = allParticles[i];
      const orbitR = R * p.orbitRadius;
      const speed = p.speed * lp.particleSpeed * (1 + audio * 0.4);
      p.angle += speed * 0.016;

      const px = cx + Math.cos(p.angle) * orbitR;
      const py = cy + Math.sin(p.angle) * orbitR;

      const layerAlpha = [0.45, 0.28, 0.16][p.layer] ?? 0.25;
      const pulse = 0.7 + 0.3 * Math.sin(t * 2.2 + p.phase);
      const alpha = layerAlpha * pulse * (0.5 + lp.innerGlow * 0.8);

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(167,243,208,${alpha})`;
      ctx.fill();
    }

    // ── 5. Thinking state: internal node flashes ──────────────────────────
    if (stateRef.current === 'thinking' || lp.noiseSpeed > 0.5) {
      const flashCount = 5;
      for (let i = 0; i < flashCount; i++) {
        const angle = (i / flashCount) * Math.PI * 2 + t * 0.8;
        const nr = R * (0.25 + hash(i * 7.3 + Math.floor(t * 0.5)) * 0.45);
        const fx = cx + Math.cos(angle) * nr;
        const fy = cy + Math.sin(angle) * nr;
        const intensity = Math.max(0, Math.sin(t * 3 + i * 1.4)) * lp.innerGlow;

        const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, R * 0.14);
        fg.addColorStop(0, `rgba(52,211,153,${intensity * 0.65})`);
        fg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(fx, fy, R * 0.14, 0, Math.PI * 2);
        ctx.fillStyle = fg;
        ctx.fill();
      }
    }

    // ── 6. Speaking / Listening: audio ripple rings ────────────────────────
    if (audio > 0.04 && lp.audioScale > 0.3) {
      const rings = 3;
      for (let r = 0; r < rings; r++) {
        const phase = ((t * 1.8 + r / rings) % 1);
        const ringR = R * (1.05 + phase * 0.65);
        const ringAlpha = (1 - phase) * audio * lp.audioScale * 0.35;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(52,211,153,${ringAlpha})`;
        ctx.lineWidth = 1.4 * (1 - phase);
        ctx.stroke();
      }
    }

  }, []);

  useEffect(() => {
    if (!active) return;
    let start: number | null = null;

    const loop = (ts: number) => {
      if (start === null) start = ts;
      const t = (ts - start) / 1000;
      draw(t);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, draw]);

  const stateLabels: Record<OrbState, string> = {
    idle: 'Ready', listening: 'Listening', thinking: 'Processing',
    speaking: 'Speaking', finished: 'Complete',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas
        ref={canvasRef}
        width={height}
        height={height}
        style={{ display: 'block', maxWidth: '100%' }}
      />
      {/* State label */}
      <div style={{
        position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 5, pointerEvents: 'none',
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          backgroundColor:
            state === 'listening' || state === 'speaking' ? '#22c55e'
            : state === 'thinking' ? '#16a34a'
            : 'rgba(34,197,94,0.4)',
          transition: 'background-color 0.6s',
          boxShadow: (state === 'listening' || state === 'speaking')
            ? '0 0 8px rgba(34,197,94,0.7)' : 'none',
        }} />
        <span style={{
          fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--v-tx2)', transition: 'color 0.6s',
        }}>
          {stateLabels[state]}
        </span>
      </div>
    </div>
  );
}
