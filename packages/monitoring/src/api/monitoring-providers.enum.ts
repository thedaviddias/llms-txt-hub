export const InstrumentationProvider = {
  Baselime: 'baselime',
  Sentry: 'sentry'
} as const

export type InstrumentationProviderType =
  (typeof InstrumentationProvider)[keyof typeof InstrumentationProvider]
