import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export async function GET() {
  const { userId } = await auth()

  if (userId) {
    // User is already authenticated
    redirect('/')
  }

  // Redirect to Clerk's GitHub OAuth
  const githubOAuthUrl = `${process.env.CLERK_FRONTEND_API}/oauth/github/authorize`
  redirect(githubOAuthUrl)
}
