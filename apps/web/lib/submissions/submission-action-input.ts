import { timingSafeEqual } from 'node:crypto'
import { finalSubmitActionSchema, submitActionSchema } from '@/components/forms/submit-form-schemas'
import { stripHtml } from '@/lib/security-utils-helpers'
import type { NormalizedSubmissionFields } from './submission-state'
import { normalizeSubmissionFields } from './submission-state'

type ParsedSubmissionInput =
  | { readonly fields: NormalizedSubmissionFields; readonly ok: true }
  | { readonly message: string; readonly ok: false }

type ParsedFinalSubmissionInput = ParsedSubmissionInput &
  (
    | {
        readonly continuationToken: string
        readonly followAttested: true
        readonly ok: true
        readonly supportPlatform: 'linkedin' | 'x'
      }
    | { readonly message: string; readonly ok: false }
  )

const sanitizeText = (input: string): string => {
  const printable = Array.from(stripHtml(input), character => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 31 || (codePoint >= 127 && codePoint <= 159) ? ' ' : character
  }).join('')
  return printable
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Read the untrusted Step 2 fields from a form payload.
 *
 * @param formData - Server action form payload
 * @returns Raw field values for schema validation
 */
const rawFields = (formData: FormData) => ({
  category: formData.get('category'),
  description: formData.get('description'),
  llmsFullUrl: formData.get('llmsFullUrl') ?? '',
  llmsUrl: formData.get('llmsUrl'),
  name: formData.get('name'),
  publishedAt: formData.get('publishedAt'),
  website: formData.get('website')
})

const normalizedFields = (value: unknown): ParsedSubmissionInput => {
  const parsed = submitActionSchema.safeParse(value)
  if (!parsed.success) {
    return { message: parsed.error.errors[0]?.message ?? 'Invalid submission details.', ok: false }
  }
  const sanitized = submitActionSchema.safeParse({
    ...parsed.data,
    description: sanitizeText(parsed.data.description),
    name: sanitizeText(parsed.data.name)
  })
  if (!sanitized.success) {
    return {
      message: sanitized.error.errors[0]?.message ?? 'Invalid submission details.',
      ok: false
    }
  }
  const fields = normalizeSubmissionFields(sanitized.data)
  return fields
    ? { fields, ok: true }
    : { message: 'The submitted URLs could not be safely normalized.', ok: false }
}

/**
 * Validate, sanitize, and canonicalize the complete Step 2 form payload.
 *
 * @param formData - Server action form payload
 * @returns Canonical fields or a client-safe validation message
 */
export function parseSubmissionActionInput(formData: FormData): ParsedSubmissionInput {
  return normalizedFields(rawFields(formData))
}

/**
 * Validate the complete Step 2 payload plus the social continuation fields.
 *
 * @param formData - Server action form payload
 * @returns Canonical final input or a client-safe validation message
 */
export function parseFinalSubmissionActionInput(formData: FormData): ParsedFinalSubmissionInput {
  const parsed = finalSubmitActionSchema.safeParse({
    ...rawFields(formData),
    continuationToken: formData.get('continuationToken'),
    followAttested: formData.get('followAttested'),
    supportPlatform: formData.get('supportPlatform')
  })
  if (!parsed.success) {
    return {
      message: 'Choose X or LinkedIn and confirm your support before continuing.',
      ok: false
    }
  }
  const normalized = normalizedFields(parsed.data)
  if (!normalized.ok) return normalized
  return {
    continuationToken: parsed.data.continuationToken,
    fields: normalized.fields,
    followAttested: true,
    ok: true,
    supportPlatform: parsed.data.supportPlatform
  }
}

/**
 * Compare a submitted CSRF token with the stored token without timing leakage.
 *
 * @param submitted - Token supplied by the form
 * @param stored - Token loaded from the server-only cookie
 * @returns Whether both bounded byte sequences match
 */
export function isValidSubmissionCsrf(
  submitted: FormDataEntryValue | null,
  stored?: string
): boolean {
  if (typeof submitted !== 'string' || !stored) return false
  const supplied = Buffer.from(submitted)
  const expected = Buffer.from(stored)
  return supplied.byteLength === expected.byteLength && timingSafeEqual(supplied, expected)
}

/**
 * Read the first trusted-proxy source address from server action headers.
 *
 * @param headerStore - Server request header reader
 * @returns Source address or null when the proxy supplied none
 */
export function submissionSourceIp(headerStore: {
  readonly get: (name: string) => string | null
}): string | null {
  const forwarded = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || headerStore.get('x-real-ip')?.trim() || null
}
