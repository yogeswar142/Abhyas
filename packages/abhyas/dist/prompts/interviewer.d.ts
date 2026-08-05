export type InterviewType = 'behavioral' | 'system-design' | 'technical' | 'product' | 'custom';
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
/**
 * Build the interviewer system prompt — rich, specific, and calibrated
 * to the interview type, difficulty, company, and role.
 */
export declare function buildInterviewerSystemPrompt(input: InterviewPromptInput): string;
export declare function defaultGenerationOptions(difficulty?: string): Record<string, number>;
/**
 * Build the per-turn scoring prompt with a fully anchored rubric
 * and calibration context so the model can give consistent, fair scores.
 */
export declare function buildTurnScorePrompt(question: string, answer: string, interviewType: string, opts?: {
    role?: string;
    company?: string;
    difficulty?: string;
    turnIndex?: number;
}): {
    system: string;
    user: string;
    options: Record<string, number>;
};
export declare function parseTurnScores(raw: string): TurnScoresWithReasoning | null;
export declare function averageTurnScores(turns: TurnScores[]): TurnScores;
export declare function pickClosingPreset(avgOverall: number): string;
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
export interface TranscriptMessage {
    role: 'interviewer' | 'candidate';
    content: string;
}
export declare function buildFullEvaluationPrompt(input: {
    transcript: TranscriptMessage[];
    interviewType: string;
    role: string;
    company: string;
    difficulty: string;
}): {
    system: string;
    user: string;
    options: Record<string, number>;
};
