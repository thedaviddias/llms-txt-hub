# Trusted Automatic Submissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax so progress can be tracked directly in this file.

**Goal:** Replace routine submission review with a fail-closed, three-lane trust assessment while asking each eligible submitter to support David on either X or LinkedIn.

**Architecture:** A new server-only internal package owns the publication checks shared by the Next.js app and the trusted GitHub workflow: normalized URL policy, DNS-pinned inspection, Google Web Risk, resource/editorial classification, and signed merge attestations. The web app owns authentication, CSRF, rate limits, Redis state, social attestation, duplicate protection, and GitHub publication; the base-branch workflow independently re-runs publication checks against the exact PR head before merging. Automatic publication defaults off, supports shadow mode, and fails closed whenever a required signal is missing or stale.

**Tech stack:** TypeScript, Next.js Server Actions, React Hook Form, Zod, Node DNS/HTTPS/crypto, tldts, Google Web Risk Lookup API, Upstash Redis, Octokit, GitHub Actions, Jest, Vitest, Testing Library, Turborepo, pnpm.

---

## Product and policy invariants

- A submitter chooses exactly one platform: X or LinkedIn. The product records an honest checkbox attestation and never claims API verification.
- The support step appears only after the server has determined that the submission is eligible to continue.
- `auto_publish` requires every security, resource, ownership, and editorial signal to pass with high confidence.
- `manual_review` is allowed only after the network and reputation boundary passes; uncertainty is editorial, not security-related.
- `reject` and `retry_later` create no branch or pull request.
- A Google Web Risk match rejects; a timeout, quota error, malformed response, missing credential, or other unknown result retries later.
- The application assessment covers identity, social attestation, rate limits, idempotency, duplicates, and all publication checks. The GitHub workflow trusts the signed identity/social/rate-limit facts, but independently re-runs every publication-relevant URL, resource, ownership, editorial, duplicate, path, and content check from trusted base-branch code.
- A label, PR comment, structural fast-lane classification, or passing CI result is never merge authorization. Only an unexpired HMAC attestation bound to the current repository, PR number, head SHA, file path, file content hash, URLs, and policy version can authorize automatic merge.
- `SUBMISSION_AUTOPUBLISH_MODE` defaults to `disabled`. `shadow` records would-be automatic outcomes but creates manual-review PRs. `enabled` is the only mode that signs automatic merge authorization.

## Stable contracts

Use these names throughout the implementation so the app, package, tests, analytics, and workflow cannot drift:

```ts
export type SubmissionDecision =
  | 'auto_publish'
  | 'manual_review'
  | 'reject'
  | 'retry_later'

export type SubmissionReasonCode =
  | 'passed'
  | 'duplicate'
  | 'rate_limited'
  | 'unsafe_network_target'
  | 'reputation_match'
  | 'reputation_unknown'
  | 'required_resource_missing'
  | 'required_resource_transient_failure'
  | 'invalid_optional_resource'
  | 'unrelated_site_family'
  | 'nonstandard_llms_format'
  | 'editorial_uncertainty'
  | 'prohibited_content'
  | 'publication_unavailable'

export interface SubmissionFields {
  category: string
  description: string
  llmsFullUrl?: string
  llmsUrl: string
  name: string
  publishedAt: string
  website: string
}

export interface SubmissionAssessment {
  checkedAt: string
  decision: SubmissionDecision
  evidence: readonly AssessmentEvidence[]
  policyVersion: string
  publicMessage: string
  reasonCode: SubmissionReasonCode
}
```

Use policy version `2026-08-01.v1`, Web Risk freshness of ten minutes, a five-second per-request timeout, a twelve-second total assessment budget, at most three redirects per resource, 512 KiB for homepage text, 1 MiB for each llms resource, and `Accept-Encoding: identity`.

## Task 1: Scaffold the shared trust package and environment contract

**Files:**

