'use client'
 
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
 
interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  signUp: (email: string, password: string) => Promise<{ error: string | null; requiresConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
}
 
const AuthContext = createContext<AuthContextValue | null>(null)
 
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return null;

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        console.error('Error fetching profile from backend:', res.statusText);
        return null;
      }
      const data = await res.json();
      return data as Profile | null;
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      return null;
    }
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const prof = await fetchProfile(user.id)
    setProfile(prof)
  }, [user, fetchProfile])
 
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        const prof = await fetchProfile(currentUser.id)
        setProfile(prof)
      } else {
        setProfile(null)
      }
      setIsLoading(false)
    })
 
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (currentUser) {
          const prof = await fetchProfile(currentUser.id)
          setProfile(prof)
        } else {
          setProfile(null)
        }
        setIsLoading(false)
      }
    )
 
    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])
 
  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { 
      error: error?.message ?? null,
      requiresConfirmation: !data.session && !error,
    }
  }, [supabase])
 
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [supabase])
 
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [supabase])
 
  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    return { error: error?.message ?? null }
  }, [supabase])
 
  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      isLoading, 
      signUp, 
      signIn, 
      signOut, 
      signInWithGoogle,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}
 
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
