-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  sender VARCHAR(50) NOT NULL CHECK (sender IN ('interviewer', 'candidate')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grant privileges for Data API (REST) access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon, authenticated, service_role;

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages of own interviews" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages to own interviews" ON public.messages;

-- Policy to allow users to view messages for their own interviews (using exists check)
CREATE POLICY "Users can view messages of own interviews" ON public.messages
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews i
      WHERE i.id = messages.interview_id
        AND i.user_id = (SELECT auth.uid())
    )
  );

-- Policy to allow users to insert messages to their own interviews
CREATE POLICY "Users can insert messages to own interviews" ON public.messages
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interviews i
      WHERE i.id = messages.interview_id
        AND i.user_id = (SELECT auth.uid())
    )
  );

-- Create index on interview_id, created_at for fast retrieval
CREATE INDEX IF NOT EXISTS messages_interview_id_created_at_idx ON public.messages (interview_id, created_at ASC);
