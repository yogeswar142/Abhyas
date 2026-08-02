-- Create interviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL,
  company VARCHAR(100) NOT NULL,
  difficulty VARCHAR(50) NOT NULL,
  duration INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grant access to anon and authenticated roles for Data API (REST)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO anon, authenticated, service_role;

-- Enable RLS
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to prevent errors
DROP POLICY IF EXISTS "Users can view own interviews" ON interviews;
DROP POLICY IF EXISTS "Users can insert own interviews" ON interviews;
DROP POLICY IF EXISTS "Users can update own interviews" ON interviews;
DROP POLICY IF EXISTS "Users can delete own interviews" ON interviews;

-- Create policies (optimized with subquery wrapper for auth.uid() as per gemini.md)
CREATE POLICY "Users can view own interviews" ON interviews
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own interviews" ON interviews
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own interviews" ON interviews
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own interviews" ON interviews
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Create composite index on user_id and created_at desc
CREATE INDEX IF NOT EXISTS interviews_user_id_created_at_idx ON interviews (user_id, created_at DESC);
