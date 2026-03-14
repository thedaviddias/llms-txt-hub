import { opServer } from '@thedaviddias/analytics/server'
import { waitUntil } from '@vercel/functions'

/**
 * Track a server-side event with OpenPanel.
 * Uses Vercel's waitUntil to avoid blocking the response in serverless functions.
 * Silently no-ops outside production.
 */
export function trackServerEvent(event: string, properties?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') return
  waitUntil(opServer.track(event, properties ?? {}))
}
