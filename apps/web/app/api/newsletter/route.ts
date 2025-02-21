import { env } from '@thedaviddias/config-environment'
import { logger } from '@thedaviddias/logging'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    const apiKey = env.MAILERLITE_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'Invalid configuration' },
        { status: 500 }
      )
    }

    await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      body: JSON.stringify({ email, groups: ['147152187794916958'] }),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`
      }
    })

    return NextResponse.json({ success: true, message: 'signed up' }, { status: 201 })
  } catch (error) {
    logger.error('Error signing up to newsletter')

    return NextResponse.json({ success: false, message: 'internal server error' }, { status: 500 })
  }
}
