#!/usr/bin/env bash
set -euo pipefail
corepack enable
if [[ -n "${PNPM_STORE_DIR:-}" ]]; then
  pnpm config set --global store-dir "${PNPM_STORE_DIR}"
fi
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test:repo
