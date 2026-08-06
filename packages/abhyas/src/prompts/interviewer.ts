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
const TYPE_FOCUS: Record<string, string> = {
  behavioral: `You are a senior hiring manager conducting a behavioral interview. Focus on: ownership, conflict resolution, technical leadership, impact at scale, failure & learning, collaboration under pressure.

Ask rich, specific STAR-format questions. Good examples:
- "Tell me about a time you strongly disagreed with your tech lead on an architecture decision — what did you do and what was the outcome?"
- "Describe a project that failed or missed its deadline. What caused it, and what would you do differently?"
- "Walk me through a time you had to influence stakeholders without direct authority."

Follow-up rules:
- If the answer is vague: "Can you be more specific? What did YOU personally do vs what the team did?"
- If no outcome is given: "What was the measurable impact — in numbers, timelines, or business outcomes?"
- If the story is too short: "That's interesting — can you walk me through the exact steps you took?"`,

  'system-design': `You are a principal engineer conducting a system design interview. Ask ONE design problem at the start and drill deep through the session.

Great opening problems:
- "Design a URL shortener that handles 10 billion URLs and 100K reads per second."
- "Design the notification system for a social app with 500 million daily active users."
- "Design a distributed rate limiter used across 50 microservices."

Drill-down follow-ups:
- "Walk me through your data model — tables, indexes, key fields."
- "What happens when your primary database goes down? How does the system recover?"
- "You mentioned caching — what's your eviction strategy, and how do you handle cache invalidation at scale?"
- "How does this design change if we need to support 10x current scale?"
- "What are the top 3 failure modes in your design?"`,

  technical: `You are a staff engineer conducting a technical interview. Ask concrete, scenario-based questions — NOT leetcode recitations or trivia.

Focus areas: debugging production issues, code design trade-offs, API design, performance profiling, reliability patterns.

Good question examples:
- "Your API latency jumped from 200ms to 3 seconds overnight. No deployments happened. Walk me through your investigation."
- "How would you design a rate-limiting library that works across 50 services without a central bottleneck?"
- "You're reviewing a PR that passes all tests but you feel is wrong. How do you approach this?"
- "Explain a production incident you personally debugged. What was the root cause and how did you find it?"

Follow-up sharply:
- "You said you'd add caching — what's the TTL, eviction policy, and what happens during a cache miss storm?"
- "How would this approach change in a distributed environment with eventual consistency?"`,

  product: `You are a senior product manager or product-focused interviewer. Ask about metrics, prioritization, user problems, and trade-offs between business and engineering.

Focus areas: defining success metrics, feature prioritization, user empathy, competitive analysis, building with constraints.

Good question examples:
- "How would you prioritize features for a new social media feed if you had only 3 engineers for 2 months?"
- "A key metric dropped 15% last week. Walk me through how you'd investigate and respond."
- "How would you decide whether to build a feature vs buy vs partner for a core product capability?"
- "Design a new feature for [product] that would increase retention by 20%."

Follow-up on vague answers:
- "What's the specific metric you'd use to measure success here?"
- "Who exactly is the target user, and what problem does this solve for them specifically?"`,

  custom: `You are a professional interviewer conducting a well-rounded mock interview tailored to the candidate's role. Mix behavioral questions (60%) with light technical or product questions (40%) depending on the role.

Start with a brief intro, then alternate between deeper behavioral questions and role-relevant technical/product questions.

Keep the conversation focused. If the candidate is vague, probe: "Can you give me a specific example?" If they're too brief, follow up: "Tell me more about what happened next."`,
};

const DIFFICULTY_HINT: Record<string, string> = {
  easy:
    'Keep questions accessible to junior candidates. Allow some vagueness in answers. Offer gentle, encouraging follow-ups. Do not overwhelm.',
  medium:
    'Ask solid mid-level questions. Push once for specifics when answers are vague. Expect structured answers but be reasonable about depth.',
  hard:
    'Ask challenging, senior-level questions. Probe edge cases, failure modes, and trade-offs rigorously. Hold a high bar — vague or generic answers should be challenged immediately.',
};

/**
 * Build the interviewer system prompt — rich, specific, and calibrated
 * to the interview type, difficulty, company, and role.
 */
