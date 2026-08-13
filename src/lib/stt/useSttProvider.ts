'use client';

/**
 * useSttProvider — Provider-Agnostic STT Hook
 *
 * This is the ONLY STT hook the interview system needs.
 * It replaces both `useWhisper` and direct `SpeechRecognition` usage.
 *
 * It:
 * 1. Reads the bridge's /stt/config to determine which provider to use.
 * 2. Creates the appropriate provider via the client registry.
 * 3. Falls back to Browser STT if the selected provider fails.
 * 4. Falls back to Browser STT → ONNX on network error (existing behavior).
 * 5. Exposes a uniform interface regardless of which provider is active.
 *
 * AnswerComposer uses ONLY this hook. It never imports from a specific provider.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SttProvider, SttStatus, SttProviderId, BridgeSttConfig } from './types';
import { createSttProvider } from './registry';
import { getSpeechRecognitionCtor } from '../speech';

export interface UseSttProviderOptions {
  /** Called when a new transcript arrives. */
  onResult: (text: string, isFinal: boolean) => void;
  /** Called after a long silence following committed text (VAD auto-submit). */
  onVADSubmit?: () => void;
  /** Called when all providers have failed. */
  onAllFailed?: (msg: string) => void;
  /** Shared mic stream from the level meter. */
  mediaStream?: MediaStream | null;
  /**
   * Bridge URL to fetch /stt/config from.
   * If not provided, falls back to reading from localStorage (set by SessionPrep).
   */
  bridgeUrl?: string | null;
}

export interface UseSttProviderReturn {
  /** Current STT status. */
  status: SttStatus;
  /** Loading progress 0–100. Meaningful when status === 'loading'. */
  loadingProgress: number;
  /** Error message. Meaningful when status === 'error'. */
  errorMsg: string;
  /** ID of the currently active provider. */
  activeProviderId: SttProviderId | null;
  /** Human-readable name of the active provider (for status display). */
  activeProviderName: string;
  /** Whether a fallback from the selected provider already occurred. */
  isUsingFallback: boolean;
  /** Start recording. */
  startRecording: () => void | Promise<void>;
  /** Stop recording and flush. */
  stopRecording: () => void;
  /** Reset internal committed text (call after the parent clears the input). */
  resetText: () => void;
}

const BRIDGE_CONFIG_STORAGE_KEY = 'abhyas_bridge_config';

/** Read bridge URL from localStorage (set by SessionPrep). */
function readBridgeUrlFromStorage(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(BRIDGE_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as { bridgeUrl?: string };
    return cfg.bridgeUrl ?? null;
  } catch {
    return null;
  }
}

