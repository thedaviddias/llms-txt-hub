# Trusted assessment of direct GitHub submissions

The trusted `Auto-merge MDX Entry PRs` workflow enables `--assess-direct` in its
validation step. This permits a direct GitHub submission to receive an in-memory
assessment signature after the same full submission policy used by the web form
passes. The workflow checks out `main`, reads contributor content as bounded data
from its immutable head, and never executes the contributor's code with secrets.

Candidate parsing, signature verification, and both duplicate readers share a
100,000-byte-bounded data-only YAML parser using `js-yaml`'s `JSON_SCHEMA`.
Opening and closing frontmatter fences must be exact `---` lines, with LF or
CRLF line endings. Language selectors such as `---javascript` and `---js`,
JavaScript YAML tags, and malformed/missing fences are rejected without invoking
an executable parser. The Markdown body remains unchanged for canonicality and
exact-byte signature checks.

## Eligibility and provenance

Direct assessment requires all of these conditions before making outbound
assessment requests:

- The immutable manifest contains exactly one added website MDX file and passes
  the existing structural classification; the PR is open, ready, and mergeable.
- The PR body has neither an `llms-hub-submission` nor an `llms-hub-assessment`
  marker, including malformed markers. Bodies larger than 100,000 characters are
  also excluded.
- No `needs:manual-review` label is present. Unavailable label state is a veto.
- The trusted `PR Review` workflow has succeeded for the exact PR, head, and base.
- The checked-out trusted base matches both the current `main` and the PR base.
- `SUBMISSION_ASSESSMENT_SIGNING_SECRET` is available and valid.
- The MDX body is empty or follows the shared canonical submission body format.
  Unrecognized body content and executable MDX require maintainer review.

Only a strict `auto_publish` / `passed` assessment with the current policy and
fresh safe Web Risk evidence for the homepage, llms.txt, and optional llms-full.txt
can be signed. Provider failures, incomplete or stale evidence, retry results,
and manual outcomes cannot authorize publication.

The signature uses the existing HMAC format and secret. It binds repository,
PR number, exact head, MDX path and byte hash, normalized URLs, policy, decision,
and timestamps. Its lifetime ends no later than the oldest provider check's
freshness window. It is never written into the PR body, comments, labels, JSON
reports, or a local file.

Existing web-signed submissions keep their existing verification and reassessment
path. A missing, invalid, forged, or expired web attestation never falls back to
direct signing. Manual and shadow web submissions remain excluded by their
submission marker and manual review veto. Existing manual review labels are
preserved; upgrading this workflow does not remove those labels from older PRs.

## Final merge authorization

Both lanes still require complete duplicate checks against the trusted base and
open PRs. A label or command flag cannot authorize a merge by itself.

Immediately before merging, automation refreshes the current base, exact-head
trusted review, immutable manifest, and open-PR duplicates. It then reads the
latest mutable PR once. Direct submissions must still have the original PR body
byte-for-byte, the same head repository, head SHA and base, no web provenance
markers, no manual veto, and an open, ready, mergeable state. The in-memory
signature is verified again against the exact MDX bytes, and the original fresh
assessment must still be within its allowed lifetime. Any changed or unavailable
gate skips the merge. The merge request includes the expected head SHA.

## Read-only verification

The local CLI does not enable direct assessment by default. To inspect the opted-in
path from a trusted checkout with the required existing credentials and
`TRUSTED_BASE_SHA` configured:

```sh
pnpm review:dry-run -- --assess-direct --pr 123 --json
```

Dry-run may call GitHub read APIs, read the local trusted base, and perform the
outbound assessment. It computes label and merge plans without creating labels,
editing PRs, posting comments, or merging. The ephemeral signature is discarded
when the process exits.

Missing or pending trusted CI and a moved/unavailable base remain waiting
conditions. Missing signing credentials, noncanonical content, web provenance
without a valid signature, failed policy/provider checks, and unconfirmed
uniqueness remain fail-closed. Consult `guidelineReasons` alongside the merge
reason to distinguish missing prerequisites from policy rejection. A transient
failure can leave `needs:manual-review`; rerunning does not remove that veto.

Run the regression suite with `pnpm test:repo`. It includes exact-byte signature
binding, marker fallback rejection, freshness/provider gates, mutable final-read
checks, and a CLI dry-run test using the real assessment policy with recorded
read-only GitHub commands and simulated network evidence.

This runbook extends the direct-GitHub intake behavior described in the original
[trusted submission design](../superpowers/specs/2026-08-01-trusted-automatic-submissions-design.md).
The web publisher's signature ownership and manual/shadow behavior remain as
specified there.
