'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';
import { SessionPrep } from '@/components/interview/SessionPrep';
import { AnswerComposer, type AnswerInputMode } from '@/components/interview/AnswerComposer';
import {
  loadBridgeConfig,
  streamInterviewChat,
  toChatMessages,
  scoreInterviewTurn,
  fetchInterviewClosing,
  averageScores,
  warmBridgeModel,
  checkBridgeHealth,
  type BridgeConfig,
  type TurnScores,
} from '@/lib/bridge';
import { speakText, stopSpeech } from '@/lib/audio';
import { ttsManager } from '@/lib/tts/ttsManager';
import { buildInterviewerSystemPrompt } from '@/lib/prompts';

type SessionPhase = 'prep' | 'connecting' | 'live';

const TERMINAL_STATUSES = new Set(['completed', 'analyzing', 'incomplete']);

function isTerminalStatus(status?: string | null) {
  return Boolean(status && TERMINAL_STATUSES.has(status));
}

function isBridgeOrModelFailure(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('bridge') ||
    msg.includes('reach the interviewer') ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('ollama') ||
    msg.includes('warm') ||
    msg.includes('interviewer did not respond') ||
    msg.includes('empty reply')
  );
}

const T = {
  page:        'var(--v-page)',
  card:        'var(--v-card)',
  raised:      'var(--v-raised)',
  float:       'var(--v-float)',
  border:      'var(--v-border)',
  line:        'var(--v-line)',
  green:       'var(--v-accent)',
  greenGhost:  'var(--v-accent-ghost)',
  text0:       'var(--v-tx0)',
  text1:       'var(--v-tx1)',
  text2:       'var(--v-tx2)',
  text3:       'var(--v-tx3)',
  track:       'var(--v-track)',
  hover:       'var(--v-hover)',
} as const;

const MAX_QUESTIONS = 5;

const SYS_JOIN = 'Interviewer has joined the session.';
const SYS_LEFT = 'Interviewer has left the session.';
const SYS_ANALYZING = 'Your interview is being analyzed. Please wait here until scoring finishes.';
const SYS_INCOMPLETE = 'Session ended early — marked as Didn’t Finish. This does not affect your average score.';

