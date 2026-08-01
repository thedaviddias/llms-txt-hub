# Trusted Automatic Submissions and Social Reciprocity

**Date:** 2026-08-01  
**Status:** Approved for specification review

## Summary

The llms.txt Hub submission flow will ask each eligible submitter to support David on either X or LinkedIn, at their choice, and will automatically publish only submissions that pass a fail-closed trust assessment. Clearly unsafe or disallowed submissions will be rejected. Technically safe but editorially uncertain submissions will continue to require manual review.

The repository remains the canonical source of directory content. Automatic publication continues through a small, auditable MDX pull request and the existing GitHub checks and auto-merge workflow. This preserves CI, rollback, and change history while removing routine human review from high-confidence submissions.

## Context

The current web form creates an MDX branch and pull request with a server-side GitHub token. The repository already has useful intake machinery:

- structural PR classification and managed labels;
- homepage, `llms.txt`, and optional `llms-full.txt` inspection;
- same-site-family, response-format, accessibility, and minimum-length checks;
- suspicious-term detection;
- repository validation, tests, and an auto-merge workflow.

Those controls are not yet sufficient for unattended publication. The public URL validator blocks obvious local and private literals but does not resolve hostnames before fetching, pin validated addresses, or validate each redirect target. The submit server action does not make URL accessibility a blocking decision, and the current moderation rules do not independently check URL reputation or enforce a complete editorial policy.

A catalogue audit on 2026-08-01 found 2,551 source MDX entries. The existing validator reported 28 suspicious descriptions, three duplicate `llms.txt` URLs, and two filename-policy failures. A separate metadata heuristic found casino and betting entries, adult and escort entries, low-value promotional listings, and obvious category mismatches. These findings show editorial dilution; they do not prove that a particular existing site currently distributes malware.

## Goals

1. Grow David's personal audience by asking an eligible submitter to follow either:
   - X: `https://x.com/thedaviddias`
   - LinkedIn: `https://www.linkedin.com/in/thedaviddias/`
2. Reduce routine review work to zero for clearly safe, policy-compliant submissions.
3. Prevent unsafe, deceptive, or clearly low-quality links from being published automatically.
4. Preserve legitimate llms.txt adoption across developer tools, businesses, personal sites, commerce, media, and international sites.
5. Preserve an auditable, reversible publication path through the existing repository and CI controls.

## Non-goals

- Proving through X or LinkedIn APIs that a specific user follows David.
- Requiring both social follows, a GitHub star, a newsletter subscription, or a public social post.
- Replacing the MDX catalogue with a database-backed directory.
- Automatically deleting or reclassifying existing catalogue entries in this work.
- Treating an AI classifier as sufficient evidence for automatic approval.
- Promising that automated checks can make external links risk-free forever.
- Creating paid, sponsored, or featured listing tiers.

## Product Experience

### Submission sequence

1. A signed-in user enters the website URL.
2. The server performs a preflight trust assessment before asking for reciprocal support.
3. If the submission is clearly ineligible, the user receives a safe, actionable rejection and is not asked to follow David.
4. If the submission is eligible to continue, the form presents a **Support the maintainer** step with two choices:
   - **Follow David on X**
   - **Follow David on LinkedIn**
5. The user selects one platform, opens the profile, and confirms **I follow David on this platform**. Existing followers can use the same confirmation.
6. Final submission reruns every server-side trust check. The client-side preflight and confirmation are never trusted as publication evidence.
7. The user sees one of three clear outcomes: published automatically after checks, queued for manual review, or rejected.

The support step is an honest attestation, not a claim of API verification. The implementation must not say that the follow was verified. No X or LinkedIn username is collected.

### Outcome language

- **Automatic lane:** “Your submission passed our checks and will be published automatically after repository validation.”
- **Manual lane:** “Your submission is safe to review, but one or more directory guidelines need a maintainer decision.”
- **Rejected:** State the policy category or fixable technical problem without exposing internal detection details.
- **Temporary inspection failure:** “We could not safely verify this site right now. Nothing was published. Please try again later.”

## Three-lane Trust Policy

### 1. Automatic publication

A submission is eligible only when every required signal is a high-confidence pass:

