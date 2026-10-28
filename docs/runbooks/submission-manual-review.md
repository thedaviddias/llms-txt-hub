# Submission duplicate inspection and manual review

The catalogue duplicate check compares stored URLs without fetching them.
Legacy HTTP URLs compare with their HTTPS equivalents. This does not relax
the HTTPS/public-host policy applied to incoming submissions and network access.
Unavailable or malformed catalogue data still blocks submission.

Open pull request inspection has bounded pagination, file counts, requests, and
duration. If it cannot finish, it returns `review_required`, never `unique`.
Preflight still runs the safety assessment before issuing a continuation.
The final action repeats duplicate and safety checks and forces publisher mode
`disabled` when pending-PR inspection is incomplete. The publisher creates a PR
labelled `needs:manual-review` without an automatic-publication attestation.
The directory entry is not automatically published.

Reviewers must check catalogue and pending PR duplicates before merging these
PRs. Authentication, CSRF, rate limits, publication locks, content/reputation
checks, and deterministic publication recovery remain enforced.

Regression coverage includes the generated catalogue, 235 pending PRs, bounded
inspection failures, and the final action's forced manual mode. A passing build
or empty error log alone does not establish successful submission: verify the
authenticated form result and the resulting PR.
