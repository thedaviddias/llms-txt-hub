# @thedaviddias/analytics

Analytics integration package that supports Plausible Analytics.

## Usage

Wrap the application with the `AnalyticsProvider`:

```tsx
import { AnalyticsProvider } from '@thedaviddias/analytics';

export default function App({ children }) {
  return (
    <AnalyticsProvider plausibleDomain="your-domain.com">
      {children}
    </AnalyticsProvider>
  );
}
```
