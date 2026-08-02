-- Add score columns and feedback to interviews table
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS score_clarity INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_structure INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_confidence INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_depth INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_overall NUMERIC DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS questions_asked INT DEFAULT 0;
