#!/usr/bin/env tsx

/// <reference types="node" />
import fs from 'node:fs'

const files = process.argv.slice(2)
const MAX_LENGTH = 25

let hasError = false

files.forEach(file => {
  if (!fs.existsSync(file)) {
    return
  }
  const baseName = file.split('/').pop()?.replace('.mdx', '') || ''
  if (baseName.length > MAX_LENGTH) {
    console.log(`❌ ERROR: The file '${file}' exceeds the limit of ${MAX_LENGTH} characters!`)
    hasError = true
  }
})

if (hasError) {
  process.exit(1)
}
