'use client'

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

export default function CallbackPage() {
  return <AuthenticateWithRedirectCallback />
}
