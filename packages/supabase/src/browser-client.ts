import { createBrowserClient as createBrowserClientSSR } from '@supabase/ssr'

import { keys } from './keys'
import type { Database } from './types/database.types'

/**
 * Get a Supabase client for use in the Browser
 *
 * @returns Supabase client
 */
export function createBrowserClient<GenericSchema = Database>() {
  const { url, anonKey } = keys()

  return createBrowserClientSSR<GenericSchema>(url, anonKey)
}
