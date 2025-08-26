import { cn } from '@thedaviddias/design-system/lib/utils'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const fonts = cn(inter.className, 'touch-manipulation font-sans antialiased')
