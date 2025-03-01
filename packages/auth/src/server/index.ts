'use server'

import 'server-only'
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { keys } from '@thedaviddias/supabase/keys'
import { cookies } from 'next/headers'

export async function auth() {
  if (!keys().NEXT_PUBLIC_SUPABASE_URL || !keys().NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null
  }

  const supabase = createServerClient(
    keys().NEXT_PUBLIC_SUPABASE_URL,
    keys().NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies()
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get session for additional context if needed
  const {
    data: { session }
  } = await supabase.auth.getSession()

  return session
}

export async function currentUser(): Promise<User | null> {
  const session = await auth()
  return session?.user ?? null
}
