import { type CookieOptions, createServerClient as serverClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { keys } from './keys'

export const createMiddlewareClient = (request: NextRequest) => {
  const { url, anonKey } = keys()

  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = serverClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options })
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options })
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  return { supabase, response }
}
