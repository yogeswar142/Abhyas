export type InterviewType = 'behavioral' | 'system-design' | 'technical' | 'product' | 'custom';
export type SessionStatus = 'completed' | 'in-progress' | 'scheduled';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  plan: 'starter' | 'pro' | 'teams';
  joinedAt: string;
  targetCompany?: string;
  targetRole?: string;
}

export interface Session {
  id: string;
  type: InterviewType;
  company: string;
  role: string;
  date: string;
  duration: number; // minutes
  status: SessionStatus;
  scores: {
    clarity: number;
    structure: number;
    confidence: number;
    depth: number;
    overall: number;
  };
  feedback?: string;
  questionsAsked: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  children?: NavItem[];
}

export interface StatCard {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  description?: string;
}
