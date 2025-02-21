'use client'

export { createBrowserClient } from '@supabase/ssr'
export type { SupabaseClient } from '@supabase/supabase-js'

export { useAuth } from './hooks/use-auth'
export { useUser } from './hooks/use-user'
