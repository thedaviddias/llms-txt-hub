#!/usr/bin / env tsx
/// <reference types="node" />

const files = process.argv.slice(2);
const MAX_LENGTH = 20;

let hasError = false;

files.forEach(file => {
  const baseName = file.split('/').pop()?.replace('.mdx', '') || '';
  if (baseName.length > MAX_LENGTH) {
    console.error(`❌ ERROR: The file '${file}' exceeds the limit of ${MAX_LENGTH} characters!`);
    hasError = true;
  }
});

if (hasError) {
  process.exit(1);
}
