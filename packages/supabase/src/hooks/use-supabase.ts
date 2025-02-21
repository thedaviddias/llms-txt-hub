import { useMemo } from 'react'

import { createBrowserClient } from '../browser-client'
import type { Database } from '../types/database.types'

export function useSupabase<Db = Database>() {
  return useMemo(() => createBrowserClient<Db>(), [])
}