- authenticated and rate-limit-eligible submitter;
- normalized website and `llms.txt` identifiers are not already present or pending;
- HTTPS website and llms URLs with no credentials, disallowed ports, fragments, local names, IP literals, or private/reserved destinations;
- every DNS answer and redirect hop passes public-network validation;
- redirect count, response time, and response size remain within fixed limits;
- Google Web Risk Lookup API returns a successful no-match result for the website, `llms.txt`, optional `llms-full.txt`, and every redirect destination;
- homepage and `llms.txt` belong to the same registrable site family, including legitimate documentation subdomains;
- homepage responds successfully with HTML;
- `llms.txt` responds successfully, is valid text rather than HTML, has meaningful content, and satisfies the high-confidence format profile;
- optional `llms-full.txt` is either absent or independently valid;
- name and description match the inspected site and are not scraped placeholders, keyword stuffing, or unsupported promotional claims;
- selected category is semantically plausible;
- no disallowed-content or high-risk editorial signals are present;
- all repository validation and required CI checks pass.

Any missing, unavailable, stale, conflicting, or unknown required signal prevents automatic publication.

### 2. Manual review

Manual review is limited to submissions that have passed the security boundary but remain editorially uncertain, such as:

- a legitimate site with ownership, category, or content signals that are too weak for deterministic approval;
- a documentation host whose ownership relationship cannot be established automatically;
- valid but nonstandard llms.txt structure;
- a plausible category mismatch;
- thin, overly promotional, or ambiguous descriptions;
- regulated or reputationally sensitive industries without a clear policy violation;
- disagreement between deterministic checks and an advisory semantic classifier.

These submissions use the existing PR review surface and receive `needs:manual-review`. They are never auto-merged.

### 3. Automatic rejection

Reject without creating a branch or pull request when the evidence establishes:

- malware, phishing, credential theft, impersonation, or dangerous downloads;
- a private, local, reserved, or otherwise unsafe network target;
- a deceptive redirect, unrelated final destination, or cloaked response;
- an unavailable, fake, HTML-only, or unrelated `llms.txt` resource;
- an existing or already-pending normalized website or llms URL;
- adult or escort services;
- gambling affiliate, bonus, or review spam;
- academic cheating or detector-bypass services;
- paid traffic, backlink manipulation, or other search-manipulation services;
- illegal services or clearly deceptive financial, medical, or identity claims;
- repeated abuse, automated spam, or attempts to evade the policy.

The policy should distinguish a prohibited promotional pattern from a legitimate regulated product. Ambiguous regulated businesses go to manual review rather than automatic rejection.

## Assessment Architecture

### Trust assessment module

Create one server-only assessment boundary that accepts normalized submission fields and returns a discriminated result:

- `auto_publish`
- `manual_review`
- `reject`
- `retry_later`

The result includes a stable reason code, private evidence, a public-safe explanation, the policy version, and the assessment timestamp. Publication code consumes this result and cannot recalculate or override policy ad hoc.

The assessment is composed of isolated checks:

1. **Input and identity:** schema, authentication, CSRF, rate limits, and idempotency.
2. **Network safety:** protocol, hostname, DNS, redirect, port, timeout, and size rules.
3. **Reputation:** provider-backed URL and threat status.
4. **Resource validity:** HTTP result, content type, text encoding, and llms.txt shape.
5. **Ownership consistency:** registrable-domain and approved documentation-host relationship.
6. **Editorial policy:** prohibited patterns, description quality, and category plausibility.
7. **Publication readiness:** filename, frontmatter, duplicate, generated-data, and CI compatibility.

Deterministic checks own approval. A semantic or AI classifier may downgrade an apparent pass to manual review, but it may never promote a reject, unknown, or manual result into automatic publication.

### Selected threat provider and contract

