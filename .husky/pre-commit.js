#!/usr/bin/env node
const { execSync } = require('child_process');

const MAX_LENGTH = 20;
const files = execSync('git diff --cached --name-only --diff-filter=ACMR')
  .toString()
  .split('\n')
  .filter(file => file.endsWith('.mdx'));

for (const file of files) {
  const baseName = file.split('/').pop().replace('.mdx', '');
  if (baseName.length > MAX_LENGTH) {
    console.error(`❌ ERROR: The file '${file}' exceeds the limit of ${MAX_LENGTH} characters!`);
    process.exit(1);
  }
}
process.exit(0);
