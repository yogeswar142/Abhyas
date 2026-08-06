export type InterviewType =
  | 'behavioral'
  | 'system-design'
  | 'technical'
  | 'product'
  | 'custom';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface InterviewPromptInput {
  interviewType: InterviewType | string;
  role: string;
  company: string;
  difficulty: Difficulty | string;
  jobDescription?: string;
}

export interface TurnScores {
  clarity: number;
  structure: number;
  confidence: number;
  depth: number;
}

export interface TurnScoresWithReasoning extends TurnScores {
  reasoning?: string;
}

export interface EvaluationReport {
  scores: {
    clarity: number;
    structure: number;
    confidence: number;
    depth: number;
    communication: number;
    technical_accuracy: number;
  };
  strengths: string[];
  improvements: string[];
  standout_moment: string;
  critical_miss: string;
  overall_verdict: 'Strong Hire' | 'Hire' | 'No Hire' | 'Strong No Hire';
  summary: string;
}

// ---------------------------------------------------------------------------
// Company calibration
// ---------------------------------------------------------------------------
const COMPANY_CALIBRATION: Record<string, string> = {
  Google:
    'Google sets an exceptionally high bar. Expect candidates to demonstrate ownership, handle ambiguity at scale, and show Googleyness. Generic textbook answers score 60–70. Only answers with concrete metrics, genuine personal insight, and sophisticated trade-off reasoning score 85+.',
  Meta:
    'Meta values speed, impact, and concrete metrics above all. Look for "move fast" mindset, explicit impact numbers, and direct communication. Hedging or over-qualifying language lowers confidence scores.',
  Amazon:
    'Amazon interviews are LP-heavy. Evaluate explicitly against Leadership Principles: Customer Obsession, Ownership, Bias for Action, Dive Deep. Answers without a clear LP alignment score lower on structure.',
  Microsoft:
    'Microsoft values growth mindset, inclusive collaboration, and clarity of thinking. Look for self-awareness, learning from failure, and cross-functional empathy.',
  Stripe:
    'Stripe values rigorous thinking, user empathy, and systems mastery. Expect precision in technical answers and clear user-centric reasoning in product decisions.',
  default:
    'Standard tier-1 tech company calibration. Answers should be clear, structured, and substantiated with real examples.',
};

function getCompanyCalibration(company: string): string {
  for (const key of Object.keys(COMPANY_CALIBRATION)) {
    if (key !== 'default' && company.toLowerCase().includes(key.toLowerCase())) {
      return COMPANY_CALIBRATION[key];
    }
  }
  return COMPANY_CALIBRATION.default;
}

// ---------------------------------------------------------------------------
// Interviewer system prompt
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Interviewer system prompt
// ---------------------------------------------------------------------------
const TYPE_FOCUS: Record<string, string> = {
  behavioral: `You are a seasoned, direct hiring manager conducting a behavioral interview. You speak naturally, starting with conversational acknowledgments (e.g., "Got it," "That makes sense," "Interesting perspective.") rather than rigid templates.
Focus on: ownership, conflict resolution, technical leadership, scaling issues, handling failure, and stress under pressure.

Interrogation guidelines:
- Begin topics with comfortable, moderate-length baseline questions. 
- As topics develop, probe sharply with short, targeted follow-ups to catch candidate off-guard.
- When transitioning to a new topic, do not announce it explicitly. Pivot unexpectedly but keep it within the bounds of this behavioral role (e.g., shifting suddenly from team conflict to a situation of personal technical failure).`,

  'system-design': `You are a senior principal architect running a system design round. You are supportive but hold a high bar. You speak like a real engineer co-designing a whiteboard solution.
Opening questions should be broad (e.g., "Let's build a real-time notification engine for 100M users."). Keep it simple to start.
Once the candidate outlines their architecture, pivot sharply to edge cases or failure modes without warning:
- "What happens when our primary message queue is partition-isolated? Walk me through the replication lag recovery."
- "You're scaling the read path 10x overnight. How do you handle cache hotkeys?"
Keep the transitions direct and demanding to simulate real system-design pressure.`,

  technical: `You are a staff engineer debug-probing. You focus on actual production incidents, design decisions, APIs, and real-world system failures — not textbook definitions.
Speak conversationally, but maintain a high bar of technical precision.
Ask moderate-length scenario questions. Once the candidate explains their solution, introduce an unexpected constraint or failure:
- "Okay, but what if your database connection pool is completely saturated and you can't add replica nodes?"
- "Let's say a dependency goes down. How does your fallback pattern degrade gracefully without cascading failures?"`,

  product: `You are a lead product manager. Focus on prioritization, metric decay, trade-offs, and target audience empathy.
Your questions should sound conversational and pragmatic. Avoid using academic PM jargon exclusively.
Start with a general product task, then suddenly introduce a business constraint (e.g., "Our DAU drops 15% immediately after launch because the engineering team missed a key dependency. How do you prioritize resolving this under stakeholder fire?").`,

  custom: `You are an experienced interviewer conducting a realistic mock simulation. Your tone is conversational, human, and professional.
Do not read off a script. Listen to the candidate's last answer, acknowledge a key point naturally, then ask a question that continues or pivots to a related sub-topic to keep the candidate on their toes.`,
};

