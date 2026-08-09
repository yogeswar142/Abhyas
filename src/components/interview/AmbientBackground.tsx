'use client';

import React, { useRef, useEffect } from 'react';

/**
 * AmbientBackground — A subtle, organic neural wave & particle field 
 * rendered at the bottom of the interview stage to bring depth and life 
 * to the conversational UI.
 */
export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = Math.max(200, window.innerHeight * 0.35));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = Math.max(200, window.innerHeight * 0.35);
    };

    window.addEventListener('resize', handleResize);

    // Particle nodes for subtle floating mesh
    const particleCount = Math.min(45, Math.floor(width / 30));
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: 1 + Math.random() * 1.5,
      alpha: 0.15 + Math.random() * 0.3,
    }));

    let t = 0;

    const render = () => {
      t += 0.008;
      ctx.clearRect(0, 0, width, height);

      // 1. Smooth gradient horizon baseline at bottom
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, 'rgba(0,0,0,0)');
      bgGrad.addColorStop(0.7, 'rgba(34,197,94,0.02)');
      bgGrad.addColorStop(1, 'rgba(34,197,94,0.06)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Sine wave lines (fluid ambient floor)
      const waveCount = 3;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        const baseLine = height * (0.55 + w * 0.12);
        const amplitude = 12 + w * 6;
        const speed = t * (0.8 + w * 0.3);

        for (let x = 0; x <= width; x += 15) {
          const y = baseLine + Math.sin(x * 0.004 + speed + w) * amplitude * Math.cos(x * 0.002 + speed * 0.5);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = `rgba(34, 197, 94, ${0.04 + w * 0.025})`;
        ctx.lineWidth = 1.2 + w * 0.4;
        ctx.stroke();
      }

      // 3. Floating particle connections
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52, 211, 153, ${p.alpha * 0.6})`;
        ctx.fill();

        // Connect nearby particles with subtle hair threads
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(34, 197, 94, ${(1 - dist / 110) * 0.08})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '35vh',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
