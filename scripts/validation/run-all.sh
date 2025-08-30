#!/bin/bash

# Run all validation checks
# This script is called by lefthook pre-commit

set -e

echo "🔍 Running validation checks..."

# Get all staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$' || true)

if [ -z "$STAGED_FILES" ]; then
  echo "No JavaScript/TypeScript files to validate"
  exit 0
fi

# Run validators
echo "$STAGED_FILES" | xargs pnpm --filter @thedaviddias/validators validate:all

echo "✅ All validation checks passed"