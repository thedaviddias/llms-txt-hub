import 'server-only'

import {
  auth as clerkAuth,
  currentUser as clerkUser
} from '@clerk/nextjs/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const auth = async () => {
  const hasClerkConfig = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const hasSupabaseConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)

  if (hasClerkConfig) {
    return clerkAuth()
  }

  if (hasSupabaseConfig) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          setAll(cookiesToSet) {
            try {
              for (const { name, value, options } of cookiesToSet) {
                cookieStore.set(name, value, options)
              }
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          }
        }
      }
    )
    const {
      data: { session }
    } = await supabase.auth.getSession()
    return session
  }

  return null
}

export const currentUser = async () => {
  const hasClerkConfig = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const hasSupabaseConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)

  if (hasClerkConfig) {
    return clerkUser()
  }

  if (hasSupabaseConfig) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          setAll(cookiesToSet) {
            try {
              for (const { name, value, options } of cookiesToSet) {
                cookieStore.set(name, value, options)
              }
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          }
        }
      }
    )
    const {
      data: { user }
    } = await supabase.auth.getUser()
    return user
  }

  return null
}
