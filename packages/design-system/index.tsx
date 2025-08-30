import { AnalyticsProvider } from '@thedaviddias/analytics'
import { IS_DEVELOPMENT } from '@thedaviddias/utils/environment'
import { VercelToolbar } from '@vercel/toolbar/next'
import type { ThemeProviderProps } from 'next-themes'
import { Toaster } from './components/shadcn/sonner'
import { TooltipProvider } from './components/shadcn/tooltip'
import { ThemeProvider } from './providers/theme'

interface DesignSystemProviderProperties extends ThemeProviderProps {
  plausibleDomain: string
  monitoringSampleRate?: number
}

export const DesignSystemProvider = ({
  children,
  plausibleDomain,
  monitoringSampleRate,
  ...properties
}: DesignSystemProviderProperties) => {
  return (
    <ThemeProvider {...properties}>
      <AnalyticsProvider plausibleDomain={plausibleDomain}>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        {IS_DEVELOPMENT && <VercelToolbar />}
      </AnalyticsProvider>
    </ThemeProvider>
  )
}
