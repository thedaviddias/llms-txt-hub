import { clerkMiddleware } from '@clerk/nextjs/server'
import type { NextMiddleware } from 'next/server'
import { NextResponse } from 'next/server'

export const authMiddleware = (handler?: NextMiddleware): NextMiddleware => {
  return async (request, event) => {
    const hasClerkConfig = Boolean(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    )

    if (!hasClerkConfig) {
      return handler ? handler(request, event) : NextResponse.next()
    }

    const clerkResponse = await clerkMiddleware(request, event)

    if (handler) {
      return handler(request, event)
    }

    return clerkResponse
  }
}
