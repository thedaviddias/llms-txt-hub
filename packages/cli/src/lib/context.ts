import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readLockfile } from './lockfile.js'
import * as logger from './logger.js'

const START_MARKER = '<!-- llmstxt:start -->'
const END_MARKER = '<!-- llmstxt:end -->'

/**
 * Rebuild the managed section in CLAUDE.md from the current lockfile.
 * Creates CLAUDE.md if it doesn't exist.
 */
export function syncClaudeMd(projectDir: string): void {
  try {
    const lockfile = readLockfile(projectDir)
    const entries = Object.values(lockfile.entries)

    const claudeMdPath = join(projectDir, 'CLAUDE.md')
    let content = ''

    if (existsSync(claudeMdPath)) {
      content = readFileSync(claudeMdPath, 'utf-8')
    }

    // Build the managed section
    const section = buildSection(entries)

    if (content.includes(START_MARKER)) {
      // Replace existing section
      const startIdx = content.indexOf(START_MARKER)
      const endIdx = content.indexOf(END_MARKER)
      if (endIdx === -1) {
        logger.warn(
          'CLAUDE.md has a broken llmstxt section (missing end marker). Content after the start marker will be overwritten.'
        )
        content = content.slice(0, startIdx) + section
      } else {
        content = content.slice(0, startIdx) + section + content.slice(endIdx + END_MARKER.length)
      }
    } else if (section) {
      // Append to end
      const separator =
        content.length > 0 && !content.endsWith('\n') ? '\n\n' : content.length > 0 ? '\n' : ''
      content = content + separator + section
    }

    // Clean up: if no entries remain, remove the section entirely
    if (entries.length === 0) {
      content = content
        .replace(
          new RegExp(`\\n?${escapeRegex(START_MARKER)}[\\s\\S]*?${escapeRegex(END_MARKER)}\\n?`),
          ''
        )
        .trim()

      if (content.length === 0 && !existsSync(claudeMdPath)) {
        return // Don't create an empty CLAUDE.md
      }
    }

    if (content.length > 0 || existsSync(claudeMdPath)) {
      writeFileSync(claudeMdPath, content.endsWith('\n') ? content : `${content}\n`, 'utf-8')
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.warn(`Could not update CLAUDE.md: ${msg}`)
  }
}

/**
 * Build the managed llmstxt section content from lockfile entries.
 */
function buildSection(entries: { slug: string; name: string }[]): string {
  if (entries.length === 0) return ''

  const lines = [
    START_MARKER,
    '## Installed Documentation (llmstxt)',
    '',
    'When working with these technologies, read the corresponding skill for detailed reference:',
    ''
  ]

  for (const entry of entries) {
    lines.push(`- ${entry.name}: .agents/skills/${entry.slug}/SKILL.md`)
  }

  lines.push(END_MARKER)

  return lines.join('\n')
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
