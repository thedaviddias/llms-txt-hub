import 'server-only'

import { OpenPanel } from '@openpanel/sdk'

export const opServer = new OpenPanel({
  clientId: process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID ?? '',
  clientSecret: process.env.OPENPANEL_CLIENT_SECRET ?? ''
})
