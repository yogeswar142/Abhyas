# Supabase Setup for Abhyas

## 1. Create a Supabase project
Go to https://supabase.com and create a new project.

## 2. Get your credentials
In your project dashboard: Settings → API → copy:
- Project URL
- anon public key

## 3. Create `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 4. Disable email confirmation (for development)
Supabase Dashboard → Authentication → Providers → Email:
- Toggle OFF "Confirm email"

This lets users log in immediately after registration without email verification.

## 5. Run the app
```bash
npm run dev
```

Users can now register and log in at `/register` and `/login`.

## Later: Adding Google OAuth
The AuthContext is designed for this. Add to AuthContext:
```ts
const signInWithGoogle = useCallback(async () => {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
  return { error: error?.message ?? null }
}, [supabase])
```
Then add it to the AuthContextValue interface and use it in login/register pages.
