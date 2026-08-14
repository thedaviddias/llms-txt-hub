#!/usr/bin/env bash
set -euo pipefail
readonly vercel_cli_version="58.11.0"
for name in VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID; do
  [[ -n "${!name:-}" ]] || { echo "${name} is required." >&2; exit 1; }
done
pnpm dlx "vercel@${vercel_cli_version}" pull --yes --environment=production --token="${VERCEL_TOKEN}"
# Sensitive Vercel values are intentionally returned to external builders as
# the literal string "[SENSITIVE]". Use safe build-only values so validation
# succeeds without copying runtime secrets into Gitea.
SUBMISSION_AUTOPUBLISH_MODE=disabled
SUBMISSION_ASSESSMENT_SIGNING_SECRET="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')"
export SUBMISSION_AUTOPUBLISH_MODE SUBMISSION_ASSESSMENT_SIGNING_SECRET
pnpm dlx "vercel@${vercel_cli_version}" build --prod --token="${VERCEL_TOKEN}"
pnpm dlx "vercel@${vercel_cli_version}" deploy --prebuilt --prod --yes --archive=tgz --token="${VERCEL_TOKEN}"
