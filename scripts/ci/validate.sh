#!/usr/bin/env bash
set -euo pipefail
corepack enable
if [[ -n "${PNPM_STORE_DIR:-}" ]]; then
  pnpm config set --global store-dir "${PNPM_STORE_DIR}"
fi
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
(
  cd apps/web
  node --input-type=module -e 'import { createBuilder } from "@content-collections/core"; const builder = await createBuilder("content-collections.ts"); await builder.build();'
)
pnpm --filter web test
pnpm test:repo
