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
# The OpenPanel client ID is public by design (it ships in every page's HTML),
# but the env policy stores it as Sensitive. Re-supply it here: process env
# takes precedence over the pulled env file at build time.
NEXT_PUBLIC_OPENPANEL_CLIENT_ID="e919a51c-01cf-4548-a591-43627320252c"
export SUBMISSION_AUTOPUBLISH_MODE SUBMISSION_ASSESSMENT_SIGNING_SECRET NEXT_PUBLIC_OPENPANEL_CLIENT_ID
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so a
# Sensitive-flagged one ships the literal "[SENSITIVE]" to browsers unless it
# is re-supplied above. Fail fast instead of deploying a broken bundle.
while IFS='=' read -r key _; do
  if [[ -z "${!key:-}" || "${!key}" == "[SENSITIVE]" ]]; then
    echo "${key} is Sensitive-flagged in Vercel and unreadable by external builds. Re-create it as a plain env var or re-supply it in this script." >&2
    exit 1
  fi
done < <(grep -E '^NEXT_PUBLIC_[A-Z0-9_]+="?\[SENSITIVE\]"?$' .vercel/.env.production.local | cut -d= -f1)
pnpm dlx "vercel@${vercel_cli_version}" build --prod --token="${VERCEL_TOKEN}"
pnpm dlx "vercel@${vercel_cli_version}" deploy --prebuilt --prod --yes --archive=tgz --token="${VERCEL_TOKEN}"