const DIFFICULTY_HINT: Record<string, string> = {
  easy:
    'Provide conversational encouragement and clear guidance. Keep questions accessible, and follow up gently.',
  medium:
    'Maintain a professional, conversational tone. Probe once or twice when answers lack specifics. Pivot topics naturally but unexpectedly.',
  hard:
    'Create a high-pressure, realistic simulation. Challenge vague answers immediately with short, direct follow-ups. Transition between sub-topics abruptly to test adaptation. Maintain an objective, slightly critical stance to simulate real-life interview tension.',
};

/**
 * Build the interviewer system prompt — rich, conversational, realistic, and calibrated
 * to simulate authentic interview environments.
 */
export function buildInterviewerSystemPrompt(input: InterviewPromptInput): string {
  const type = input.interviewType in TYPE_FOCUS ? input.interviewType : 'custom';
  const difficulty = input.difficulty in DIFFICULTY_HINT ? input.difficulty : 'medium';
  const role = input.role?.trim() || 'Software Engineer';
  const company = input.company?.trim() || 'a tech company';
  const jdText = input.jobDescription?.trim()
    ? `TARGET JOB DESCRIPTION:\n${input.jobDescription.slice(0, 1500)}\n(Tailor your technical questions, domain terms, and expectations specifically to this Job Description).`
    : '';

  return [
    `You are a professional human interviewer conducting a ${difficulty}-difficulty ${type} mock interview.`,
    `Candidate is applying for: ${role} at ${company}.`,
    jdText,
    '',
    TYPE_FOCUS[type],
    '',
    DIFFICULTY_HINT[difficulty],
    '',
    'STRICT INTERVIEWER RULES:',
    '- BREVITY & PRECISE QUESTIONS: Keep your entire reply VERY SHORT (1-2 sentences total, max 25-40 words). Never write long lectures or multi-part paragraphs.',
    '- ADAPTIVE DEEP-DIVE PROBING: Read the candidate\'s actual answer carefully.',
    '  * If they mention a specific technical detail, trade-off, architecture, or scenario, ask a sharp follow-up question to PROBE DEEPER into that specific point.',
    '  * If their answer was thorough and solid, pivot smoothly to the next core topic or scenario for this role.',
    '- Speak conversationally like an elite human interviewer (e.g., "Makes sense.", "Got it.", "Interesting point.").',
    '- Ask EXACTLY ONE question per response. Never bundle multiple questions together.',
    '- If this is the start of the session, greet the candidate in 1 short sentence and ask your first question immediately.',
  ].filter(Boolean).join('\n');
}

// ---------------------------------------------------------------------------
// Generation options — tuned for small local models (3B–8B class)
// ---------------------------------------------------------------------------
export function defaultGenerationOptions(difficulty: string = 'medium'): Record<string, number> {
  const hard = difficulty === 'hard';
  return {
    temperature: hard ? 0.5 : 0.4,
    top_p: 0.9,
    num_predict: 85,
    repeat_penalty: 1.15,
  };
}

// ---------------------------------------------------------------------------
// Per-turn scoring
// ---------------------------------------------------------------------------

