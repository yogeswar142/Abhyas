export type InterviewType = 'behavioral' | 'system-design' | 'technical' | 'product' | 'custom';
export type Difficulty = 'easy' | 'medium' | 'hard';
export interface InterviewPromptInput {
    interviewType: InterviewType | string;
    role: string;
    company: string;
    difficulty: Difficulty | string;
}
/** Short system prompt that keeps local models from rambling. */
export declare function buildInterviewerSystemPrompt(input: InterviewPromptInput): string;
/** Generation options tuned for small local models (Qwen 3B–4B class). */
export declare function defaultGenerationOptions(difficulty?: string): Record<string, number>;
export interface TurnScores {
    clarity: number;
    structure: number;
    confidence: number;
    depth: number;
}
/** Tiny per-turn eval — one Q+A only, JSON only. */
export declare function buildTurnScorePrompt(question: string, answer: string, interviewType: string): {
    system: string;
    user: string;
    options: Record<string, number>;
};
export declare function parseTurnScores(raw: string): TurnScores | null;
export declare function averageTurnScores(turns: TurnScores[]): TurnScores;
export declare function pickClosingPreset(avgOverall: number): string;
/** One short performance sentence — not a full report. */
export declare function buildClosingBlurbPrompt(input: {
    role: string;
    company: string;
    lastAnswer: string;
    avgOverall: number;
}): {
    system: string;
    user: string;
    options: Record<string, number>;
};
