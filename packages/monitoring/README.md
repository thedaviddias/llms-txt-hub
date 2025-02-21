# @thedaviddias/monitoring

Monitoring utilities for the monorepo, providing error tracking, performance monitoring, and observability features.

## Features

- **Error Tracking**: Capture and report errors across the application
- **Performance Monitoring**: Track API performance and application metrics
- **Multiple Providers**: Support for different monitoring providers (Sentry, Console)
- **React Integration**: Components and hooks for easy integration
- **Type Safety**: Full TypeScript support

## Structure

```
src/
├── api/              # API monitoring utilities
│   ├── components/   # Error boundary and providers
│   ├── hooks/        # React hooks for monitoring
│   └── services/     # Server-side monitoring services
├── core/             # Core monitoring functionality
│   └── services/     # Base monitoring services
└── sentry/          # Sentry integration
```

## Usage

### Error Tracking

```typescript
import { useCaptureException } from '@thedaviddias/monitoring'

function MyComponent() {
  useCaptureException(error)
}
```

### Error Boundary

```typescript
import { ErrorBoundary } from '@thedaviddias/monitoring'

function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <MyComponent />
    </ErrorBoundary>
  )
}
```

### Server-Side Monitoring

```typescript
import { getServerMonitoringService } from '@thedaviddias/monitoring'

async function handler() {
  const monitoring = await getServerMonitoringService()
  monitoring.captureException(error)
}
```

### Provider Setup

```typescript
import { MonitoringProvider } from '@thedaviddias/monitoring'

function App() {
  return (
    <MonitoringProvider>
      <MyApp />
    </MonitoringProvider>
  )
}
```

## Configuration

Set the monitoring provider in your environment variables:

```env
# Type-safe environment variable from @thedaviddias/config-environment
NEXT_PUBLIC_MONITORING_PROVIDER="sentry"
```

Available providers:
- `sentry`: Use Sentry for monitoring (type-safe, validated at build time)
- If not set, falls back to console logging

## Dependencies

- `@thedaviddias/config-environment`: For type-safe environment variables
- `@sentry/nextjs`: For Sentry integration
- `next`: For Next.js integration
- `react`: For React components and hooks