Version 1 uses the [Google Web Risk Lookup API](https://cloud.google.com/web-risk/docs/lookup-api), specifically `GET https://webrisk.googleapis.com/v1/uris:search`. The service accepts one URI and multiple threat lists per request. The implementation queries all current generally available Web Risk v1 lists:

- `MALWARE`
- `SOCIAL_ENGINEERING`
- `UNWANTED_SOFTWARE`
- `SOCIAL_ENGINEERING_EXTENDED_COVERAGE`

The adapter contract is:

- `safe`: Google returns a successful response with no matched threat types;
- `unsafe`: Google returns one or more matched threat types;
- `unknown`: authentication errors, quota or rate-limit responses, timeouts, malformed responses, unsupported threat-list responses, or any other non-success result.

`unsafe` produces `reject`. `unknown` produces `retry_later`. A successful empty response means only that the URL was not present on the queried lists at that time; it is not treated as a general endorsement and does not replace the other network, ownership, resource, or editorial checks.

Every submitted URL and every redirect destination receives its own lookup. A no-match result is valid for no more than ten minutes and must be refreshed by the trusted GitHub auto-merge workflow before merge. Threat matches may be cached only until the response's `expireTime`. The application sends the URL but no Hub account identifier to Google.

The integration uses a restricted `GOOGLE_WEB_RISK_API_KEY` in a billing-enabled Google Cloud project. The key must be restricted to the Web Risk API and to the production environments that use it. As of the design date, Google documents 100,000 free Lookup API calls per month; usage and billing alerts are required before enabling automatic publication. The credential is a server secret and must be included in the relevant Turborepo build environment allowlist without being exposed to the client.

### Safe network inspection

All external fetches must use a shared hardened inspector rather than direct route-specific `fetch` calls.

- Resolve A and AAAA records and reject any private, loopback, link-local, multicast, documentation, benchmarking, carrier-grade NAT, or reserved result.
- Validate and constrain every redirect manually.
- Revalidate DNS at each hop and connect only to a validated address where the runtime supports address pinning. If the runtime cannot safely bind the validation and connection, the result cannot enter the automatic lane.
- Restrict protocols to HTTPS for new submissions.
- Apply short connect and total timeouts, small response limits, and a low redirect limit.
- Never forward user cookies, authorization headers, internal headers, or application secrets.
- Keep fetched bytes out of logs and user-facing errors.
- Run reputation checks before retrieving response bodies.

Google Web Risk is accessed behind the narrow adapter above so the rest of the assessment does not depend on provider response shapes. Provider errors, rate limits, timeouts, and unknown classifications yield `retry_later`, not a pass. `GOOGLE_WEB_RISK_API_KEY` and the assessment-signing secret must also be added to `turbo.json` under the relevant `tasks.build.env` configuration.

## Publishing and State Transitions

The preflight server action assigns an opaque submission ID and stores a short-lived record keyed to the authenticated account, normalized website, normalized llms URL, and a hash of the proposed submission fields. Upstash Redis, which already exists in the application, stores this state, pending-domain locks, retry state, and rate limits; the merged MDX file and pull request remain the durable publication record.

```text
draft
  -> preflight_rejected
  -> support_required
support_required
  -> final_assessing
final_assessing
  -> rejected
  -> retry_later
  -> manual_review
  -> auto_publish_pending
auto_publish_pending
  -> publishing
  -> published
  -> publish_failed
```

For `auto_publish`, the publisher creates a focused MDX branch and pull request, attaches a machine-readable assessment summary and policy version, and lets the existing trusted workflow merge it only after required repository checks pass. The pull request is the audit and rollback boundary; it requires no human approval.

For `manual_review`, the publisher creates a PR only after network safety and reputation checks have passed. It includes public-safe reasons and the existing `needs:manual-review` label. Security-unknown submissions do not create a public PR containing an untrusted link.

For `reject`, no GitHub branch or PR is created. For `retry_later`, the user can retry after the stated interval; an implementation may perform bounded background retries, but unbounded job infrastructure is outside this version.

### Trusted auto-merge provenance

Structural eligibility and an `automerge:candidate` label are not sufficient authorization to merge. An automatic PR must carry a signed assessment attestation produced by the web application after the PR number and head commit SHA exist.

The publisher creates the PR without auto-merge authorization, then signs a canonical payload containing:

- repository identity;
- submission ID;
- PR number;
- exact head commit SHA;
- added MDX path and SHA-256 content hash;
- normalized website, llms URL, and optional llms-full URL;
- `auto_publish` decision;
- policy version;
- Web Risk checked-at timestamp;
- attestation issued-at and expiry timestamps.

The signature is an HMAC using `SUBMISSION_ASSESSMENT_SIGNING_SECRET`, shared only by the web application and the trusted base-branch auto-merge workflow. The publisher adds the signed attestation to a marked PR comment or body block and then updates the PR, causing the workflow to rerun. The secret is never available to pull-request code.

The auto-merge workflow checks out only the trusted base branch and must:

1. verify the signature, repository, PR number, expiry, and `auto_publish` decision;
2. confirm the current head SHA, added path, and exact MDX content hash match the signed payload;
3. rerun the full trust assessment from trusted base-branch code, including fresh Google Web Risk lookups;
4. confirm the PR is still structurally eligible and has no `needs:manual-review` label;
5. wait for all required repository checks to pass;
6. merge only if every condition still passes.

A synchronize event, content edit, stale attestation, missing attestation, signature failure, changed URL, provider failure, or downgraded assessment removes auto-merge eligibility. Manually created PRs and manual-review submissions do not receive an `auto_publish` attestation and therefore cannot enter the automatic lane even when their file shape is valid.

### Idempotency across asynchronous publication

The same submission ID spans preflight, support attestation, final assessment, GitHub publication, retries, and completion:

- the support step receives an opaque, signed continuation token tied to the submission ID and field hash;
- final submission atomically transitions that record from `support_required` to `final_assessing` and rejects changed fields or replayed tokens;
- a pending-domain lock prevents a second submission ID from publishing the same normalized website or llms URL;
- before branch creation, the publisher records the deterministic branch name and checks for an existing PR marker containing the submission ID;
- after creation, the record stores the PR number and head SHA before the signed attestation is issued;
- retries reconcile the stored branch and PR instead of creating another one;
- asynchronous completion is reconciled from the signed submission marker and GitHub PR state, with the merged MDX duplicate check as the final durable guard if Redis state has expired.

The state record must live long enough to cover the retry and merge window. Expiration cannot authorize a new publication: normalized catalogue and open-PR duplicate checks still run before any branch is created.

### Decision precedence and representative cases

Security and deterministic validity take precedence over editorial uncertainty:

- Google Web Risk threat match -> `reject`;
- Google Web Risk timeout, quota response, unavailable API, or malformed response -> `retry_later`;
- successful Web Risk empty response -> continue other checks, never approve by itself;
- website or required `llms.txt` returns a stable 404/410 -> `reject` with a fix-and-resubmit message;
- website or required `llms.txt` times out or returns a transient 5xx -> `retry_later`;
- supplied optional `llms-full.txt` is missing, HTML, unrelated, or invalid -> `reject` with instructions to remove or fix that optional URL;
- all security checks pass but ownership, category, or content quality remains ambiguous -> `manual_review`;
- a deterministic prohibited-content match -> `reject` even if every technical and reputation check passes.

## Abuse Controls

- Apply rate limits by authenticated account, source IP hash, and normalized registrable domain.
- Allow only one active submission per normalized website or llms URL.
- Use a submission idempotency key so retries cannot create multiple branches or PRs.
- Increase cooldowns for repeated rejection and record only the minimum abuse metadata needed.
- Keep exact policy rules and reputation evidence server-side to avoid making evasion easier.
- Treat social attestation as product friction and reciprocity, not as a security or trust signal.

## Observability and Success Measures

Use the existing analytics and logging boundaries. Record aggregate events without social usernames or raw fetched content:

- preflight started and outcome;
- support step viewed;
- X or LinkedIn selected;
- profile link opened;
- follow attested;
- final assessment outcome and stable reason category;
- PR created, auto-merged, manually merged, rejected, retry requested, and publish failed;
- assessment duration and reputation-provider availability.

Primary success measures:

- the share of submissions requiring human review;
- maintainer review minutes per accepted listing;
- false-positive and false-negative findings from shadow-mode sampling;
- outbound profile-link clicks and follow attestations by platform;
- changes in David's X and LinkedIn follower counts compared with the pre-launch baseline.

The application can attribute profile-link clicks, not actual follows. Follower growth must be evaluated as an aggregate before/after signal unless a separately approved social OAuth integration is introduced.

Logs use `logger.error` for failures and must not expose raw stack traces or provider responses to users.

## Legal and Privacy

The implementation must document the social-choice analytics, submission assessment data, abuse controls, retention, and any external reputation provider in the appropriate legal documents. If `privacy.mdx` or `cookies.mdx` changes, its **Last updated** date must change with it.

Do not send submitted URLs or account identifiers to an external provider beyond what is necessary for reputation checking. Do not collect X or LinkedIn usernames.

## Testing Strategy

### Unit tests

- URL normalization, registrable-domain comparison, HTTPS-only rules, dangerous ports, credentials, and malformed URLs.
- IPv4, IPv6, mapped-address, DNS-rebinding, mixed public/private DNS, and redirect-chain cases.
- Reputation results: safe, unsafe, unknown, rate-limited, timed out, and unavailable.
- Signed-attestation canonicalization, expiry, tampering, head-SHA binding, content-hash binding, and secret separation.
- HTML masquerading as text, oversized bodies, invalid encoding, too-short content, and nonstandard but reviewable content.
- duplicate and idempotency behavior.
- every editorial-policy reason and automatic/manual/reject precedence.
- semantic classifiers cannot upgrade a decision.
- social platform choice and attestation schema.

### Integration tests

- Complete automatic, manual, rejected, retry-later, and publish-failed flows.
- Server-side final assessment catches changes after a successful client preflight.
- Auto-pass creates exactly one focused PR and never includes generated data edited by the submitter.
- Manual and retry-later cases cannot receive an auto-merge label.
- CI failure prevents merge and produces a safe user-visible status.
- reputation-provider failure never publishes.
- a structurally valid manual or attacker-created PR without a valid attestation never auto-merges.
- changing the PR head, MDX content, URL, decision, policy version, or expiry invalidates the attestation.
- analytics contain platform choice and reason codes without social usernames or fetched bodies.

### Security regression tests

- Redirects to metadata services and private ranges.
- Hostnames that resolve to private or mixed addresses.
- Alternate IP encodings and IPv4-mapped IPv6.
- DNS response changes between validation and connection.
- Credential-bearing URLs, scheme confusion, CRLF, Unicode hostname edge cases, and oversized decompression.
- A safe homepage paired with a malicious or unrelated llms URL.

### End-to-end acceptance

- A known-good fixture follows the support step and reaches an automatically merged PR.
- A safe but editorially ambiguous fixture reaches manual review.
- A known-bad reputation fixture is rejected without a branch or PR.
- A provider outage produces retry-later and no publication.
- keyboard-only and screen-reader users can select X or LinkedIn, open the profile, return, attest, and understand the outcome.

## Rollout

1. **Policy and fixtures:** encode the decision table and build a labelled fixture set from accepted, manual, and rejected examples. Existing catalogue entries are not removed during this phase.
2. **Shadow mode:** assess new submissions without changing current publication decisions. Review at least 100 consecutive submissions or 14 days, whichever is longer, and inspect every proposed auto-pass plus a sample of other outcomes.
3. **Conservative automatic lane:** enable auto-publication only for the strict high-confidence pass. Keep a kill switch that returns all otherwise eligible submissions to manual review.
4. **Tune from evidence:** expand automatic coverage only by changing a versioned policy rule with regression fixtures. Never relax fail-closed network or reputation requirements to improve throughput.
5. **Separate legacy audit:** after the new intake is stable, decide whether to scan and clean the existing 2,551-entry catalogue as its own project.

## Acceptance Criteria

- Submitters who pass preflight must choose either X or LinkedIn and attest that they follow David before final submission.
- The product never claims a social follow was technically verified.
- Required safety signals are all high-confidence passes before automatic publication.
- Unknown or unavailable security signals never publish and never create a public PR containing an untrusted URL.
- Clear policy violations create neither a branch nor a pull request.
- Editorially uncertain but security-cleared submissions remain manually reviewable.
- Automatic submissions still pass existing repository validation and CI before merge.
- Auto-merge requires a valid, unexpired, exact-head signed `auto_publish` attestation and a fresh trusted-workflow reassessment.
- Manual, attacker-created, changed, or stale PRs cannot enter the automatic lane through labels or structural eligibility alone.
- Automatic publication is idempotent and creates exactly one durable catalogue entry.
- The final assessment is server-side and cannot be bypassed by client state.
- Analytics can show X versus LinkedIn selection and publication outcomes without collecting social usernames.
- Legal documents and Turborepo environment configuration are updated when their respective content or dependencies change.
