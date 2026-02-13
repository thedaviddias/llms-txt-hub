// News page temporarily disabled — redirect configured in next.config.ts
// Original code preserved in git history (see commit prior to this one).

import { redirect } from 'next/navigation'

/**
 * News page — currently redirects to homepage.
 */
export default function NewsPage() {
  redirect('/')
}