- Create: `packages/submission-trust/package.json`
- Create: `packages/submission-trust/tsconfig.json`
- Create: `packages/submission-trust/src/types.ts`
- Create: `packages/submission-trust/src/constants.ts`
- Create: `packages/submission-trust/src/types.test.ts`
- Modify: `apps/web/package.json`
- Modify: `package.json`
- Modify: `apps/web/env.ts`
- Modify: `.env.example`
- Modify: `turbo.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add a failing contract test**

Create `types.test.ts` with table tests asserting that `mergeSubmissionDecisions()` uses the precedence `reject > retry_later > manual_review > auto_publish`, and that an empty list cannot produce an automatic pass.

```ts
it.each([
  [['auto_publish', 'manual_review'], 'manual_review'],
  [['manual_review', 'retry_later'], 'retry_later'],
  [['retry_later', 'reject'], 'reject']
] as const)('merges %j as %s', (decisions, expected) => {
  expect(mergeSubmissionDecisions(decisions)).toBe(expected)
})
```

- [ ] **Step 2: Run the package test and confirm it fails**

Run: `pnpm --filter @thedaviddias/submission-trust test`

Expected: failure because the package and decision helper do not exist.

- [ ] **Step 3: Create a self-contained server-only package**

Give the package explicit subpath exports rather than a barrel:

```json
{
  "name": "@thedaviddias/submission-trust",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./assessment": "./src/assessment.ts",
    "./attestation": "./src/attestation.ts",
    "./constants": "./src/constants.ts",
    "./editorial-policy": "./src/editorial-policy.ts",
    "./network-inspector": "./src/network-inspector.ts",
    "./types": "./src/types.ts",
    "./url-policy": "./src/url-policy.ts",
    "./web-risk": "./src/web-risk.ts"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

Declare `tldts` as a direct runtime dependency and `@types/node`, `@thedaviddias/config-typescript`, TypeScript, and Vitest as development dependencies. Add `@thedaviddias/submission-trust: workspace:*` to both the web app dependencies and root development dependencies because both the app and root scripts import it. Add `tldts: ^7.0.23` and `vitest: ^4.0.18` without relying on transitive hoisting.

- [ ] **Step 4: Define the discriminated contracts and fail-closed merge helper**

Implement the stable contracts above, plus typed `AssessmentEvidence`, `InspectedResource`, `ReputationResult`, `PublicationAssessmentDependencies`, and `AssessmentAttestationPayload`. Add JSDoc to every export. `mergeSubmissionDecisions([])` must return `retry_later`.

- [ ] **Step 5: Add server environment variables and cache invalidation**

In `apps/web/env.ts`, use Zod server entries:

```ts
GOOGLE_WEB_RISK_API_KEY: z.string().min(1).optional(),
SUBMISSION_ASSESSMENT_SIGNING_SECRET: z.string().min(32).optional(),
SUBMISSION_AUTOPUBLISH_MODE: z.enum(['disabled', 'shadow', 'enabled']).default('disabled')
```

Mirror all three in `runtimeEnv`, document safe sample values in `.env.example`, and add all three names to `turbo.json` under `tasks.build.env`. Missing credentials must be handled by runtime classification, not exposed to the client.

- [ ] **Step 6: Install and verify the package contract**

Run: `pnpm install`

Run: `pnpm --filter @thedaviddias/submission-trust test`

Run: `pnpm --filter @thedaviddias/submission-trust typecheck`

Expected: package contract tests and typecheck pass.

- [ ] **Step 7: Commit the package scaffold**

```bash
git add packages/submission-trust apps/web/package.json apps/web/env.ts package.json pnpm-lock.yaml .env.example turbo.json
git commit -m "feat: scaffold submission trust package"
```

## Task 2: Implement normalized URL policy and DNS-pinned inspection

**Files:**

- Create: `packages/submission-trust/src/url-policy.ts`
- Create: `packages/submission-trust/src/url-policy.test.ts`
- Create: `packages/submission-trust/src/network-inspector.ts`
- Create: `packages/submission-trust/src/network-inspector.test.ts`
- Modify: `apps/web/lib/url-safety.ts`
- Modify: `apps/web/lib/__tests__/url-safety.test.ts`

- [ ] **Step 1: Write failing URL-policy tests**

Cover HTTPS-only normalization, removal of default ports and fragments, rejection of credentials, IP literals, `.local`, localhost, non-443 ports, IDN normalization, and registrable-domain comparison. Include IPv4, IPv6, IPv4-mapped IPv6, carrier-grade NAT, link-local, documentation, benchmarking, multicast, and reserved ranges.

```ts
it.each([
  'https://127.0.0.1/llms.txt',
  'https://[::1]/llms.txt',
  'https://[::ffff:10.0.0.1]/llms.txt',
  'https://192.0.2.10/llms.txt',
  'https://100.64.0.1/llms.txt'
])('rejects non-public target %s', url => {
  expect(validateSubmissionUrl(url)).toMatchObject({ ok: false })
})
```

- [ ] **Step 2: Write failing inspector tests with injected DNS and transport**

Do not make test network calls. Inject a resolver and pinned HTTPS transport, then cover:

- one private address among multiple DNS answers rejects the hostname;
- redirects are reputation-checked and DNS-validated one hop at a time;
- the transport receives only the chosen validated address and original TLS server name;
- protocol downgrade, credential-bearing redirect, fourth redirect, timeout, oversized response, and non-identity content encoding fail closed;
- response bytes and headers never appear in public errors.

- [ ] **Step 3: Run focused tests and confirm failure**

Run: `pnpm --filter @thedaviddias/submission-trust test -- src/url-policy.test.ts src/network-inspector.test.ts`

Expected: failure because the URL and inspector functions are not implemented.

- [ ] **Step 4: Implement URL normalization and public-address classification**

Use `tldts.getDomain()` for site-family comparison. Return typed results instead of throwing raw transport errors. A hostname is automatic-lane eligible only when every A and AAAA answer is public.

- [ ] **Step 5: Implement a pinned Node HTTPS transport**

Use `node:dns/promises.lookup(hostname, { all: true, verbatim: true })` to collect all answers. Validate all answers, select one validated address, and connect with `node:https.request()` using a custom `lookup` callback that returns only that address while preserving `servername: originalHostname`. Send no cookies, auth headers, referer, or application headers.

The inspector sequence for every hop is:

```text
parse and normalize URL
-> resolve all A/AAAA answers
-> reject unless every answer is public
-> Web Risk lookup for this exact URL
-> connect to one validated/pinned address
-> read bounded response or validate manual redirect
```

Do not fall back to global `fetch()` for user-controlled URLs because it would separate DNS validation from connection.

- [ ] **Step 6: Replace the existing URL-policy duplication**

Make `apps/web/lib/url-safety.ts` a compatibility adapter around the shared URL policy. The `/api/check-url` transport moves in Task 3, after the real Web Risk adapter exists, so no intermediate commit can inspect a user URL without reputation checking.

- [ ] **Step 7: Run focused app and package tests**

Run: `pnpm --filter @thedaviddias/submission-trust test -- src/url-policy.test.ts src/network-inspector.test.ts`

Run: `pnpm --filter web test:related -- lib/url-safety.ts lib/__tests__/url-safety.test.ts`

Expected: all focused tests pass.

- [ ] **Step 8: Commit network hardening**

```bash
git add packages/submission-trust/src/url-policy.ts packages/submission-trust/src/url-policy.test.ts packages/submission-trust/src/network-inspector.ts packages/submission-trust/src/network-inspector.test.ts apps/web/lib/url-safety.ts apps/web/lib/__tests__/url-safety.test.ts
git commit -m "feat: harden submission URL inspection"
```

## Task 3: Add Google Web Risk and resource classification

**Files:**

- Create: `packages/submission-trust/src/web-risk.ts`
- Create: `packages/submission-trust/src/web-risk.test.ts`
- Create: `packages/submission-trust/src/assessment.ts`
- Create: `packages/submission-trust/src/assessment.test.ts`
- Modify: `apps/web/app/api/check-url/route.ts`
- Create: `apps/web/app/api/check-url/__tests__/route.test.ts`

- [ ] **Step 1: Write failing Web Risk adapter tests**

Mock the provider transport. Assert that each request sends the exact URL and all four threat types:

```ts
const THREAT_TYPES = [
  'MALWARE',
  'SOCIAL_ENGINEERING',
  'UNWANTED_SOFTWARE',
  'SOCIAL_ENGINEERING_EXTENDED_COVERAGE'
] as const
```

Cover empty 200 response as `safe`, matched threat types as `unsafe`, and 400/401/403/429/5xx, abort, invalid JSON, unsupported response shape, and missing API key as `unknown`. Ensure the API key is never included in errors or evidence.

- [ ] **Step 2: Write failing resource decision tests**

Use injected inspector results to assert:

- stable homepage or required llms 404/410 -> `reject`;
- transient timeout/5xx -> `retry_later`;
- HTML homepage plus text llms is required;
- HTML, binary, invalid UTF-8, or supplied-but-invalid llms-full -> `reject`;
- llms text under 80 characters or without a level-one heading and an absolute HTTP(S) link -> `manual_review`, not automatic;
- every submitted URL and redirect destination has a safe Web Risk result checked within ten minutes;
- an unsafe or unknown reputation result always outranks editorial results.

- [ ] **Step 3: Run tests and confirm failure**

Run: `pnpm --filter @thedaviddias/submission-trust test -- src/web-risk.test.ts src/assessment.test.ts`

Expected: failure because the adapter and assessment orchestrator do not exist.

- [ ] **Step 4: Implement the narrow provider adapter**

Call `GET https://webrisk.googleapis.com/v1/uris:search` with repeated `threatTypes` parameters and a URL-encoded `uri`. Use an injected `fetch`-compatible transport, an AbortController, and safe structured results. A cached safe result expires at the earlier of ten minutes or its provider expiry; unsafe results may last only until `expireTime`; unknown results are not cached as safe.

- [ ] **Step 5: Implement typed resource inspection and decision precedence**

`assessPublicationFields(fields, dependencies)` must call the shared inspector for homepage, llms, and optional llms-full, validate final URLs and content, and return the stable `SubmissionAssessment`. Keep private evidence bounded to status, content type, final host, redirect hosts, byte count, provider status, and stable reason codes; never retain fetched bodies.

- [ ] **Step 6: Replace the public check-url route transport**

Update `/api/check-url` to instantiate the hardened inspector with the real Web Risk adapter. Preserve its public response shape where possible, return unavailable for every reputation unknown, and add route tests proving the API never reports a URL as valid when reputation or DNS inspection is incomplete.

- [ ] **Step 7: Verify focused tests**

Run: `pnpm --filter @thedaviddias/submission-trust test -- src/web-risk.test.ts src/assessment.test.ts`

Run: `pnpm --filter web test -- --runInBand app/api/check-url/__tests__/route.test.ts`

Expected: all provider and resource tests pass.

- [ ] **Step 8: Commit reputation and resource checks**

```bash
git add packages/submission-trust/src/web-risk.ts packages/submission-trust/src/web-risk.test.ts packages/submission-trust/src/assessment.ts packages/submission-trust/src/assessment.test.ts apps/web/app/api/check-url/route.ts apps/web/app/api/check-url/__tests__/route.test.ts
git commit -m "feat: assess submission reputation and resources"
```

## Task 4: Implement deterministic editorial policy

**Files:**

- Create: `packages/submission-trust/src/editorial-policy.ts`
- Create: `packages/submission-trust/src/editorial-policy.test.ts`
- Modify: `packages/submission-trust/src/assessment.ts`
- Modify: `packages/submission-trust/src/assessment.test.ts`
- Modify: `scripts/pr-backfill-dry-run.ts`
- Modify: `scripts/pr-backfill-dry-run.test.ts`

- [ ] **Step 1: Write failing policy table tests**

Test established prohibited patterns separately from ambiguous regulated industries. Reject adult/escort, gambling affiliate/bonus/review spam, academic cheating or detector bypass, paid traffic/backlink manipulation, malware/phishing, and explicit illegal/deceptive services. Send ordinary finance, health, gaming, dating, or regulated-product sites to manual review unless a prohibited pattern is established.

Add description-quality tests for copied boilerplate, keyword stuffing, excessive superlatives, first-person sales copy, and a name/domain mismatch. Add category plausibility tests using the existing category slugs and a conservative keyword map; no match means manual review, never rejection.

- [ ] **Step 2: Run policy tests and confirm failure**

Run: `pnpm --filter @thedaviddias/submission-trust test -- src/editorial-policy.test.ts src/assessment.test.ts`

Expected: failure because editorial policy is not yet included.

- [ ] **Step 3: Implement conservative deterministic policy**

Normalize Unicode and whitespace before matching. Match phrases and combinations, not isolated ambiguous words such as `casino`, `medical`, or `finance`. Return evidence IDs, not the full internal pattern list, to callers. Editorial policy may downgrade automatic to manual or reject an established prohibition; it cannot override unsafe/unknown network or reputation results.

Pass the existing `categories` descriptors into `assessPublicationFields()` as a dependency so the package does not duplicate app category definitions or import Lucide/React code. The workflow and app must both supply the same slug, name, and description projection from `apps/web/lib/categories.ts`.

- [ ] **Step 4: Replace duplicated PR-script heuristics**

Remove `SUSPICIOUS_FAIL_TERMS` and the script-local domain/text logic from `pr-backfill-dry-run.ts`. Parse frontmatter there, then call shared `assessPublicationFields()`. Adapt the package decision to existing guideline labels:

```ts
const guidelineStatus =
  assessment.decision === 'auto_publish'
    ? 'pass'
    : assessment.decision === 'reject'
      ? 'fail'
      : 'warn'
```

Do not enable merge yet; the attestation gate in Task 7 will become the final authorization.

- [ ] **Step 5: Verify policy and existing PR behavior**

Run: `pnpm --filter @thedaviddias/submission-trust test`

Run: `pnpm exec vitest run scripts/pr-backfill-dry-run.test.ts`

Expected: new policy tests pass and existing structural/manual label behavior remains covered.

- [ ] **Step 6: Commit the editorial policy**

```bash
git add packages/submission-trust/src/editorial-policy.ts packages/submission-trust/src/editorial-policy.test.ts packages/submission-trust/src/assessment.ts packages/submission-trust/src/assessment.test.ts scripts/pr-backfill-dry-run.ts scripts/pr-backfill-dry-run.test.ts
git commit -m "feat: classify submission editorial risk"
```

## Task 5: Add exact-head signed attestations

**Files:**

- Create: `packages/submission-trust/src/attestation.ts`
- Create: `packages/submission-trust/src/attestation.test.ts`

- [ ] **Step 1: Write failing signature and parsing tests**

Cover fixed canonical field ordering, URL normalization, base64url encoding, timing-safe verification, expiry, repository mismatch, PR mismatch, SHA mismatch, path mismatch, content-hash mismatch, policy mismatch, malformed blocks, duplicate blocks, and signature tampering.

Use a PR body block, not a comment, so `pull_request_target: edited` reliably reruns:

```text
<!-- llms-hub-assessment:v1
<base64url payload>
<base64url HMAC-SHA256 signature>
-->
```

- [ ] **Step 2: Run the attestation test and confirm failure**

Run: `pnpm --filter @thedaviddias/submission-trust test -- src/attestation.test.ts`

Expected: failure because signing and verification do not exist.

- [ ] **Step 3: Implement canonical signing and verification**

The signed payload must include only these required fields:

```ts
{
  repository,
  submissionId,
  prNumber,
  headSha,
  mdxPath,
  mdxContentSha256,
  website,
  llmsUrl,
  llmsFullUrl,
  decision: 'auto_publish',
  policyVersion,
  webRiskCheckedAt,
  issuedAt,
  expiresAt
}
```

Canonicalize with a fixed ordered array rather than generic object-key iteration. Require a 32-byte-or-longer secret, compare decoded signatures with `timingSafeEqual`, and return typed failure codes without echoing the signature or secret.

- [ ] **Step 4: Verify attestation tests**

Run: `pnpm --filter @thedaviddias/submission-trust test -- src/attestation.test.ts`

Expected: every tamper/staleness case fails and the exact untouched payload passes.

- [ ] **Step 5: Commit attestation support**

```bash
git add packages/submission-trust/src/attestation.ts packages/submission-trust/src/attestation.test.ts
git commit -m "feat: sign automatic submission assessments"
```

## Task 6: Add Redis state, abuse controls, and duplicate protection

**Files:**

- Create: `apps/web/lib/submissions/submission-state.ts`
- Create: `apps/web/lib/submissions/submission-state.test.ts`
- Create: `apps/web/lib/submissions/submission-duplicates.ts`
- Create: `apps/web/lib/submissions/submission-duplicates.test.ts`
- Modify: `apps/web/lib/redis.ts`

- [ ] **Step 1: Write failing state-machine tests**

Mock the Upstash client. Cover the allowed state transitions from the design, an opaque signed continuation token bound to `submissionId + Clerk userId + fieldsHash + expiresAt`, exact-once `support_required -> final_assessing`, expired/replayed/tampered tokens, 48-hour record TTL, and inability to continue after fields change.

- [ ] **Step 2: Write failing lock, rate-limit, and duplicate tests**

Cover:

- atomic NX locks for normalized website and llms URL;
- one active submission per website or llms URL;
- 5 submissions/account/hour, 20/source-IP-hash/hour, and 3/registrable-domain/day;
- fail closed with `publication_unavailable` when Redis is unavailable;
- duplicates in `getWebsites()` after URL normalization;
- duplicates in open GitHub PR frontmatter or an existing `llms-hub-submission:<id>` marker;
- the same submission ID reconciling an existing branch/PR rather than creating another.

- [ ] **Step 3: Run focused tests and confirm failure**

Run: `pnpm --filter web test -- --runInBand lib/submissions/submission-state.test.ts lib/submissions/submission-duplicates.test.ts`

Expected: failure because the state and duplicate modules do not exist.

- [ ] **Step 4: Add safe advanced Redis helpers**

Add documented helpers for `setNx()` and `eval()` to `apps/web/lib/redis.ts`; catch and log only safe messages with `logger.error`. Do not silently degrade publication state to process memory.

- [ ] **Step 5: Implement state and continuation tokens**

Hash submission fields using SHA-256 over a fixed canonical field order. Hash the source IP with HMAC before storage; never store a raw IP. Use a Lua compare-and-transition script for final assessment and store only normalized fields, user ID, state, timestamps, result codes, branch, PR number, and head SHA.

- [ ] **Step 6: Implement catalogue and open-PR duplicate checks**

Use `getWebsites()` for the current generated collection and Octokit for open PRs. Normalize URLs before comparison. Treat inability to establish duplicate status as `retry_later`; do not assume unique.

- [ ] **Step 7: Verify state tests**

Run: `pnpm --filter web test -- --runInBand lib/submissions/submission-state.test.ts lib/submissions/submission-duplicates.test.ts`

Expected: all transition, replay, lock, Redis-unavailable, and duplicate cases pass.

- [ ] **Step 8: Commit durable submission state**

```bash
git add apps/web/lib/redis.ts apps/web/lib/submissions/submission-state.ts apps/web/lib/submissions/submission-state.test.ts apps/web/lib/submissions/submission-duplicates.ts apps/web/lib/submissions/submission-duplicates.test.ts
git commit -m "feat: persist trusted submission state"
```

## Task 7: Split preflight, final assessment, and idempotent GitHub publication

**Files:**

- Create: `apps/web/actions/preflight-submission.ts`
- Create: `apps/web/actions/preflight-submission.test.ts`
- Create: `apps/web/lib/submissions/submission-publisher.ts`
- Create: `apps/web/lib/submissions/submission-publisher.test.ts`
- Modify: `apps/web/actions/submit-llms-xxt.ts`
- Create: `apps/web/actions/submit-llms-xxt.test.ts`
- Modify: `apps/web/components/forms/submit-form-schemas.ts`

- [ ] **Step 1: Write failing preflight action tests**

Mock Clerk auth, CSRF, headers, Redis, duplicates, Web Risk, and the assessment package. Assert that preflight:

- validates and normalizes the complete Step 2 fields;
- enforces auth, CSRF, account/IP/domain rate limits, and duplicates before support;
- returns `support_required` plus opaque continuation token only for security-cleared `auto_publish` or `manual_review` outcomes;
- returns public-safe `reject` or `retry_later` results without a token;
- does not call GitHub.

- [ ] **Step 2: Write failing final-action and publisher tests**

Assert that final submission requires `supportPlatform: 'x' | 'linkedin'`, `followAttested: true`, and a valid continuation token. It must atomically consume the token, rerun duplicates and the full assessment, and never use the earlier preflight decision as publication evidence.

For the publisher, cover deterministic branch `submit/<submissionId>`, existing-branch/PR reconciliation, focused MDX content, manual label assignment, PR number/head persistence before signing, PR body update with the signed block, and no duplicate PR after a retry.

- [ ] **Step 3: Run action tests and confirm failure**

Run: `pnpm --filter web test -- --runInBand actions/preflight-submission.test.ts actions/submit-llms-xxt.test.ts lib/submissions/submission-publisher.test.ts`

Expected: failure because the actions and publisher contract are not implemented.

- [ ] **Step 4: Implement preflight**

Return this client-safe union:

```ts
type PreflightResult =
  | { status: 'support_required'; continuationToken: string; submissionId: string }
  | { status: 'rejected'; message: string; reasonCode: SubmissionReasonCode }
  | { status: 'retry_later'; message: string; reasonCode: SubmissionReasonCode }
```

Log stable reason codes and duration through `logger`; do not log fetched bodies, API keys, tokens, signatures, raw IPs, or raw stack traces.

- [ ] **Step 5: Refactor publication out of the existing server action**

Keep MDX escaping and sanitization, but make `submitLlmsTxt()` a final coordinator. The publisher receives a completed assessment and explicit mode:

- `disabled`: security-cleared outcomes publish as manual-review PRs;
- `shadow`: would-be automatic outcomes publish as manual-review PRs and record `would_auto_publish`;
- `enabled`: only `auto_publish` receives the signed PR-body block; manual outcomes remain unsigned and labeled `needs:manual-review`.

If Web Risk, Redis, the signing secret, or GitHub publication is unavailable, return `retry_later`/`publication_unavailable`; never silently downgrade an infrastructure-unknown automatic assessment into an authorized merge.

Return client-safe outcomes:

```ts
type FinalSubmissionResult =
  | { success: true; outcome: 'automatic' | 'manual'; prUrl: string }
  | { success: false; outcome: 'rejected' | 'retry_later'; error: string }
```

- [ ] **Step 6: Verify action and publisher tests**

Run: `pnpm --filter web test -- --runInBand actions/preflight-submission.test.ts actions/submit-llms-xxt.test.ts lib/submissions/submission-publisher.test.ts`

Expected: all orchestration, replay, mode, and idempotency cases pass.

- [ ] **Step 7: Commit the submission coordinator**

```bash
git add apps/web/actions/preflight-submission.ts apps/web/actions/preflight-submission.test.ts apps/web/actions/submit-llms-xxt.ts apps/web/actions/submit-llms-xxt.test.ts apps/web/lib/submissions/submission-publisher.ts apps/web/lib/submissions/submission-publisher.test.ts apps/web/components/forms/submit-form-schemas.ts
git commit -m "feat: orchestrate trusted website submissions"
```

## Task 8: Make the GitHub workflow verify and reassess exact PR heads

**Files:**

- Modify: `scripts/pr-backfill-dry-run.ts`
- Modify: `scripts/pr-backfill-dry-run.test.ts`
- Modify: `.github/workflows/pr-automerge.yml`
- Modify: `.github/workflows/pr-intake.yml` only if label definitions are duplicated there

- [ ] **Step 1: Write failing merge-authorization tests**

Extend `pr-backfill-dry-run.test.ts` with pure inputs for PR body, repository, PR number, current head SHA, added MDX path/content, and fresh assessment. Assert that merge is blocked for missing/manual/invalid/expired attestations, any exact-head/content mismatch, stale Web Risk evidence, duplicate entry, `needs:manual-review`, or a fresh reassessment that is not `auto_publish`.

Add the positive test only when all facts match:

```ts
expect(
  deriveMergeAuthorization({
    attestation: verifiedAttestation,
    freshAssessment: autoAssessment,
    hasManualReviewLabel: false,
    requiredChecksPassed: true
  })
).toEqual({ authorized: true, reason: 'Signed exact-head assessment passed.' })
```

- [ ] **Step 2: Run the repository test and confirm failure**

Run: `pnpm exec vitest run scripts/pr-backfill-dry-run.test.ts`

Expected: failure because signed authorization is not yet required.

- [ ] **Step 3: Add trusted attestation verification and fresh reassessment**

From the trusted base checkout, fetch the current PR body and exact added MDX bytes using the GitHub API. Verify signature and bindings, calculate the MDX SHA-256 locally, parse the exact frontmatter, run duplicate checks against base plus other open PRs, and call `assessPublicationFields()` with a fresh Google Web Risk lookup. Identity, support choice, rate limit, and initial idempotency are not re-executed in Actions; they are accepted only because their application assessment is bound into the valid signed authorization.

Require the existing `PR Review` conclusion to be `success` before merge. On any unknown/error, sync `needs:manual-review`, remove `automerge:candidate`, and skip merge.

- [ ] **Step 4: Wire secrets into trusted base workflow**

Add these job environment values only to the trusted `pull_request_target` step:

```yaml
GOOGLE_WEB_RISK_API_KEY: ${{ secrets.GOOGLE_WEB_RISK_API_KEY }}
SUBMISSION_ASSESSMENT_SIGNING_SECRET: ${{ secrets.SUBMISSION_ASSESSMENT_SIGNING_SECRET }}
```

Do not expose either secret to PR checkout or PR-authored scripts. Keep `actions/checkout` on the trusted base ref and retain exact-SHA merge through the GitHub API.

- [ ] **Step 5: Verify script and workflow formatting**

Run: `pnpm exec vitest run scripts/pr-backfill-dry-run.test.ts scripts/pr-triage.test.ts`

Run: `pnpm exec biome check scripts/pr-backfill-dry-run.ts scripts/pr-backfill-dry-run.test.ts`

Run: `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/pr-automerge.yml', aliases: true)"`

Expected: tests pass, Biome reports no errors, and Ruby parses the workflow YAML successfully.

- [ ] **Step 6: Commit the trusted merge gate**

```bash
git add scripts/pr-backfill-dry-run.ts scripts/pr-backfill-dry-run.test.ts .github/workflows/pr-automerge.yml .github/workflows/pr-intake.yml
git commit -m "feat: require signed submission merge authorization"
```

## Task 9: Add the X-or-LinkedIn support step and truthful outcomes

**Files:**

- Create: `apps/web/components/forms/submit-form-support.tsx`
- Create: `apps/web/components/forms/__tests__/submit-form-support.test.tsx`
- Modify: `apps/web/components/forms/submit-form.tsx`
- Modify: `apps/web/components/forms/submit-form-success.tsx`
- Modify: `apps/web/components/forms/__tests__/submit-form.test.tsx`

- [ ] **Step 1: Write failing support-component tests**

Assert that:

- the two choices point exactly to `https://x.com/thedaviddias` and `https://www.linkedin.com/in/thedaviddias/`;
- selecting one deselects the other;
- the confirmation copy says “I follow David on this platform” and never “verified”;
- confirmation is disabled until the selected profile link has been opened in a new tab;
- final submit is disabled until exactly one platform is selected and the checkbox is checked;
- keyboard and accessible-name queries can complete the step.

- [ ] **Step 2: Write failing full-form transition tests**

Mock preflight and final actions. Cover:

```text
metadata -> details -> preflight reject (no support step, no GitHub)
metadata -> details -> preflight retry (no support step, no GitHub)
metadata -> details -> support -> automatic outcome
metadata -> details -> support -> manual outcome
support -> final reassessment reject/retry
```

Verify that changed Step 2 fields invalidate the continuation and require a new preflight.

- [ ] **Step 3: Run component tests and confirm failure**

Run: `pnpm --filter web test -- --runInBand components/forms/__tests__/submit-form-support.test.tsx components/forms/__tests__/submit-form.test.tsx`

Expected: failure because the support step and four-state outcome UI do not exist.

- [ ] **Step 4: Implement the four-step form**

Use explicit string state rather than overloaded numbers:

```ts
type SubmitStep = 'website' | 'details' | 'support' | 'result'
```

Step 2 calls preflight. Store only the opaque token and submission ID client-side. The support component owns `platform`, `profileOpened`, and `followAttested`; final action receives platform, attestation boolean, token, and the unchanged fields.

- [ ] **Step 5: Make outcome language accurate**

Replace the current always-manual success copy:

- automatic: “Your submission passed our checks and will be published automatically after repository validation.”
- manual: “Your submission is safe to review, but one or more directory guidelines need a maintainer decision.”
- rejected: show the server's safe message and no PR link.
- retry: “We could not safely verify this site right now. Nothing was published. Please try again later.”

- [ ] **Step 6: Verify form behavior and accessibility**

Run: `pnpm --filter web test -- --runInBand components/forms/__tests__/submit-form-support.test.tsx components/forms/__tests__/submit-form.test.tsx`

Expected: all transition, copy, mutual-exclusion, link, and keyboard tests pass.

- [ ] **Step 7: Commit the support experience**

```bash
git add apps/web/components/forms/submit-form-support.tsx apps/web/components/forms/__tests__/submit-form-support.test.tsx apps/web/components/forms/submit-form.tsx apps/web/components/forms/submit-form-success.tsx apps/web/components/forms/__tests__/submit-form.test.tsx
git commit -m "feat: add social support submission step"
```

## Task 10: Add privacy-safe analytics and legal disclosure

**Files:**

- Modify: `apps/web/lib/analytics.ts`
- Modify: `apps/web/lib/analytics-helpers.ts`
- Modify: `apps/web/components/analytics-tracker.tsx`
- Create: `apps/web/lib/__tests__/submission-analytics.test.ts`
- Modify: `packages/content/data/legal/privacy.mdx`
- Create: `apps/web/__tests__/legal-content.test.ts`

- [ ] **Step 1: Write failing analytics tests**

Add stable aggregate events for preflight start/outcome, support view, platform selection, profile open, follow attestation, final outcome, PR creation, publish failure, assessment duration bucket, and Web Risk availability. Tests must prove event properties contain no social username, fetched content, continuation token, signature, raw IP, API key, or provider response body.

- [ ] **Step 2: Run the analytics test and confirm failure**

Run: `pnpm --filter web test -- --runInBand lib/__tests__/submission-analytics.test.ts`

Expected: failure because submission-specific analytics helpers do not exist.

- [ ] **Step 3: Add analytics events without growing the main helper unnecessarily**

Add constants and typed properties in `analytics.ts`. Add narrowly named helper methods in `analytics-helpers.ts` and hook wrappers in `analytics-tracker.tsx`. Track only platform (`x` or `linkedin`), decision, stable reason category, duration bucket, source, and PR presence.

- [ ] **Step 4: Update the canonical privacy policy**

Edit only `packages/content/data/legal/privacy.mdx`, which is the content-collection source used by the public legal page. Update its date to **August 1, 2026** and disclose:

- X/LinkedIn support choice and self-attestation, with no username or API verification;
- submitted and redirected URLs being sent to Google Web Risk for security screening;
- short-lived submission state and abuse-control hashes in Upstash Redis;
- aggregate submission/support analytics in OpenPanel;
- public PR and permanent directory retention only after publication.

Do not edit `cookies.mdx` unless cookie behavior changes. Do not treat the stale `apps/web/content/legal/privacy.mdx` file as canonical.

- [ ] **Step 5: Verify analytics and legal rendering**

Run: `pnpm --filter web test -- --runInBand lib/__tests__/submission-analytics.test.ts __tests__/legal-content.test.ts`

Run: `pnpm check:frontmatter`

Expected: analytics redaction assertions pass, the rendered privacy content contains the new date/provider disclosure, and frontmatter is valid.

- [ ] **Step 6: Commit analytics and privacy changes**

```bash
git add apps/web/lib/analytics.ts apps/web/lib/analytics-helpers.ts apps/web/components/analytics-tracker.tsx apps/web/lib/__tests__/submission-analytics.test.ts packages/content/data/legal/privacy.mdx apps/web/__tests__/legal-content.test.ts
git commit -m "feat: measure trusted submission outcomes"
```

## Task 11: Run full verification and visual acceptance in disabled mode

**Files:**

- Modify only files required to fix failures caused by Tasks 1–10.
- Save screenshots under `.playwright-mcp/` only if that directory is already the repository convention; do not commit generated screenshots unless the repository already tracks comparable acceptance artifacts.

- [ ] **Step 1: Run focused trust and submission tests**

Run: `pnpm --filter @thedaviddias/submission-trust test`

Run: `pnpm --filter web test -- --runInBand actions/preflight-submission.test.ts actions/submit-llms-xxt.test.ts lib/submissions components/forms/__tests__/submit-form-support.test.tsx components/forms/__tests__/submit-form.test.tsx lib/__tests__/submission-analytics.test.ts`

Run: `pnpm test:repo`

Expected: all package, app, and repository automation tests pass.

- [ ] **Step 2: Run static repository gates**

Run: `pnpm check:websites`

Run: `pnpm check:frontmatter`

Run: `pnpm typecheck`

Run: `pnpm lint`

Run: `git diff --check`

Expected: all commands pass. The known pre-existing `analytics.ts` complexity warning may be reported, but no new failure may be bypassed.

- [ ] **Step 3: Run the required full production build**

Run: `pnpm build`

Expected: the complete Turborepo production build succeeds with strict pnpm dependency resolution. This is required because package, lockfile, and environment configuration changed.

- [ ] **Step 4: Exercise the form visually at desktop and mobile widths**

Start the app with `SUBMISSION_AUTOPUBLISH_MODE=disabled` and safe test doubles for Web Risk/GitHub in a test environment. Inspect `/submit` at approximately 1440×900 and 390×844. Verify:

- support is absent before a successful preflight;
- X and LinkedIn cards have equal visual weight and clear selected/focus states;
- only one can be selected;
- external-link behavior and attestation copy are honest;
- long retry/rejection/manual messages wrap without overflow;
- keyboard focus moves to each new step and errors are announced;
- automatic language never appears while mode is disabled.

- [ ] **Step 5: Run a local dry-run of trusted PR review**

Run: `pnpm review:dry-run -- --limit 5`

Expected: existing unsigned PRs are not merge-authorized; they remain manual without mutating GitHub. Provider or credential unavailability must result in a safe skip, never an automatic pass.

- [ ] **Step 6: Commit verification fixes if any**

```bash
git commit -m "fix: close trusted submission verification gaps"
```

Before this command, stage only the explicit source paths changed while fixing a reproduced verification failure, as shown by `git status --short`. Skip this commit when verification required no source changes; never create an empty commit.

## Task 12: Configure and validate shadow-mode rollout

**External configuration:**

- Google Cloud Web Risk API key restricted to Web Risk and production use
- Vercel environment variables for preview and production
- GitHub Actions repository secrets
- Google Cloud usage and billing alerts
- Baseline follower counts and review-time metric snapshot

- [ ] **Step 1: Provision secrets without placing values in repository files or logs**

Create independent Google Web Risk and HMAC signing secrets. Configure:

```text
GOOGLE_WEB_RISK_API_KEY
SUBMISSION_ASSESSMENT_SIGNING_SECRET
SUBMISSION_AUTOPUBLISH_MODE=shadow
```

The same HMAC secret must be present in the web runtime and GitHub Actions. The Web Risk key may be separate per environment. Confirm secret names only; never print values.

- [ ] **Step 2: Validate shadow-mode end to end with controlled domains**

Use one known-good controlled site, one controlled nonstandard llms file, one missing llms URL, and test doubles for unsafe/unknown Web Risk outcomes. Confirm:

- known-good is recorded as `would_auto_publish` but gets an unsigned manual-review PR;
- editorial ambiguity gets manual review;
- missing/invalid resource rejects before support when deterministically established;
- provider unknown retries with no PR;
- no shadow-mode PR can merge automatically.

- [ ] **Step 3: Observe a minimum sample before enabling**

Review at least 25 consecutive shadow assessments or 7 days of traffic, whichever takes longer. Compare automated classifications with manual decisions. Enabling requires zero unsafe false negatives, no duplicate publication, no token/URL data leakage, and an acceptable editorial false-positive rate recorded in the rollout notes.

- [ ] **Step 4: Enable automatic mode as a separate operational change**

Change only `SUBMISSION_AUTOPUBLISH_MODE=enabled`. Submit one controlled known-good entry and verify the full chain: preflight, support choice, final reassessment, PR creation, persisted PR/head, body attestation, `edited` workflow trigger, fresh trusted assessment, required CI success, exact-SHA squash merge, and published directory entry.

- [ ] **Step 5: Verify the kill switch**

Return `SUBMISSION_AUTOPUBLISH_MODE=disabled`, submit another controlled good entry, and confirm it creates an unsigned manual-review PR that cannot auto-merge. Restore the intended mode only after the fail-safe behavior is proven.

## Final acceptance checklist

- [ ] Submitters choose X or LinkedIn, never both and never a claimed verified follow.
- [ ] Ineligible or security-unknown submissions never see the social request and never create a PR.
- [ ] Manual-review PRs have passed the security boundary but cannot auto-merge.
- [ ] Automatic PRs require an exact-head, unexpired, signed body attestation plus a fresh trusted-base assessment and successful repository checks.
- [ ] DNS validation and connection are bound by address pinning on every redirect hop.
- [ ] Google Web Risk unknowns fail closed.
- [ ] Duplicate/replay/retry paths cannot create multiple branches or PRs.
- [ ] Analytics and logs contain stable aggregate facts only.
- [ ] Privacy disclosure and Last updated date are current.
- [ ] Package tests, app tests, repository tests, typecheck, lint, frontmatter, website validation, `git diff --check`, and full production build pass.
- [ ] Desktop/mobile/keyboard acceptance is recorded.
- [ ] Shadow-mode sample passes before automatic mode is enabled.
