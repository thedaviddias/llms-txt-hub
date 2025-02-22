'use server'

import 'server-only'
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { keys } from '@thedaviddias/supabase/keys'
import { cookies } from 'next/headers'

export async function auth() {
  if (!keys().url || !keys().anonKey) {
    return null
  }

  const supabase = createServerClient(keys().url, keys().anonKey, {
    cookies: {
      async get(name: string) {
        const cookieStore = await cookies()
        return cookieStore.get(name)?.value
      },
    },
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
}

export async function currentUser(): Promise<User | null> {
  const session = await auth()
  return session?.user ?? null
}