/** Fetch the STT config from the bridge server. */
async function fetchBridgeSttConfig(bridgeUrl: string): Promise<BridgeSttConfig | null> {
  try {
    const res = await fetch(`${bridgeUrl}/stt/config`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return res.json() as Promise<BridgeSttConfig>;
  } catch {
    return null;
  }
}

export function useSttProvider({
  onResult,
  onVADSubmit,
  onAllFailed,
  mediaStream,
  bridgeUrl: externalBridgeUrl,
}: UseSttProviderOptions): UseSttProviderReturn {
  const [status, setStatus] = useState<SttStatus>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeProviderId, setActiveProviderId] = useState<SttProviderId | null>(null);
  const [activeProviderName, setActiveProviderName] = useState('');
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const providerRef = useRef<SttProvider | null>(null);
  const onResultRef = useRef(onResult);
  const onVADSubmitRef = useRef(onVADSubmit);
  const onAllFailedRef = useRef(onAllFailed);
  const mediaStreamRef = useRef(mediaStream);
  const initiatedRef = useRef(false);
  const destroyedRef = useRef(false);

  onResultRef.current = onResult;
  onVADSubmitRef.current = onVADSubmit;
  onAllFailedRef.current = onAllFailed;
  mediaStreamRef.current = mediaStream;

  // ── Provider Initialization ─────────────────────────────────────────────────

  const initProvider = useCallback(async (providerId: SttProviderId, isFallback = false) => {
    if (destroyedRef.current) return;

    // Destroy any previously running provider
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }

    const provider = createSttProvider(providerId);
    if (!provider) {
      // Unknown provider ID — fall back to browser
      if (providerId !== 'browser') {
        console.warn(`[STT] Provider "${providerId}" not registered on client. Falling back to browser.`);
        return initProvider('browser', true);
      }
      setStatus('error');
      setErrorMsg('No STT providers available');
      onAllFailedRef.current?.('No STT providers available');
      return;
    }

    providerRef.current = provider;
    setActiveProviderId(providerId);
    setActiveProviderName(provider.displayName);
    setIsUsingFallback(isFallback);
    setStatus('loading');
    setLoadingProgress(0);

    await provider.initialize({
      onResult: (text, isFinal) => {
        onResultRef.current(text, isFinal);
      },
      onVADSubmit: () => {
        onVADSubmitRef.current?.();
      },
      onError: async (msg) => {
        if (destroyedRef.current) return;

        // Network error from browser STT → fall back to ONNX (existing behavior)
        if (msg === 'network' && providerId === 'browser') {
          console.warn('[STT] Browser STT network error — switching to ONNX ASR');
          await initProvider('onnx-asr', true);
          return;
        }

        // ONNX failed → fall back to browser STT
        if (providerId !== 'browser') {
          console.warn(`[STT] Provider "${providerId}" failed — falling back to Browser STT`);
          await initProvider('browser', true);
          return;
        }

        // Browser STT also failed — nothing left
        setStatus('error');
        setErrorMsg(msg);
        onAllFailedRef.current?.(msg);
      },
    });

    // Mirror provider status changes into hook state
    // (Providers update their own status synchronously in initialize)
    const syncStatus = () => {
      if (!providerRef.current || providerRef.current !== provider) return;
      setStatus(provider.status);
      setLoadingProgress(provider.loadingProgress);
      setErrorMsg(provider.errorMsg);
    };

    // Poll status until ready/error (providers are not reactive — they update on worker messages)
    const poll = setInterval(() => {
      if (!providerRef.current || providerRef.current !== provider || destroyedRef.current) {
        clearInterval(poll);
        return;
      }
      syncStatus();
      if (provider.status === 'ready' || provider.status === 'error') {
        clearInterval(poll);
      }
    }, 200);

    syncStatus();
  }, []);

  // ── Bootstrap: resolve provider from bridge or default ────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (initiatedRef.current) return;
    initiatedRef.current = true;
    destroyedRef.current = false;

    (async () => {
      // Try to fetch which provider the bridge selected
      const bridgeUrl = externalBridgeUrl ?? readBridgeUrlFromStorage();
      let resolvedId: SttProviderId = 'browser';

      if (bridgeUrl) {
        const cfg = await fetchBridgeSttConfig(bridgeUrl);
        if (cfg?.providerId) {
          resolvedId = cfg.providerId;
        }
      }

      // If the bridge says ONNX but browser STT is unavailable (Firefox),
      // ONNX is still fine — it doesn't use the Web Speech API.
      // If the bridge says browser but it's unavailable, stay on browser
      // (the error will appear in the UI and user can switch to keyboard).
      if (destroyedRef.current) return;
      await initProvider(resolvedId);
    })();

    return () => {
      destroyedRef.current = true;
      providerRef.current?.destroy();
      providerRef.current = null;
      initiatedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public API ─────────────────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    if (!providerRef.current) return;
    return providerRef.current.startRecording();
  }, []);

  const stopRecording = useCallback(() => {
    providerRef.current?.stopRecording();
  }, []);

  const resetText = useCallback(() => {
    const p = providerRef.current as any;
    p?.resetText?.();
  }, []);

  return {
    status,
    loadingProgress,
    errorMsg,
    activeProviderId,
    activeProviderName,
    isUsingFallback,
    startRecording,
    stopRecording,
    resetText,
  };
}
