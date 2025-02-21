"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase-client"

type AuthContextType = {
  user: User | null
  session: Session | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (typeof supabase.auth.onAuthStateChange === "function") {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      })

      return () => {
        if (authListener?.subscription?.unsubscribe) {
          authListener.subscription.unsubscribe()
        }
      }
    } else {
      console.warn("Auth state change listener is not available. Authentication features may not work properly.")
    }
  }, [])

  const signIn = async () => {
    if (typeof supabase.auth.signInWithOAuth === "function") {
      await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
    } else {
      console.warn("Sign in functionality is not available due to missing Supabase credentials.")
    }
  }

  const signOut = async () => {
    if (typeof supabase.auth.signOut === "function") {
      await supabase.auth.signOut()
    } else {
      console.warn("Sign out functionality is not available due to missing Supabase credentials.")
    }
  }

  const value = {
    user,
    session,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

