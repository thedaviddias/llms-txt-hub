#!/usr/bin/env bash
set -euo pipefail
: "${GITHUB_SHA:?GITHUB_SHA is required}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
file="$(mktemp)"
trap 'rm -f "${file}"' EXIT
curl --fail --silent --show-error --retry 3 --header "Authorization: Bearer ${VERCEL_TOKEN}" \
  "https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_ORG_ID}&target=production&limit=10" > "${file}"
sha="$(node -e 'const fs=require("node:fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(d.deployments?.find(x=>x.state==="READY")?.meta?.gitCommitSha??"")' "${file}")"
[[ "${sha}" == "${GITHUB_SHA}" ]] && required=false || required=true
echo "required=${required}" >> "${GITHUB_OUTPUT}"
