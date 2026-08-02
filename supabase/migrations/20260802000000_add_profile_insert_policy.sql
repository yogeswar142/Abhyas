-- Add insert policy for profiles to support upsert
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile" ON public.profiles
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);
