'use client'

import { OpenPanelComponent } from '@openpanel/nextjs'

interface OpenPanelAnalyticsProps {
  clientId: string
  nonce?: string
}

/**
 * OpenPanel Analytics component that uses a proxy route to avoid ad blockers.
 *
 * @param props - Component properties
 * @param props.clientId - OpenPanel client ID from the dashboard
 * @param props.nonce - Optional CSP nonce
 * @returns OpenPanelComponent configured with proxy URLs and global properties, or null if no clientId
 */
export const OpenPanelAnalyticsComponent = ({ clientId, nonce }: OpenPanelAnalyticsProps) => {
  if (!clientId) {
    return null
  }

  return (
    <OpenPanelComponent
      clientId={clientId}
      trackScreenViews={true}
      trackOutgoingLinks={true}
      trackAttributes={true}
      apiUrl="/api/op"
      scriptUrl="/api/op/op1.js"
      globalProperties={{
        environment: process.env.NODE_ENV ?? 'development'
      }}
    />
  )
}
