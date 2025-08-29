import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // For now, just return a success response to prevent the 405 error
    // This will allow the client-side authentication to work
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Sign-in failed' }, { status: 500 })
  }
}
