import fs from 'node:fs'
import path from 'node:path'
import { type NextRequest, NextResponse } from 'next/server'
import { ensureDebugAccess } from '@/app/api/debug/_utils'

/**
 * Endpoint to check content paths and debug content-collections issues
 */
export async function GET(_request: NextRequest) {
  const access = await ensureDebugAccess(_request)
  if (!access.ok) {
    return access.response
  }

  const paths = {
    cwd: process.cwd(),
    relPath: path.resolve(process.cwd(), '../../packages/content/data'),
    absPath: path.resolve(process.cwd(), '..', 'packages/content/data'),
    exists: {
      relPath: fs.existsSync(path.resolve(process.cwd(), '../../packages/content/data')),
      absPath: fs.existsSync(path.resolve(process.cwd(), '..', 'packages/content/data'))
    },
    contentDirs: {}
  }

  // Check if content directories exist
  try {
    const contentDir = paths.exists.relPath ? paths.relPath : paths.absPath
    const dirs = ['websites', 'guides', 'resources', 'legal']

    type ContentDirInfo = {
      path: string
      exists: boolean
      files: number
    }

    paths.contentDirs = dirs.reduce<Record<string, ContentDirInfo>>((acc, dir) => {
      const dirPath = path.join(contentDir, dir)
      acc[dir] = {
        path: dirPath,
        exists: fs.existsSync(dirPath),
        files: fs.existsSync(dirPath) ? fs.readdirSync(dirPath).length : 0
      }
      return acc
    }, {})
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    return NextResponse.json({
      paths,
      error: errorMessage,
      stack: errorStack
    })
  }

  return NextResponse.json(paths)
}