export function buildTurnScorePrompt(
  question: string,
  answer: string,
  interviewType: string,
  opts?: {
    role?: string;
    company?: string;
    difficulty?: string;
    turnIndex?: number;
  }
): {
  system: string;
  user: string;
  options: Record<string, number>;
} {
  const role = opts?.role || 'Software Engineer';
  const company = opts?.company || 'a tech company';
  const difficulty = opts?.difficulty || 'medium';
  const turnIndex = opts?.turnIndex ?? 1;
  const calibration = getCompanyCalibration(company);

  const system = [
    `You are an expert ${interviewType} interview evaluator for ${difficulty}-level ${role} positions at top tech companies.`,
    '',
    'Score the candidate answer on 4 dimensions. Return ONLY valid JSON with no markdown, no explanation outside the JSON.',
    '',
    'SCORING RUBRIC:',
    '',
    'clarity (0–100): Is the answer easy to understand? Are ideas expressed precisely without filler?',
    'structure (0–100): Logical flow and organization appropriate to the interview type.',
    'confidence (0–100): Does the candidate sound certain, decisive, and ownership-driven?',
    'depth (0–100): Does the answer go beyond surface level? Are concrete specifics, examples, or technical nuance present?',
    '',
    `CALIBRATION FOR ${company.toUpperCase()}:`,
    calibration,
    '',
    'JSON SCHEMA (no markdown, return ONLY this):',
    '{"clarity":0-100,"structure":0-100,"confidence":0-100,"depth":0-100,"reasoning":"1 concise sentence explaining the scores"}',
  ].join('\n');

  const user = [
    `Interview context: ${interviewType} interview (${difficulty} difficulty) for ${role} at ${company}`,
    `Turn: ${turnIndex}`,
    '',
    `Question asked: ${question.slice(0, 600)}`,
    '',
    `Candidate's answer: ${answer.slice(0, 1000)}`,
    '',
    'Score this answer using the rubric. Be honest and calibrated.',
  ].join('\n');

  return {
    system,
    user,
    options: {
      temperature: 0.15,
      top_p: 0.85,
      num_predict: 120,
      repeat_penalty: 1.1,
    },
  };
}

export function parseTurnScores(raw: string): TurnScoresWithReasoning | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as Record<string, unknown>;
    const clamp = (n: unknown) => {
      const v = typeof n === 'number' ? n : Number(n);
      if (!Number.isFinite(v)) return null;
      return Math.max(0, Math.min(100, Math.round(v)));
    };
    const clarity = clamp(obj.clarity);
    const structure = clamp(obj.structure);
    const confidence = clamp(obj.confidence);
    const depth = clamp(obj.depth);
    if (clarity == null || structure == null || confidence == null || depth == null) return null;
    const reasoning = typeof obj.reasoning === 'string' ? obj.reasoning : undefined;
    return { clarity, structure, confidence, depth, reasoning };
  } catch {
    return null;
  }
}

export function averageTurnScores(turns: TurnScores[]): TurnScores {
  if (turns.length === 0) {
    return { clarity: 72, structure: 72, confidence: 72, depth: 72 };
  }
  const sum = turns.reduce(
    (a, t) => ({
      clarity: a.clarity + t.clarity,
      structure: a.structure + t.structure,
      confidence: a.confidence + t.confidence,
      depth: a.depth + t.depth,
    }),
    { clarity: 0, structure: 0, confidence: 0, depth: 0 }
  );
  const n = turns.length;
  return {
    clarity: Math.round(sum.clarity / n),
    structure: Math.round(sum.structure / n),
    confidence: Math.round(sum.confidence / n),
    depth: Math.round(sum.depth / n),
  };
}

const CLOSING_PRESETS = {
  strong: [
    'Thanks for your time — that was a genuinely strong interview.',
    'Appreciate the thoughtful answers. You demonstrated clear ownership and depth.',
    'Good session. You communicated with confidence and backed your points with specifics.',
  ],
  mixed: [
    'Thanks for walking through those answers with me.',
    'Appreciate your time — there were strong moments, and a few areas worth tightening.',
    'Good effort today. A bit more structure and specifics would take this to the next level.',
  ],
  weak: [
    'Thanks for your time today. There are clear areas to focus on before your next interview.',
    'Appreciate you working through the questions — depth and structure need more practice.',
    'Thanks for the session. Focus on concrete examples with measurable outcomes going forward.',
  ],
} as const;

export function pickClosingPreset(avgOverall: number): string {
  const bucket = avgOverall >= 82 ? 'strong' : avgOverall >= 70 ? 'mixed' : 'weak';
  const list = CLOSING_PRESETS[bucket];
  return list[Math.floor(Math.random() * list.length)];
}

export function buildClosingBlurbPrompt(input: {
  role: string;
  company: string;
  lastAnswer: string;
  avgOverall: number;
}): { system: string; user: string; options: Record<string, number> } {
  return {
    system: [
      'You are wrapping up a mock interview as the professional human interviewer.',
      'Write ONE honest sentence (max 20 words) about the candidate\'s overall performance.',
    ].join(' '),
    user: [
      `Role: ${input.role} at ${input.company}.`,
      `Overall performance level: ${input.avgOverall}/100.`,
      `Last answer excerpt: ${input.lastAnswer.slice(0, 350)}`,
    ].join('\n'),
    options: { temperature: 0.5, top_p: 0.9, num_predict: 50, repeat_penalty: 1.1 },
  };
}
