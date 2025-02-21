import { env } from '@thedaviddias/config-environment'
import { z } from 'zod'

export const keys = () =>
  z
    .object({
      url: z.string().min(1),
      anonKey: z.string().min(1)
    })
    .parse({
      url: env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    })
