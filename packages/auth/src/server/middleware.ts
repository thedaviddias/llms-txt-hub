import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { keys } from '@thedaviddias/supabase/keys'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const hasSupabaseConfig = Boolean(keys().url && keys().anonKey)

  if (!hasSupabaseConfig) {
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(keys().url, keys().anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({
          name,
          value,
          ...options,
        })
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({
          name,
          value: '',
          ...options,
        })
      },
    },
  })

  await supabase.auth.getSession()

  return response
}