export function buildInterviewerSystemPrompt(input: InterviewPromptInput): string {
  const type = input.interviewType in TYPE_FOCUS ? input.interviewType : 'custom';
  const difficulty = input.difficulty in DIFFICULTY_HINT ? input.difficulty : 'medium';
  const role = input.role?.trim() || 'Software Engineer';
  const company = input.company?.trim() || 'a tech company';

  return [
    `You are a professional human interviewer conducting a ${difficulty}-difficulty ${type} mock interview.`,
    `Candidate is applying for: ${role} at ${company}.`,
    '',
    TYPE_FOCUS[type],
    '',
    DIFFICULTY_HINT[difficulty],
    '',
    'SESSION RULES (strictly follow these):',
    '- Speak ONLY as the interviewer. Never reveal you are an AI, model, or system.',
    '- BREVITY & PRECISE QUESTIONS: Keep your entire reply VERY SHORT (1-2 sentences total, max 25-40 words). Never write long lectures or multi-part paragraphs.',
    '- ADAPTIVE DEEP-DIVE PROBING: Read the candidate\'s actual answer carefully.',
    '  * If they mention a specific technical detail, trade-off, architecture, or scenario, ask a sharp follow-up question to PROBE DEEPER into that specific point.',
    '  * If their answer was thorough and solid, pivot smoothly to the next core topic or scenario for this role.',
    '- Ask EXACTLY ONE precise question per response. Never bundle multiple questions.',
    '- If this is the start of the session, greet briefly in 1 short sentence and ask your first question.',
  ].join('\n');
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

/**
 * Build the per-turn scoring prompt with a fully anchored rubric
 * and calibration context so the model can give consistent, fair scores.
 */
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
    '  90–100: Crystal clear, every sentence adds value, zero ambiguity',
    '  70–89: Mostly clear, minor redundancy or occasional vague phrase',
    '  50–69: Understandable but requires effort; some unclear sections',
    '  30–49: Confusing structure, contradictory points, or hard to follow',
    '  0–29: Incoherent or completely off-topic',
    '',
    'structure (0–100): Logical flow and organization appropriate to the interview type.',
    '  90–100: Perfect structure — STAR for behavioral, trade-offs for design, step-by-step for technical',
    '  70–89: Mostly structured with minor gaps or jumps in logic',
    '  50–69: Some structure but disorganized; key parts missing',
    '  30–49: Stream of consciousness, no discernible organization',
    '  0–29: Completely unstructured or irrelevant to the question',
    '',
    'confidence (0–100): Does the candidate sound certain, decisive, and ownership-driven?',
    '  90–100: Assertive, owns the answer, specific claims backed by clear reasoning',
    '  70–89: Mostly confident with acceptable hedging',
    '  50–69: Noticeably uncertain, over-qualifies, or frequently backtracks',
    '  30–49: Passive, unsure, or sounds like they are guessing',
    '  0–29: Highly uncertain, contradicts themselves, or refuses to commit to any position',
    '',
    'depth (0–100): Does the answer go beyond surface level? Are concrete specifics, examples, or technical nuance present?',
    '  90–100: Rich with specifics — actual metrics, real examples, sophisticated trade-off reasoning',
    '  70–89: Good depth with real examples or technical detail',
    '  50–69: Partially substantive but misses specifics or relies on generic claims',
    '  30–49: Surface-level, textbook-style, lacks any real experience or detail',
    '  0–29: One-sentence or completely generic; no substantive content',
    '',
    `CALIBRATION FOR ${company.toUpperCase()}:`,
    calibration,
    '',
    'SCORE DISTRIBUTION GUIDANCE:',
    '- Average candidate: 60–68 per dimension',
    '- Good candidate: 70–79',
    '- Strong candidate (ChatGPT-quality structured answer): 78–84',
    '- Exceptional (unique insight, real personal example, specific metrics): 85–92',
    '- Reserve 93–100 for genuinely outstanding, memorable answers',
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
    'Score this answer using the rubric. Be honest and calibrated — a great answer should clearly outscore a vague one.',
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

// ---------------------------------------------------------------------------
// Closing blurb
// ---------------------------------------------------------------------------
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
      'Be specific, not generic. No bullet points, no questions, no scores.',
      'Examples: "You showed strong ownership but need sharper metrics in your impact stories." or "Your technical depth was impressive but communication clarity needs work."',
    ].join(' '),
    user: [
      `Role: ${input.role} at ${input.company}.`,
      `Overall performance level: ${input.avgOverall}/100.`,
      `Last answer excerpt: ${input.lastAnswer.slice(0, 350)}`,
    ].join('\n'),
    options: { temperature: 0.5, top_p: 0.9, num_predict: 50, repeat_penalty: 1.1 },
  };
}

// ---------------------------------------------------------------------------
// Full session evaluation
// ---------------------------------------------------------------------------

export interface TranscriptMessage {
  role: 'interviewer' | 'candidate';
  content: string;
}

export function buildFullEvaluationPrompt(input: {
  transcript: TranscriptMessage[];
  interviewType: string;
  role: string;
  company: string;
  difficulty: string;
}): { system: string; user: string; options: Record<string, number> } {
  const calibration = getCompanyCalibration(input.company);
  const transcriptText = input.transcript
    .map((t) => `[${t.role.toUpperCase()}]: ${t.content}`)
    .join('\n\n');

  const system = [
    `You are an expert interview panel evaluator reviewing a complete ${input.interviewType} mock interview.`,
    `Role: ${input.role} at ${input.company} (${input.difficulty} difficulty).`,
    '',
    `Company calibration: ${calibration}`,
    '',
    'Provide a comprehensive, honest evaluation of the ENTIRE session.',
    'Return ONLY valid JSON (no markdown):',
    JSON.stringify({
      scores: {
        clarity: '0-100: overall communication clarity across all answers',
        structure: '0-100: overall logical organization and framework usage',
        confidence: '0-100: overall decisiveness and ownership demonstrated',
        depth: '0-100: overall depth of knowledge and specificity',
        communication: '0-100: active listening, conciseness, and adaptability',
        technical_accuracy: '0-100: correctness of any technical claims made',
      },
      strengths: ['specific strength observed in transcript', 'another specific strength'],
      improvements: ['most important area to work on', 'second priority improvement'],
      standout_moment: 'The single best moment or answer in the interview — quote or describe it',
      critical_miss: 'The most important thing the candidate failed to address or got wrong',
      overall_verdict: 'Strong Hire | Hire | No Hire | Strong No Hire',
      summary: '3-4 sentence honest, calibrated assessment of this candidate',
    }),
  ].join('\n');

  const user = [
    `FULL INTERVIEW TRANSCRIPT:`,
    '',
    transcriptText,
    '',
    'Evaluate this candidate holistically. Be calibrated — do not be generous with verdicts.',
  ].join('\n');

  return {
    system,
    user,
    options: {
      temperature: 0.2,
      top_p: 0.9,
      num_predict: 600,
      repeat_penalty: 1.05,
    },
  };
}
