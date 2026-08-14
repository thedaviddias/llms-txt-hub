#!/usr/bin/env bash
set -euo pipefail
readonly vercel_cli_version="58.11.0"
for name in VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID; do
  [[ -n "${!name:-}" ]] || { echo "${name} is required." >&2; exit 1; }
done
pnpm dlx "vercel@${vercel_cli_version}" pull --yes --environment=production --token="${VERCEL_TOKEN}"
pnpm dlx "vercel@${vercel_cli_version}" build --prod --token="${VERCEL_TOKEN}"
pnpm dlx "vercel@${vercel_cli_version}" deploy --prebuilt --prod --yes --archive=tgz --token="${VERCEL_TOKEN}"
