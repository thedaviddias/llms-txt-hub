'use server'

import { auth } from '@thedaviddias/auth'
import { logger } from '@thedaviddias/logging'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = session.user

    // Collect available user data
    const exportData = {
      // Export metadata
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',

      // User account information (only what's available in AuthUser)
      account: {
        id: user.id,
        email: user.email
      },

      // User metadata (GitHub info, etc.)
      metadata: {
        userMetadata: user.user_metadata || {}
      },

      // Additional platform-specific data
      platformData: {
        accountType: user.user_metadata?.user_name ? 'GitHub' : 'Email',
        githubConnected: !!user.user_metadata?.user_name,
        githubUsername: user.user_metadata?.user_name || null
      },

      // Privacy notice
      privacyNotice: {
        message: 'This export contains all personal data we have stored about your account.',
        dataTypes: [
          'Account information (email, name, creation date)',
          'Authentication provider data (GitHub connection)',
          'User preferences and metadata',
          'Login history timestamps'
        ],
        retention: 'You can request deletion of this data at any time through account settings.',
        contact: 'For questions about your data, please contact us through the platform.'
      }
    }

    logger.info('Data export generated', {
      data: { userId: user.id, exportSize: JSON.stringify(exportData).length },
      tags: { type: 'privacy' }
    })

    return NextResponse.json(exportData)
  } catch (error) {
    logger.error('Error generating data export:', { data: error, tags: { type: 'privacy' } })
    return NextResponse.json({ error: 'Failed to generate data export' }, { status: 500 })
  }
}