const AnimatedAcousticOrb = ({ active, level = 0 }: { active: boolean; level?: number }) => {
  const scale = active ? 1 + Math.min(0.18, level * 0.5) : 0.95;
  return (
    <div style={{ position: 'relative', width: 144, height: 144, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '1px solid rgba(34,197,94,0.12)',
        transform: `scale(${scale})`, transition: 'transform 0.12s ease',
        opacity: active ? 0.35 : 0.12,
      }} />
      <div style={{
        position: 'absolute', inset: 16, borderRadius: '50%',
        border: '1px solid rgba(34,197,94,0.2)',
        transform: `scale(${scale})`, transition: 'transform 0.12s ease',
        opacity: active ? 0.45 : 0.2,
      }} />
      <div style={{
        position: 'relative', zIndex: 1, width: 64, height: 64, borderRadius: '50%',
        backgroundColor: 'var(--bg-2)',
        border: active ? '1px solid rgba(34,197,94,0.4)' : `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: active ? '0 0 30px rgba(34,197,94,0.15)' : 'none',
      }}>
        <svg width="20" height="24" viewBox="0 0 14 18" fill="none" style={{ color: active ? 'var(--accent)' : 'var(--text-3)' }}>
          <rect x="3.5" y="0.75" width="7" height="10" rx="3.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M0.75 8.5c0 3.452 2.798 6.25 6.25 6.25S13.25 11.952 13.25 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="7" y1="14.75" x2="7" y2="17.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

interface Message {
  id: string;
  sender: 'interviewer' | 'candidate' | 'system';
  content: string;
  created_at: string;
}

export default function ActiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [interview, setInterview] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [inputText, setInputText] = useState('');
  const [isInterviewerResponding, setIsInterviewerResponding] = useState(false);
  const [isSavingScores, setIsSavingScores] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [bridge, setBridge] = useState<BridgeConfig | null>(null);
  const [prepDone, setPrepDone] = useState(false);
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('prep');
  const [aiError, setAiError] = useState('');
  const [saveWarning, setSaveWarning] = useState('');
  const [connectNonce, setConnectNonce] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [answerMode, setAnswerMode] = useState<AnswerInputMode>('voice');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const turnScoresRef = useRef<TurnScores[]>([]);
  const wrappingRef = useRef(false);
  const incompleteRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const interviewRef = useRef<any>(null);
  const bridgeRef = useRef<BridgeConfig | null>(null);

  messagesRef.current = messages;
  interviewRef.current = interview;
  bridgeRef.current = bridge;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isInterviewerResponding, streamingText]);

  useEffect(() => {
    if (
      interview &&
      (interview.status === 'scheduled' || interview.status === 'in-progress') &&
      prepDone &&
      sessionPhase === 'live'
    ) {
      const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [interview, prepDone, sessionPhase]);

  useEffect(() => {
    if (!id) return;

    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

        const resInterview = await fetch(`${backendUrl}/api/interviews/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resInterview.ok) {
          router.push('/dashboard');
          return;
        }
        const interviewData = await resInterview.json();
        setInterview(interviewData);
        if (Array.isArray(interviewData.turn_scores)) {
          turnScoresRef.current = interviewData.turn_scores;
        }

        const resMessages = await fetch(`${backendUrl}/api/interviews/${id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resMessages.ok) return;
        const messagesData = await resMessages.json();
        setMessages(messagesData || []);

        // Resume / report: skip prep when messages exist or session already past prep
        if (
          isTerminalStatus(interviewData.status) ||
          (messagesData?.length > 0)
        ) {
          const cfg = loadBridgeConfig();
          if (cfg) setBridge(cfg);
          setPrepDone(true);
          setSessionPhase('live');
        }
      } catch (err) {
        console.error('Failed to load session:', err);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, [id, supabase, router]);

  const makeLocalMessage = (
    sender: 'interviewer' | 'candidate' | 'system',
    content: string
  ): Message => ({
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender,
    content,
    created_at: new Date().toISOString(),
  });

  const persistMessage = async (
    token: string,
    sender: 'interviewer' | 'candidate' | 'system',
    content: string
  ): Promise<Message | null> => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const res = await fetch(`${backendUrl}/api/interviews/${id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sender, content }),
    });
    const rawText = await res.text();
    let body: Record<string, unknown> = {};
    try {
      body = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
    } catch {
      body = { raw: rawText };
    }
    if (!res.ok) {
      console.error('Error saving message:', {
        status: res.status,
        statusText: res.statusText,
        body,
      });
      return null;
    }
    return body as unknown as Message;
  };

  /** Prefer server row; fall back to local so join/system lines do not block the session. */
  const persistOrLocal = async (
    token: string,
    sender: 'interviewer' | 'candidate' | 'system',
    content: string,
    opts?: { allowLocal?: boolean }
  ): Promise<Message | null> => {
    const saved = await persistMessage(token, sender, content);
    if (saved) return saved;
    if (opts?.allowLocal) {
      setSaveWarning('Some messages could not be saved to the server.');
      return makeLocalMessage(sender, content);
    }
    return null;
  };

  const patchInterview = async (token: string, body: Record<string, unknown>) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const res = await fetch(`${backendUrl}/api/interviews/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return res.json();
  };

  const scoreLastTurn = async (
    cfg: BridgeConfig,
    history: Message[],
    token: string
  ) => {
    const talk = history.filter((m) => m.sender === 'interviewer' || m.sender === 'candidate');
    const lastAnswer = [...talk].reverse().find((m) => m.sender === 'candidate');
    const lastQuestion = [...talk].reverse().find((m) => m.sender === 'interviewer');
    if (!lastAnswer || !lastQuestion) return;

    const scores = await scoreInterviewTurn({
      bridgeUrl: cfg.bridgeUrl,
      model: cfg.model,
      question: lastQuestion.content,
      answer: lastAnswer.content,
      interviewType: interview.type,
    });
    if (!scores) return;

    turnScoresRef.current = [...turnScoresRef.current, scores];
    await patchInterview(token, { turn_scores: turnScoresRef.current });
  };

  const askInterviewer = async (
    cfg: BridgeConfig,
    history: Message[],
    token: string,
    opts?: { onFirstToken?: () => void }
  ) => {
    setAiError('');
    setIsInterviewerResponding(true);
    setStreamingText('');
    let sawToken = false;

    try {
      const systemPrompt = buildInterviewerSystemPrompt({
        interviewType: interview.type,
        role: interview.role,
        company: interview.company,
        difficulty: interview.difficulty,
      });

      const ttsStreamer = ttsManager.createSentenceStreamer();

      const full = await streamInterviewChat({
        bridgeUrl: cfg.bridgeUrl,
        model: cfg.model,
        interviewType: interview.type,
        role: interview.role,
        company: interview.company,
        difficulty: interview.difficulty,
        systemPrompt,
        messages: toChatMessages(history),
        onToken: (t) => {
          if (!sawToken) {
            sawToken = true;
            opts?.onFirstToken?.();
          }
          setStreamingText((prev) => prev + t);
          ttsStreamer.pushToken(t);
        },
      });

      ttsStreamer.flush();

      if (!full) throw new Error('Interviewer did not respond. Try again.');

      if (!sawToken) opts?.onFirstToken?.();

      const saved = await persistOrLocal(token, 'interviewer', full, { allowLocal: true });
      if (saved) setMessages((prev) => [...prev, saved]);
      setStreamingText('');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Couldn't reach the interviewer — check your connection and retry";
      setAiError(msg);
      setStreamingText('');

      // Mid-session model/bridge drop → Didn't Finish (does not affect average score)
      if (
        sessionPhase === 'live' &&
        !incompleteRef.current &&
        !wrappingRef.current &&
        isBridgeOrModelFailure(err)
      ) {
        const { data: { session } } = await supabase.auth.getSession();
        const t = session?.access_token;
        if (t) {
          await markIncomplete(
            t,
            'model_closed',
            'The interviewer connection was lost (local model closed or bridge unavailable).'
          );
        }
      }

      throw err;
    } finally {
      setIsInterviewerResponding(false);
    }
  };

  const markIncomplete = async (
    token: string,
    reason: 'left' | 'model_closed' | 'disconnected',
    detail?: string
  ) => {
    if (incompleteRef.current || wrappingRef.current) return;
    if (isTerminalStatus(interviewRef.current?.status)) return;
    incompleteRef.current = true;

    const questionsAsked = messagesRef.current.filter((m) => m.sender === 'candidate').length;
    const feedback =
      detail ||
      (reason === 'model_closed'
        ? 'Session marked Didn’t Finish because the local interviewer/model was unavailable. This does not affect your average score.'
        : reason === 'disconnected'
          ? 'Session marked Didn’t Finish after a disconnect. This does not affect your average score.'
          : 'You left before finishing. This session does not affect your average score.');

    try {
      const leftMsg = await persistOrLocal(token, 'system', SYS_INCOMPLETE, { allowLocal: true });
      if (leftMsg) setMessages((prev) => [...prev, leftMsg]);

      const updated = await patchInterview(token, {
        status: 'incomplete',
        questions_asked: questionsAsked,
        score_overall: 0,
        score_clarity: 0,
        score_structure: 0,
        score_confidence: 0,
        score_depth: 0,
        feedback,
        turn_scores: turnScoresRef.current,
      });

      setInterview(
        updated || {
          ...interviewRef.current,
          status: 'incomplete',
          questions_asked: questionsAsked,
          score_overall: 0,
          score_clarity: 0,
          score_structure: 0,
          score_confidence: 0,
          score_depth: 0,
          feedback,
        }
      );
      setSessionPhase('live');
    } catch (err) {
      console.error('Failed to mark incomplete:', err);
      setInterview((prev: any) => ({
        ...prev,
        status: 'incomplete',
        feedback,
      }));
    }
  };

  const wrapUpSession = async (
    cfg: BridgeConfig,
    history: Message[],
    token: string,
    questionsAsked: number,
    opts?: { earlyExit?: boolean }
  ) => {
    if (wrappingRef.current || incompleteRef.current) return;
    wrappingRef.current = true;
    setIsSavingScores(true);
    setAiError('');

    try {
      // Score final turn if not already counted
      await scoreLastTurn(cfg, history, token);

      await patchInterview(token, {
        status: 'analyzing',
        questions_asked: questionsAsked,
        turn_scores: turnScoresRef.current,
      });
      setInterview((prev: any) => ({ ...prev, status: 'analyzing' }));

      setIsInterviewerResponding(true);
      const lastAnswer =
        [...history].reverse().find((m) => m.sender === 'candidate')?.content || '';

      let closingText = opts?.earlyExit
        ? 'Thanks for your time. We scored the answers you shared before leaving.'
        : 'Thanks for your time today. We will review your answers shortly.';
      let finalScores = averageScores(turnScoresRef.current);
      let overall = Math.round(
        (finalScores.clarity + finalScores.structure + finalScores.confidence + finalScores.depth) / 4
      );

      try {
        const closing = await fetchInterviewClosing({
          bridgeUrl: cfg.bridgeUrl,
          model: cfg.model,
          role: interview.role,
          company: interview.company,
          lastAnswer,
          turnScores: turnScoresRef.current,
        });
        closingText = opts?.earlyExit
          ? `${closing.message} (Session ended early — scored from answers given.)`
          : closing.message;
        finalScores = closing.scores;
        overall = closing.overall;
      } catch (err) {
        console.error('Closing failed, using fallback:', err);
      }

      const closingMsg = await persistOrLocal(token, 'interviewer', closingText, { allowLocal: true });
      if (closingMsg) setMessages((prev) => [...prev, closingMsg]);
      setIsInterviewerResponding(false);

      const leftMsg = await persistOrLocal(token, 'system', SYS_LEFT, { allowLocal: true });
      if (leftMsg) setMessages((prev) => [...prev, leftMsg]);

      const analyzeMsg = await persistOrLocal(token, 'system', SYS_ANALYZING, { allowLocal: true });
      if (analyzeMsg) setMessages((prev) => [...prev, analyzeMsg]);

      const feedbackSummary = opts?.earlyExit
        ? `${closingText} Early exit — scores use answers given before leaving.`
        : `${closingText} Scores averaged from per-answer evaluations (not full-transcript dump).`;

      const updated = await patchInterview(token, {
        status: 'completed',
        questions_asked: questionsAsked,
        score_overall: overall,
        score_clarity: finalScores.clarity,
        score_structure: finalScores.structure,
        score_confidence: finalScores.confidence,
        score_depth: finalScores.depth,
        feedback: feedbackSummary,
        turn_scores: turnScoresRef.current,
      });

      if (updated) {
        setInterview(updated);
      } else {
        setInterview((prev: any) => ({
          ...prev,
          status: 'completed',
          score_overall: overall,
          score_clarity: finalScores.clarity,
          score_structure: finalScores.structure,
          score_confidence: finalScores.confidence,
          score_depth: finalScores.depth,
          feedback: feedbackSummary,
        }));
      }
    } catch (err) {
      console.error('Wrap-up failed:', err);
      // If scoring fails because model died, fall back to Didn't Finish
      if (isBridgeOrModelFailure(err)) {
        wrappingRef.current = false;
        await markIncomplete(
          token,
          'model_closed',
          'Could not finish scoring because the interviewer/model became unavailable.'
        );
      } else {
        setAiError(err instanceof Error ? err.message : 'Failed to finish interview');
        setInterview((prev: any) => ({ ...prev, status: 'analyzing' }));
      }
    } finally {
      setIsInterviewerResponding(false);
      setIsSavingScores(false);
      wrappingRef.current = false;
    }
  };

  const handleExitSession = async () => {
    if (isTerminalStatus(interview?.status) || isSavingScores) {
      router.push('/dashboard');
      return;
    }

    const answerCount = messages.filter((m) => m.sender === 'candidate').length;
    const ok = window.confirm(
      answerCount > 0
        ? 'Leave this interview? We will score the answers you have given so far.'
        : 'Leave without answering? This session will be marked Didn’t Finish and will not affect your average score.'
    );
    if (!ok) return;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      router.push('/dashboard');
      return;
    }

    if (answerCount > 0) {
      const cfg = bridge || loadBridgeConfig();
      if (cfg) {
        await wrapUpSession(cfg, messages, token, answerCount, { earlyExit: true });
        return;
      }
      // Have answers but no bridge — can't score; mark incomplete so avg stays clean
      await markIncomplete(
        token,
        'left',
        'You left early and scoring was unavailable. This session does not affect your average score.'
      );
      return;
    }

    await markIncomplete(token, 'left');
  };

  // After prep: warm interviewer → join → first question; reveal live on first token
  useEffect(() => {
    if (!prepDone || !bridge || !interview || loading) return;
    if (isTerminalStatus(interview.status)) return;
    if (messages.length > 0 || startedRef.current) return;

    startedRef.current = true;
    setSessionPhase('connecting');
    setAiError('');

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setAiError('Please sign in again to start the interview.');
        return;
      }

      try {
        await warmBridgeModel({ bridgeUrl: bridge.bridgeUrl, model: bridge.model });

        await patchInterview(token, { status: 'in-progress' });
        setInterview((prev: any) => ({ ...prev, status: 'in-progress' }));

        const join = await persistOrLocal(token, 'system', SYS_JOIN, { allowLocal: true });
        if (join) setMessages((prev) => [...prev, join]);

        await askInterviewer(bridge, [], token, {
          onFirstToken: () => setSessionPhase('live'),
        });
        setSessionPhase((prev) => (prev === 'connecting' ? 'live' : prev));
      } catch (err) {
        setAiError(
          err instanceof Error
            ? err.message
            : "Couldn't reach the interviewer — check your connection and retry"
        );
        setSessionPhase('connecting');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepDone, bridge, interview, loading, messages.length, connectNonce]);

  // If user returns while analyzing, finish scoring from stored turn_scores
  useEffect(() => {
    if (!prepDone || !interview || loading) return;
    if (interview.status !== 'analyzing' || wrappingRef.current) return;

    (async () => {
      const cfg = bridge || loadBridgeConfig();
      if (!cfg) return;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      wrappingRef.current = true;
      setIsSavingScores(true);
      try {
        const scores = averageScores(
          Array.isArray(interview.turn_scores) && interview.turn_scores.length
            ? interview.turn_scores
            : turnScoresRef.current
        );
        const overall = Math.round(
          (scores.clarity + scores.structure + scores.confidence + scores.depth) / 4
        );
        const updated = await patchInterview(token, {
          status: 'completed',
          score_overall: overall,
          score_clarity: scores.clarity,
          score_structure: scores.structure,
          score_confidence: scores.confidence,
          score_depth: scores.depth,
          feedback:
            interview.feedback ||
            'Session analysis finished from per-answer scores. Keep practicing for deeper structure and clarity.',
        });
        if (updated) setInterview(updated);
      } finally {
        setIsSavingScores(false);
        wrappingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepDone, interview?.status, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !inputText.trim() ||
      isInterviewerResponding ||
      !bridge ||
      isTerminalStatus(interview?.status) ||
      isSavingScores
    ) {
      return;
    }

    const candidateAnswer = inputText.trim();
    setInputText('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const userMsg = await persistMessage(token, 'candidate', candidateAnswer);
      if (!userMsg) return;

      const nextHistory = [...messages, userMsg];
      setMessages(nextHistory);

      const candidateCount = nextHistory.filter((m) => m.sender === 'candidate').length;

      // Score this turn in the background (one Q+A only)
      void scoreLastTurn(bridge, nextHistory, token);

      if (candidateCount >= MAX_QUESTIONS) {
        await wrapUpSession(bridge, nextHistory, token, candidateCount);
        return;
      }

      await askInterviewer(bridge, nextHistory, token);

      await patchInterview(token, {
        questions_asked: nextHistory.filter((m) => m.sender === 'interviewer').length + 1,
        turn_scores: turnScoresRef.current,
      });
    } catch (err) {
      console.error('Failed to complete transaction:', err);
      setIsInterviewerResponding(false);
    }
  };

  // Tab close / hard disconnect while in progress → Didn't Finish (can't score reliably offline)
  useEffect(() => {
    const onPageHide = () => {
      const current = interviewRef.current;
      if (!current || isTerminalStatus(current.status) || wrappingRef.current || incompleteRef.current) {
        return;
      }
      if (current.status !== 'in-progress' && current.status !== 'scheduled') return;

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      void (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (!token) return;
          const questionsAsked = messagesRef.current.filter((m) => m.sender === 'candidate').length;
          await fetch(`${backendUrl}/api/interviews/${id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              status: 'incomplete',
              questions_asked: questionsAsked,
              score_overall: 0,
              score_clarity: 0,
              score_structure: 0,
              score_confidence: 0,
              score_depth: 0,
              feedback:
                'Session marked Didn’t Finish after disconnect. This does not affect your average score.',
              turn_scores: turnScoresRef.current,
            }),
            keepalive: true,
          });
        } catch {
          /* best-effort */
        }
      })();
    };

    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [id, supabase]);

  // Detect local model/bridge closed during a live session
  useEffect(() => {
    if (sessionPhase !== 'live' || !bridge || isTerminalStatus(interview?.status)) return;

    let fails = 0;
    const tick = async () => {
      if (wrappingRef.current || incompleteRef.current) return;
      try {
        const h = await checkBridgeHealth(bridge.bridgeUrl);
        if (h.status === 'healthy') {
          fails = 0;
          return;
        }
        fails += 1;
      } catch {
        fails += 1;
      }
      if (fails < 2) return;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      await markIncomplete(
        token,
        'model_closed',
        'The local interviewer/model went offline. Session marked Didn’t Finish — your average score is unchanged.'
      );
    };

    const interval = setInterval(tick, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionPhase, bridge, interview?.status]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || !interview) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '3px solid var(--accent)', borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: 13, color: T.text2, fontFamily: 'monospace' }}>Loading session…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isTerminalStatus(interview.status) && !prepDone) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', paddingBottom: 64, paddingTop: 12 }}>
        <SessionPrep
          onReady={(cfg) => {
            setBridge(cfg);
            setSessionPhase('connecting');
            setPrepDone(true);
          }}
        />
      </div>
    );
  }

  if (
    !isTerminalStatus(interview.status) &&
    sessionPhase === 'connecting'
  ) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 420, gap: 20, width: '100%', paddingBottom: 64, textAlign: 'center',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid var(--accent)', borderTopColor: 'transparent',
          animation: 'spin 0.9s linear infinite',
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text0, margin: 0 }}>
            Connecting you to the interviewer
          </h2>
          <p style={{ fontSize: 14, color: T.text2, margin: 0, lineHeight: 1.5 }}>
            Please wait — your session is about to begin.
          </p>
        </div>
        {aiError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', maxWidth: 420 }}>
            <p style={{ fontSize: 13, color: '#f87171', margin: 0, lineHeight: 1.5 }}>{aiError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                startedRef.current = false;
                setAiError('');
                setSaveWarning('');
                setMessages([]);
                setStreamingText('');
                setConnectNonce((n) => n + 1);
              }}
            >
              Retry connection
            </Button>
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const currentQuestionNum = messages.filter((m) => m.sender === 'interviewer').length;
  const statusLabel =
    interview.status === 'completed'
      ? 'Completed'
      : interview.status === 'analyzing'
        ? 'Analyzing'
        : interview.status === 'incomplete'
          ? "Didn't Finish"
          : 'Active';
  const sessionLocked =
    interview.status === 'analyzing' ||
    interview.status === 'completed' ||
    interview.status === 'incomplete' ||
    isSavingScores;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', paddingBottom: 64 }}>
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 16, borderBottom: `1px solid ${T.border}`, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
            color: '#fff',
            backgroundColor:
              interview.status === 'completed'
                ? T.border
                : interview.status === 'analyzing'
                  ? '#eab308'
                  : interview.status === 'incomplete'
                    ? '#6b7280'
                    : T.green,
            padding: '4px 8px', borderRadius: 4, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {interview.type.replace('-', ' ')} {statusLabel}
          </span>
          <span style={{ fontSize: 11, color: T.text2, fontFamily: 'monospace' }}>
            ID: {interview.id.substring(0, 8)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: T.text1 }}>
            Target: <strong style={{ color: T.text0, fontWeight: 600 }}>{interview.role}</strong> at{' '}
            <strong style={{ color: T.text0, fontWeight: 600 }}>{interview.company}</strong> ({interview.difficulty})
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            backgroundColor: T.card, border: `1px solid ${T.border}`,
            padding: '6px 12px', borderRadius: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text2} strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text0, fontFamily: 'monospace' }}>
              {interview.status === 'completed' ? `${interview.duration}:00` : formatTime(seconds)}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExitSession}
            className="text-xs font-bold px-4"
          >
            {isTerminalStatus(interview?.status) ? 'Back to Dashboard' : 'Leave Session'}
          </Button>
        </div>
      </div>

      {interview.status === 'incomplete' ? (
        /* ── DIDN'T FINISH REPORT ── */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <Card spotlight padding="none" className="bg-[var(--bg-1)] border border-[var(--border)]" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: 24, borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: '#6b7280' }}>Session Report</span>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text0, margin: '4px 0 0' }}>Session Not Completed</h2>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ backgroundColor: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.2)', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.text1, margin: '0 0 4px' }}>This session was not scored</p>
                  <p style={{ fontSize: 12, color: T.text2, lineHeight: 1.6, margin: 0 }}>
                    {interview.feedback || 'The session ended before completion. Your average score and readiness metrics are not affected by unfinished sessions.'}
                  </p>
                </div>
              </div>

              {/* Show partial transcript summary if questions were answered */}
              {(interview.questions_asked || 0) > 0 && (
                <div style={{ backgroundColor: T.float, padding: 20, borderRadius: 12, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <h4 style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: T.text1, textTransform: 'uppercase', margin: 0 }}>Progress Before Exit</h4>
                  <p style={{ fontSize: 13, color: T.text2, lineHeight: 1.6, margin: 0 }}>
                    You answered <strong style={{ color: T.text0 }}>{interview.questions_asked}</strong> out of {MAX_QUESTIONS} questions before the session ended.
                    Try again for a complete evaluation.
                  </p>
                </div>
              )}

              {/* Transcript messages */}
              {messages.filter(m => m.sender !== 'system').length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <h4 style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: T.text1, textTransform: 'uppercase', margin: 0 }}>Session Transcript</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
                    {messages.filter(m => m.sender !== 'system').map(msg => (
                      <div key={msg.id} style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: msg.sender === 'candidate' ? 'flex-end' : 'flex-start',
                        alignSelf: msg.sender === 'candidate' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                      }}>
                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: T.text3, textTransform: 'uppercase', marginBottom: 3 }}>
                          {msg.sender === 'candidate' ? 'You' : 'Interviewer'}
                        </span>
                        <div style={{
                          padding: '10px 14px', borderRadius: 10, border: `1px solid ${T.border}`,
                          fontSize: 13, lineHeight: 1.5, color: T.text1,
                          backgroundColor: msg.sender === 'candidate' ? T.float : 'rgba(107,114,128,0.06)',
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card spotlight padding="none" className="bg-[var(--bg-1)] border border-[var(--border)]" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', padding: '32px 0', alignItems: 'center' }}>
              {/* No-score indicator */}
              <div style={{ position: 'relative', width: 128, height: 128, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="64" cy="64" r="54" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
                  <circle cx="64" cy="64" r="54" stroke="rgba(107,114,128,0.25)" strokeWidth="6" fill="none"
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={2 * Math.PI * 54 * 0.6}
                    strokeLinecap="round"
                  />
                </svg>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#6b7280', textTransform: 'uppercase', marginTop: 4 }}>No Score</span>
                </div>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: T.text0, margin: '8px 0 0', textAlign: 'center' }}>Didn&apos;t Finish</h3>
              <p style={{ fontSize: 12, color: T.text2, maxWidth: 220, margin: '4px auto 0', lineHeight: 1.5, textAlign: 'center' }}>
                This session won&apos;t affect your readiness score or average. Complete the full interview to get scored.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <Button onClick={() => router.push('/interview/new')} className="w-full font-bold">
                Start New Session
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full font-bold">
                Return to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      ) : interview.status === 'completed' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <Card spotlight padding="none" className="bg-[var(--bg-1)] border border-[var(--border)]" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: 24, borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: T.green }}>Evaluation Report</span>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text0, margin: '4px 0 0' }}>Mock Simulation Analysis</h2>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Clarity', val: interview.score_clarity },
                  { label: 'Structure', val: interview.score_structure },
                  { label: 'Confidence', val: interview.score_confidence },
                  { label: 'Depth', val: interview.score_depth },
                ].map((skill) => (
                  <div key={skill.label} style={{ backgroundColor: T.float, padding: 16, borderRadius: 12, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: T.text2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{skill.label}</span>
                    <span style={{ fontSize: 24, fontWeight: 900, color: T.text0 }}>{skill.val}%</span>
                    <div style={{ height: 4, borderRadius: 2, backgroundColor: T.border, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${skill.val}%`, backgroundColor: T.green }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ backgroundColor: T.float, padding: 20, borderRadius: 12, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h4 style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: T.text1, textTransform: 'uppercase', margin: 0 }}>Detailed Feedback Summary</h4>
                <p style={{ fontSize: 13, color: T.text2, lineHeight: 1.6, margin: 0 }}>{interview.feedback}</p>
              </div>
            </div>
          </Card>

          <Card spotlight padding="none" className="bg-[var(--bg-1)] border border-[var(--border)]" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', padding: '32px 0', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 128, height: 128, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="64" cy="64" r="54" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
                  <circle
                    cx="64" cy="64" r="54" stroke={T.green} strokeWidth="6" fill="none"
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={(2 * Math.PI * 54) * (1 - interview.score_overall / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: T.text0 }}>{interview.score_overall}</span>
                  <span style={{ fontSize: 9, fontFamily: 'monospace', color: T.text2, textTransform: 'uppercase' }}>Overall Rating</span>
                </div>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: T.text0, margin: '16px 0 0' }}>Simulation Finished</h3>
              <p style={{ fontSize: 12, color: T.text2, maxWidth: 220, margin: '8px auto 0', lineHeight: 1.5, textAlign: 'center' }}>
                Your performance has been evaluated against targeted {interview.company} requirements.
              </p>
            </div>
            <Button onClick={() => router.push('/dashboard')} className="w-full font-bold">
              Return to Dashboard
            </Button>
          </Card>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <Card spotlight padding="none" className="bg-[var(--bg-1)] border border-[var(--border)]" style={{ display: 'flex', flexDirection: 'column', height: 620, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', borderBottom: `1px solid ${T.border}`, backgroundColor: T.page,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: interview.status === 'analyzing' ? '#eab308' : T.green }} />
                <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: T.text1, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {interview.status === 'analyzing' ? 'Analyzing session' : 'Live transcript'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: T.green, textTransform: 'uppercase' }}>
                  Question {Math.min(MAX_QUESTIONS, Math.max(1, currentQuestionNum))} of {MAX_QUESTIONS}
                </span>
                {(() => {
                  const lastQ = [...messages].reverse().find((m) => m.sender === 'interviewer')?.content;
                  if (!lastQ || isInterviewerResponding) return null;
                  return (
                    <button
                      onClick={() => {
                        stopSpeech();
                        speakText(lastQ);
                      }}
                      title="Replay last question audio"
                      style={{
                        fontSize: 10,
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: T.green,
                        backgroundColor: 'rgba(34,197,94,0.08)',
                        border: '1px solid rgba(34,197,94,0.25)',
                        borderRadius: 6,
                        padding: '3px 8px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                      Repeat Question
                    </button>
                  );
                })()}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map((msg) => {
                if (msg.sender === 'system') {
                  return (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: 'center',
                        maxWidth: '90%',
                        textAlign: 'center',
                        padding: '8px 14px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${T.border}`,
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: T.text2,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {msg.content}
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex', flexDirection: 'column', maxWidth: '80%',
                      alignItems: msg.sender === 'candidate' ? 'flex-end' : 'flex-start',
                      alignSelf: msg.sender === 'candidate' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <span style={{ fontSize: 9, fontFamily: 'monospace', color: T.text2, textTransform: 'uppercase', marginBottom: 4 }}>
                      {msg.sender === 'candidate' ? 'You' : 'Interviewer'}
                    </span>
                    <div style={{
                      padding: '12px 16px', borderRadius: 12, border: `1px solid ${T.border}`,
                      fontSize: 13.5, lineHeight: 1.5,
                      backgroundColor: msg.sender === 'candidate' ? T.float : 'rgba(34, 197, 94, 0.05)',
                      borderColor: msg.sender === 'candidate' ? T.border : 'rgba(34, 197, 94, 0.15)',
                      borderTopRightRadius: msg.sender === 'candidate' ? 0 : 12,
                      borderTopLeftRadius: msg.sender === 'candidate' ? 12 : 0,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}

              {(isInterviewerResponding || streamingText) && (
                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '80%', alignSelf: 'flex-start', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 9, fontFamily: 'monospace', color: T.text2, textTransform: 'uppercase', marginBottom: 4 }}>Interviewer</span>
                  <div style={{
                    padding: '12px 16px', borderRadius: '12px 12px 12px 0',
                    border: '1px solid rgba(34, 197, 94, 0.15)',
                    backgroundColor: 'rgba(34, 197, 94, 0.05)',
                    fontSize: 13.5, lineHeight: 1.5, minHeight: 24,
                  }}>
                    {streamingText || (
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--accent)', opacity: 0.7 }} />
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--accent)', opacity: 0.5 }} />
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--accent)', opacity: 0.3 }} />
                      </span>
                    )}
                  </div>
                </div>
              )}

              {aiError && (
                <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{aiError}</p>
              )}
              {saveWarning && (
                <p style={{ fontSize: 11, color: '#eab308', margin: 0 }}>{saveWarning}</p>
              )}

              {(isSavingScores || interview.status === 'analyzing') && (
                <div style={{ textAlign: 'center', color: T.text2, fontFamily: 'monospace', fontSize: 11, padding: '8px 0' }}>
                  Analyzing answers and compiling scorecard…
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <AnswerComposer
              value={inputText}
              onChange={setInputText}
              onSubmit={handleSend}
              disabled={sessionLocked}
              waitingForInterviewer={isInterviewerResponding}
              onLevelChange={setMicLevel}
              onModeChange={setAnswerMode}
            />
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card spotlight padding="none" className="bg-[var(--bg-1)] border border-[var(--border)]" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', textAlign: 'center' }}>
              <AnimatedAcousticOrb
                active={!isInterviewerResponding && answerMode === 'voice'}
                level={micLevel}
              />
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{
                  alignSelf: 'center', fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
                  color: T.green, backgroundColor: 'rgba(34,197,94,0.08)',
                  padding: '3px 8px', borderRadius: 4, letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  {answerMode === 'voice' ? 'Voice answer' : 'Keyboard answer'}
                </span>
                <p style={{ fontSize: 12, color: T.text2, lineHeight: 1.5, margin: '4px 0 0' }}>
                  {answerMode === 'voice'
                    ? 'Speak your answer, then send when ready. Switch to keyboard anytime.'
                    : 'Type your answer below. You can switch back to the microphone if available.'}
                </p>
              </div>
            </Card>

            <Card spotlight padding="none" className="bg-[var(--bg-1)] border border-[var(--border)]" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 210, padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <h4 style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: T.text1, textTransform: 'uppercase', margin: 0 }}>STAR Guideline Tip</h4>
                </div>
                <p style={{ fontSize: 11.5, color: T.text2, lineHeight: 1.5, margin: 0 }}>
                  Be structured. State the Situation and Task before walking through your actions.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                <span style={{ color: T.text3, textTransform: 'uppercase' }}>Input</span>
                <span style={{ color: T.green, backgroundColor: 'rgba(34,197,94,0.08)', padding: '2px 6px', borderRadius: 4 }}>
                  {answerMode === 'voice' ? 'Microphone' : 'Keyboard'}
                </span>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
