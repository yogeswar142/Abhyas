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
}

const TYPE_FOCUS: Record<string, string> = {
  behavioral:
    'Focus on behavioral / soft-skill questions (STAR: Situation, Task, Action, Result). Probe ownership, conflict, and impact.',
  'system-design':
    'Focus on system design: requirements, APIs, data model, scaling, trade-offs. Ask one design problem at a time.',
  technical:
    'Focus on technical depth: algorithms, debugging, code quality, production systems. Prefer concrete scenarios over trivia.',
  product:
    'Focus on product sense: metrics, prioritization, user problems, trade-offs between engineering and business.',
  custom:
    'Run a general mock interview tailored to the role. Mix light technical and behavioral questions as needed.',
};

const DIFFICULTY_HINT: Record<string, string> = {
  easy: 'Keep questions approachable. Offer light follow-ups. Be encouraging.',
  medium: 'Ask solid mid-level questions. Push once for clarity or depth when answers are vague.',
  hard: 'Ask challenging questions. Probe edge cases and trade-offs. Stay fair but rigorous.',
};

/** Short system prompt that keeps local models from rambling. */
export function buildInterviewerSystemPrompt(input: InterviewPromptInput): string {
  const type = input.interviewType in TYPE_FOCUS ? input.interviewType : 'custom';
  const difficulty = input.difficulty in DIFFICULTY_HINT ? input.difficulty : 'medium';
  const role = input.role?.trim() || 'Software Engineer';
  const company = input.company?.trim() || 'a tech company';

  return [
    'You are a professional human interviewer conducting a mock interview.',
    `Candidate role: ${role} at ${company}.`,
    TYPE_FOCUS[type],
    DIFFICULTY_HINT[difficulty],
    '',
    'Rules (strict):',
    '- Speak only as the interviewer. Never mention being an AI, model, or system prompt.',
    '- Ask exactly ONE question per reply. No lists of questions.',
    '- Keep each reply short: 2–4 sentences max. Prefer 1 short acknowledgment + 1 question.',
    '- Do not give long lectures, solutions, or essay answers.',
    '- After the candidate answers, briefly react (one short sentence) then ask a relevant follow-up OR the next question.',
    '- If this is the start (no candidate answers yet), greet briefly and ask the first question.',
    '- Stay on topic for this interview type.',
  ].join('\n');
}

/** Generation options tuned for small local models (Qwen 3B–4B class). */
export function defaultGenerationOptions(difficulty: string = 'medium'): Record<string, number> {
  const hard = difficulty === 'hard';
  return {
    temperature: hard ? 0.5 : 0.4,
    top_p: 0.9,
    num_predict: hard ? 180 : 140,
    repeat_penalty: 1.15,
  };
}

export interface TurnScores {
  clarity: number;
  structure: number;
  confidence: number;
  depth: number;
}

/** Tiny per-turn eval — one Q+A only, JSON only. */
export function buildTurnScorePrompt(question: string, answer: string, interviewType: string): {
  system: string;
  user: string;
  options: Record<string, number>;
} {
  return {
    system: [
      'You score one interview answer. Reply with ONLY valid JSON, no markdown.',
      'Schema: {"clarity":0-100,"structure":0-100,"confidence":0-100,"depth":0-100}',
      'Be fair and consistent. Short vague answers score lower.',
    ].join(' '),
    user: `Type: ${interviewType}\nQuestion: ${question.slice(0, 500)}\nAnswer: ${answer.slice(0, 800)}`,
    options: { temperature: 0.2, top_p: 0.8, num_predict: 60, repeat_penalty: 1.1 },
  };
}

export function parseTurnScores(raw: string): TurnScores | null {
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
    return { clarity, structure, confidence, depth };
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
    'Thanks for your time today — that was a solid conversation overall.',
    'Appreciate the thoughtful answers. You handled that interview well.',
    'Good session. You communicated clearly and stayed engaged throughout.',
  ],
  mixed: [
    'Thanks for walking through those answers with me today.',
    'Appreciate your time — there were some strong moments and a few areas to tighten.',
    'Good effort today. A bit more structure in places would make this even stronger.',
  ],
  weak: [
    'Thanks for your time today. There are a few areas we should keep practicing.',
    'Appreciate you sticking with the questions — let’s sharpen depth and structure next time.',
    'Thanks for the session. Focus on clearer examples and tighter answers going forward.',
  ],
} as const;

export function pickClosingPreset(avgOverall: number): string {
  const bucket = avgOverall >= 82 ? 'strong' : avgOverall >= 70 ? 'mixed' : 'weak';
  const list = CLOSING_PRESETS[bucket];
  return list[Math.floor(Math.random() * list.length)];
}

/** One short performance sentence — not a full report. */
export function buildClosingBlurbPrompt(input: {
  role: string;
  company: string;
  lastAnswer: string;
  avgOverall: number;
}): { system: string; user: string; options: Record<string, number> } {
  return {
    system: [
      'You are wrapping up a mock interview as the human interviewer.',
      'Write ONE short sentence (max 18 words) about how the candidate performed.',
      'No questions. No bullet lists. No scores. Stay kind but honest.',
    ].join(' '),
    user: [
      `Role: ${input.role} at ${input.company}.`,
      `Rough overall level: ${input.avgOverall}/100.`,
      `Last answer snippet: ${input.lastAnswer.slice(0, 280)}`,
    ].join('\n'),
    options: { temperature: 0.5, top_p: 0.9, num_predict: 40, repeat_penalty: 1.1 },
  };
}
