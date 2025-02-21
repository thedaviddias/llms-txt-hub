import { AnalyticsProvider } from '@thedaviddias/analytics'
import { AuthProvider, type AuthProviderType } from '@thedaviddias/auth'
import { env } from '@thedaviddias/config-environment'
import { IS_DEVELOPMENT } from '@thedaviddias/utils/environment'
import { VercelToolbar } from '@vercel/toolbar/next'
import type { ThemeProviderProps } from 'next-themes'
import { Toaster } from './components/shadcn/sonner'
import { TooltipProvider } from './components/shadcn/tooltip'
import { ThemeProvider } from './providers/theme'

interface DesignSystemProviderProperties extends ThemeProviderProps {
  authProvider?: AuthProviderType
  plausibleDomain?: string
}

export const DesignSystemProvider = ({
  children,
  authProvider,
  plausibleDomain,
  ...properties
}: DesignSystemProviderProperties) => {
  // const content = authProvider ? (
  //   <AuthProvider provider={authProvider}>{children}</AuthProvider>
  // ) : (
  //   children
  // )

  return (
    <ThemeProvider {...properties}>
      <AnalyticsProvider plausibleDomain={plausibleDomain}>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        {IS_DEVELOPMENT && env.FLAGS_SECRET && <VercelToolbar />}
      </AnalyticsProvider>
    </ThemeProvider>
  )
}
