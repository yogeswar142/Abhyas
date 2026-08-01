import { User, Session } from '../types';

export const mockUser: User = {
  id: 'usr_1',
  name: 'Yogeswar',
  email: 'yogeswar@example.com',
  avatarInitials: 'Y',
  plan: 'pro',
  joinedAt: '2023-10-01T00:00:00Z',
  targetCompany: 'Google',
  targetRole: 'SWE'
};

export const mockSessions: Session[] = [
  {
    id: 'ses_1', type: 'system-design', company: 'Google', role: 'Senior SWE',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    duration: 45, status: 'completed', questionsAsked: 5,
    scores: { clarity: 85, structure: 90, confidence: 80, depth: 75, overall: 82.5 }
  },
  {
    id: 'ses_2', type: 'behavioral', company: 'Meta', role: 'SWE',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    duration: 30, status: 'completed', questionsAsked: 4,
    scores: { clarity: 95, structure: 85, confidence: 90, depth: 80, overall: 87.5 }
  },
  {
    id: 'ses_3', type: 'technical', company: 'Amazon', role: 'SDE II',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    duration: 60, status: 'completed', questionsAsked: 3,
    scores: { clarity: 70, structure: 65, confidence: 75, depth: 60, overall: 67.5 }
  },
  {
    id: 'ses_4', type: 'product', company: 'Stripe', role: 'Product Engineer',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1).toISOString(),
    duration: 45, status: 'scheduled', questionsAsked: 0,
    scores: { clarity: 0, structure: 0, confidence: 0, depth: 0, overall: 0 }
  }
];

export const mockStats = {
  offerRate: '89%',
  improvement: '3.2x',
  totalUsers: '97k+',
  sessionsThisWeek: 4,
  avgScore: 79,
  bestStreak: 12,
  totalHours: 24.5
};
