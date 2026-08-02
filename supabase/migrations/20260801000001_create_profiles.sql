-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  avatar_initials VARCHAR(10),
  plan VARCHAR(50) DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'teams')),
  target_company VARCHAR(255),
  target_role VARCHAR(255),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grant privileges for Data API (REST) access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated, service_role;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to prevent errors
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create policies (optimized with subquery wrapper for auth.uid() as per gemini.md)
CREATE POLICY "Users can view own profile" ON public.profiles
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Function to handle new user signup and create a profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  initials VARCHAR(10);
BEGIN
  -- Extract initials from email (first two characters)
  initials := UPPER(SUBSTRING(NEW.email FROM 1 FOR 2));
  
  INSERT INTO public.profiles (id, name, avatar_initials, plan)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    initials,
    'starter'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke execution permissions from public to secure the SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Trigger to execute handle_new_user when a user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
