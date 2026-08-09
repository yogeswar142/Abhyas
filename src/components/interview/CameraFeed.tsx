'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CameraFeedProps {
  micActive?: boolean;
}

export function CameraFeed({ micActive = false }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMuted, setIsMuted] = useState(!micActive);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function enableCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 30 },
          audio: false, // Audio handled by AnswerComposer / micLevel
        });
        currentStream = mediaStream;
        setStream(mediaStream);
        setHasPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.warn('Camera access denied or unavailable:', err);
        setHasPermission(false);
      }
    }

    if (isVideoOn) {
      enableCamera();
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isVideoOn]);

  useEffect(() => {
    setIsMuted(!micActive);
  }, [micActive]);

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach((track) => (track.enabled = !isVideoOn));
    }
    setIsVideoOn(!isVideoOn);
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 40,
          backgroundColor: 'var(--v-card)',
          border: '1px solid var(--v-border)',
          borderRadius: 999,
          padding: '8px 16px',
          color: 'var(--v-tx1)',
          fontSize: 11,
          fontFamily: 'monospace',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: isVideoOn ? '#22c55e' : '#ef4444',
          }}
        />
        <span>Your Feed</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 40,
        width: 200,
        borderRadius: 16,
        backgroundColor: 'var(--v-card)',
        border: '1px solid var(--v-border)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(16px)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--v-line)',
          backgroundColor: 'rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: isVideoOn && hasPermission ? '#22c55e' : '#71717a',
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontFamily: 'monospace',
              fontWeight: 700,
              color: 'var(--v-tx1)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            You (Candidate)
          </span>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          title="Minimize feed"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--v-tx3)',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Video Box */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 125,
          backgroundColor: '#090a0c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isVideoOn && hasPermission !== false ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)', // Mirror candidate feed
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              color: 'var(--v-tx3)',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: 'var(--v-float)',
                border: '1px solid var(--v-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--v-tx2)',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Y
            </div>
            <span style={{ fontSize: 10, fontFamily: 'monospace' }}>
              {hasPermission === false ? 'Camera blocked' : 'Camera off'}
            </span>
          </div>
        )}

        {/* Mic Active Badge overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 999,
            backgroundColor: isMuted ? 'rgba(0,0,0,0.65)' : 'rgba(34,197,94,0.2)',
            border: `1px solid ${isMuted ? 'rgba(255,255,255,0.1)' : 'rgba(34,197,94,0.4)'}`,
            backdropFilter: 'blur(8px)',
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isMuted ? '#71717a' : '#22c55e'}
            strokeWidth="2.5"
          >
            {isMuted ? (
              <>
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              </>
            ) : (
              <>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </>
            )}
          </svg>
          <span
            style={{
              fontSize: 8.5,
              fontFamily: 'monospace',
              fontWeight: 700,
              color: isMuted ? '#a1a1aa' : '#22c55e',
              textTransform: 'uppercase',
            }}
          >
            {isMuted ? 'Muted' : 'Mic Live'}
          </span>
        </div>

        {/* Toggle Controls Overlay (top-right of video) */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            display: 'flex',
            gap: 4,
          }}
        >
          <button
            onClick={toggleVideo}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: isVideoOn ? '#22c55e' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
