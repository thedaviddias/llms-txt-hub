import { cn } from '@thedaviddias/design-system/lib/utils'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'

export const fontSans = GeistSans
export const fontMono = GeistMono

export const fonts = cn(
  GeistSans.variable,
  GeistMono.variable,
  'touch-manipulation font-sans antialiased'
)
