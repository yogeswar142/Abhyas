import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  target_company: z.string().trim().max(100).nullable().optional(),
  target_role: z.string().trim().max(100).nullable().optional(),
  name: z.string().trim().max(100).nullable().optional(),
});

export const CreateInterviewSchema = z.object({
  type: z.enum(['behavioral', 'system-design', 'technical', 'product', 'custom']),
  company: z.string().trim().min(1).max(100),
  role: z.string().trim().min(1).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  duration: z.number().int().min(10).max(120),
});

export const CreateMessageSchema = z.object({
  sender: z.enum(['candidate', 'interviewer', 'system']),
  content: z.string().trim().min(1),
});
