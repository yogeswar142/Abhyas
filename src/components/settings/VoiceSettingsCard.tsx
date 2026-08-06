'use client';

import React, { useState, useEffect } from 'react';
import { ttsManager } from '@/lib/tts/ttsManager';
import { TTSConfig, TTSEngineMode, TTSVoiceOption } from '@/lib/tts/types';

const T = {
  card: 'var(--v-card)',
  cardHov: 'var(--v-raised)',
  border: 'var(--v-border)',
  green: 'var(--v-accent)',
  text0: 'var(--v-tx0)',
  text1: 'var(--v-tx1)',
  text2: 'var(--v-tx2)',
  text3: 'var(--v-tx3)',
};

export function VoiceSettingsCard() {
  const [config, setConfig] = useState<TTSConfig>(() => ttsManager.getConfig());
  const [voices, setVoices] = useState<TTSVoiceOption[]>([]);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  useEffect(() => {
    const loadVoices = async () => {
      const available = await ttsManager.getAvailableVoices(config.engine);
      setVoices(available);
      if (available.length > 0 && (!config.voiceId || !available.some((v) => v.id === config.voiceId))) {
        const nextId = available[0].id;
        const updated = { ...config, voiceId: nextId };
        setConfig(updated);
        ttsManager.setConfig(updated);
      }
    };
    loadVoices();
  }, [config.engine]);

  const handleEngineChange = (engine: TTSEngineMode) => {
    const updated = { ...config, engine, voiceId: '' };
    setConfig(updated);
    ttsManager.setConfig(updated);
  };

  const handleVoiceChange = (voiceId: string) => {
    const updated = { ...config, voiceId };
    setConfig(updated);
    ttsManager.setConfig(updated);
  };

  const handleRateChange = (rate: number) => {
    const updated = { ...config, rate };
    setConfig(updated);
    ttsManager.setConfig(updated);
  };

  const handlePreview = async () => {
    if (isPlayingPreview) {
      ttsManager.stop();
      setIsPlayingPreview(false);
      return;
    }

    setIsPlayingPreview(true);
    const sampleText =
      config.engine === 'edge'
        ? 'Hello! I am your high-quality neural AI interviewer. I sound clear and natural.'
        : 'Hello! I am your lightweight browser AI interviewer. I operate with zero CPU lag.';

    try {
      await ttsManager.speak(sampleText, {
        onEnd: () => setIsPlayingPreview(false),
        onError: () => setIsPlayingPreview(false),
      });
    } catch {
      setIsPlayingPreview(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: T.text3, margin: 0 }}>
          Voice & Speech System
        </p>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text0, margin: '4px 0 0' }}>
          Interviewer Voice Engine
        </h3>
        <p style={{ fontSize: 12, color: T.text2, margin: '4px 0 0', lineHeight: 1.5 }}>
          Choose between fast native browser synthesis or human-sounding neural voices.
        </p>
      </div>

      {/* Mode Selector Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {/* Web Speech Option */}
        <div
          onClick={() => handleEngineChange('webspeech')}
          style={{
            padding: 16,
            borderRadius: 12,
            border: config.engine === 'webspeech' ? `2px solid ${T.green}` : `1px solid ${T.border}`,
            backgroundColor: config.engine === 'webspeech' ? 'rgba(34,197,94,0.06)' : T.cardHov,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text0 }}>⚡ Fast & Lightweight</span>
            {config.engine === 'webspeech' && (
              <span style={{ fontSize: 10, fontWeight: 800, color: T.green, textTransform: 'uppercase' }}>Active</span>
            )}
          </div>
          <p style={{ fontSize: 11, color: T.text2, margin: 0, lineHeight: 1.4 }}>
            Browser native (Web Speech API). <strong>0% CPU/GPU overhead</strong>. Instant response. Ideal for lower-spec PCs.
          </p>
        </div>

        {/* Edge-TTS Neural Option */}
        <div
          onClick={() => handleEngineChange('edge')}
          style={{
            padding: 16,
            borderRadius: 12,
            border: config.engine === 'edge' ? `2px solid ${T.green}` : `1px solid ${T.border}`,
            backgroundColor: config.engine === 'edge' ? 'rgba(34,197,94,0.06)' : T.cardHov,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text0 }}>🎙️ High-Quality Neural</span>
            {config.engine === 'edge' && (
              <span style={{ fontSize: 10, fontWeight: 800, color: T.green, textTransform: 'uppercase' }}>Active</span>
            )}
          </div>
          <p style={{ fontSize: 11, color: T.text2, margin: 0, lineHeight: 1.4 }}>
            Human-sounding neural voice (Edge-TTS via local bridge). Natural pitch and phrasing.
          </p>
        </div>
      </div>

      {/* Voice & Speed Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Voice Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Select Voice Actor
          </label>
          <select
            value={config.voiceId}
            onChange={(e) => handleVoiceChange(e.target.value)}
            style={{
              backgroundColor: T.cardHov,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              color: T.text0,
              outline: 'none',
              width: '100%',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        {/* Speed Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Speaking Speed
            </label>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.green }}>{config.rate.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.5"
            step="0.1"
            value={config.rate}
            onChange={(e) => handleRateChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: T.green, cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Preview Button */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          onClick={handlePreview}
          style={{
            backgroundColor: isPlayingPreview ? 'rgba(239,68,68,0.15)' : T.green,
            color: isPlayingPreview ? '#ef4444' : '#000',
            fontWeight: 700,
            fontSize: 13,
            padding: '10px 20px',
            borderRadius: 10,
            border: isPlayingPreview ? '1px solid rgba(239,68,68,0.3)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {isPlayingPreview ? '⏹ Stop Sample Voice' : '🔊 Test Voice Sample'}
        </button>
      </div>
    </div>
  );
}
