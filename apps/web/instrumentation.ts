import * as Sentry from '@sentry/nextjs'
import { initializeSentry } from '@thedaviddias/observability/instrumentation'

export const register = initializeSentry()

export const onRequestError = Sentry.captureRequestError
