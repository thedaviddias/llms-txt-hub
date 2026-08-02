/** Result of idempotent GitHub publication. */
export type SubmissionPublisherResult =
  | {
      readonly ok: true
      readonly outcome: 'automatic' | 'manual'
      readonly publicationAttempted: true
      readonly prCreated: boolean
      readonly prPresent: boolean
      readonly prUrl: string
    }
  | {
      readonly code: 'publication_unavailable'
      readonly ok: false
      readonly publicationAttempted: boolean
      readonly prCreated: boolean
      readonly prPresent: boolean
      readonly recovery: 'fresh_preflight' | 'same_submission'
    }
