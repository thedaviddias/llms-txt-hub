import 'server-only'

import { OpenPanel } from '@openpanel/sdk'

const OPENPANEL_API_URL = 'https://stats.daviddias.digital/api'

export const opServer = new OpenPanel({
  apiUrl: OPENPANEL_API_URL,
  clientId: process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID ?? '',
  clientSecret: process.env.OPENPANEL_CLIENT_SECRET ?? ''
})
