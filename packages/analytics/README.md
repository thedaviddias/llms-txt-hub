# @thedaviddias/analytics

Analytics package powered by **OpenPanel**. Drop the provider into your Next.js layout to get pageviews, outbound link tracking, tagged events, and user identification out of the box.

## Exports

| Import path                                            | Description                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `@thedaviddias/analytics`                              | `AnalyticsProvider` — renders OpenPanel script tags                      |
| `@thedaviddias/analytics/head`                         | `AnalyticsHead` — thin wrapper for use inside `<head>`                   |
| `@thedaviddias/analytics/server`                       | `opServer` — server-side OpenPanel SDK singleton                         |
| `@thedaviddias/analytics/providers/openpanel-identify` | `OpenPanelIdentify` — client component that syncs auth user to OpenPanel |

## Environment variables

| Variable                          | Required                      | Scope           | Description                                                     |
| --------------------------------- | ----------------------------- | --------------- | --------------------------------------------------------------- |
| `NEXT_PUBLIC_OPENPANEL_CLIENT_ID` | Yes (for OpenPanel)           | Client + Server | OpenPanel client ID from [openpanel.dev](https://openpanel.dev) |
| `OPENPANEL_CLIENT_SECRET`         | Only for server-side tracking | Server only     | OpenPanel client secret (never expose to the browser)           |

Both variables must be added to `turbo.json` → `tasks.build.env` so Turborepo invalidates the build cache when they change.

## Setup

### 1. Install the package

```bash
pnpm add @thedaviddias/analytics
```

### 2. Add the provider to your root layout

Place `AnalyticsHead` inside `<head>` and `OpenPanelIdentify` inside `<body>` (within your auth provider tree):

```tsx
// app/layout.tsx
import { AnalyticsHead } from '@thedaviddias/analytics/head'
import { OpenPanelIdentify } from '@thedaviddias/analytics/providers/openpanel-identify'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <AnalyticsHead
          openPanelClientId={process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID}
          nonce={nonce}
        />
      </head>
      <body>
        {/* Must be inside your auth provider (e.g. ClerkProvider) */}
        <OpenPanelIdentify />
        {children}
      </body>
    </html>
  )
}
```

### 3. Create the OpenPanel proxy route

Create `app/api/op/[...path]/route.ts` to proxy analytics requests through your own domain (avoids ad blockers):

```ts
import { createRouteHandler } from '@openpanel/nextjs/server'

export const { GET, POST } = createRouteHandler()
```

### 4. Update proxy

Add these to your `proxy.ts`:

- **Public routes**: Add `'/api/op/(.*)'` so the proxy is accessible without auth.
- **CSP script-src**: Add `https://openpanel.dev` as a fallback origin.
- **Rate-limit skip**: Exclude `/api/op/` paths from rate limiting.

### 5. Add environment variables to turbo.json

```jsonc
// turbo.json → tasks.build.env
"NEXT_PUBLIC_OPENPANEL_CLIENT_ID",
"OPENPANEL_CLIENT_SECRET",
```

## Client-side event tracking

```ts
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'

trackEvent(ANALYTICS_EVENTS.WEBSITE_CLICK, {
  website_name: 'Example',
  content_slug: 'example-llms-txt'
})
```

OpenPanel events are only sent in production (`NODE_ENV === 'production'`).

## Server-side event tracking

For API routes and server actions, use the `trackServerEvent` helper with Vercel's `waitUntil`:

```ts
// lib/openpanel-server.ts
import { waitUntil } from '@vercel/functions'
import { opServer } from '@thedaviddias/analytics/server'

export function trackServerEvent(event: string, properties?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') return
  waitUntil(opServer.track(event, properties ?? {}))
}
```

This requires `@vercel/functions` installed in your app and `OPENPANEL_CLIENT_SECRET` set.

## User identification

`OpenPanelIdentify` automatically syncs the authenticated user to OpenPanel using your auth provider's `useAuth()` hook. When a user signs in, it calls `window.op.identify()` with their profile ID, name, and email. On sign-out it calls `window.op.clear()`.

This component must be rendered inside your auth provider tree (e.g. inside `ClerkProvider`).

## How it works

```
AnalyticsHead
  └─ AnalyticsProvider
       └─ OpenPanelAnalyticsComponent  → loads op1.js via /api/op proxy
            └─ globalProperties: { environment }

OpenPanelIdentify (body)
  └─ useAuth() → window.op.identify() / window.op.clear()

trackEvent() (client)
  └─ window.op.track(event, props)  [production only]

opServer.track() (server)
  └─ OpenPanel SDK → direct API call with clientSecret
```

## Production guards

OpenPanel tracking is gated behind `process.env.NODE_ENV === 'production'` in three places:

1. **Component rendering** — `AnalyticsProvider` only renders `OpenPanelAnalyticsComponent` in production.
2. **Client-side tracking** — `trackEvent()` and `AnalyticsLink` skip `window.op.track()` in non-production.
3. **Server-side tracking** — `trackServerEvent()` returns early in non-production.
