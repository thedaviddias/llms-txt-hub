/** Version of the publication trust policy enforced by this package. */
export const SUBMISSION_POLICY_VERSION = '2026-08-01.v1'

/** Maximum age in milliseconds for a successful Web Risk lookup. */
export const WEB_RISK_FRESHNESS_MS = 10 * 60 * 1000

/** Maximum duration in milliseconds for an individual outbound request. */
export const SUBMISSION_REQUEST_TIMEOUT_MS = 5_000

/** Maximum duration in milliseconds for a complete publication assessment. */
export const SUBMISSION_ASSESSMENT_TIMEOUT_MS = 12_000

/** Maximum redirect hops followed while inspecting one resource. */
export const SUBMISSION_MAX_REDIRECTS = 3

/** Maximum homepage response size in bytes. */
export const SUBMISSION_HOMEPAGE_MAX_BYTES = 512 * 1024

/** Maximum llms resource response size in bytes. */
export const SUBMISSION_LLMS_MAX_BYTES = 1024 * 1024

/** Content encoding required for bounded submission-resource inspection. */
export const SUBMISSION_ACCEPT_ENCODING = 'identity'
